'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createAppointment,
  type AppointmentAttendance,
} from '@/features/appointments/api/appointments-api';
import { isBabysitterOnlyProviderKinds } from '@/features/appointments/lib/appointment-address';
import { getConsumerProfile } from '@/features/consumer/api/consumer-api';
import { consumerHubHref } from '@/features/consumer/lib/consumer-hub';
import {
  BOOKING_NEAR_WINDOW_DAY_COUNT,
  filterSlotsToQuickPickHorizon,
  formatSlotRangeLabel,
  generateBookableSlots,
  groupSlotsByDay,
} from '@/features/educadores/lib/bookable-slots';
import { quoteFromProviderRatesForPreview } from '@/features/educadores/lib/quote-from-provider-rates';
import {
  getLocalCustomAlternativeDatetimeInputs,
  isCustomAlternativeRangeValid,
  parseDatetimeLocal,
} from '@/features/educadores/lib/custom-alternative-window';
import { formatMoneyMinor } from '@/features/educator-hub/application/educator-format';
import type {
  ProviderDetailResponse,
  ProviderPublishedOfferRow,
} from '@/features/providers/api/providers-api';
import { ApiError } from '@/shared/lib/api';
import { Button } from '@/shared/components/ui/button';
import { Field, Input, Select, TextArea } from '@/shared/components/ui/field';

export type ProviderBookingViewer = {
  isSignedIn: boolean;
  canBook: boolean;
  isProviderViewer: boolean;
  /** Enlaces “volver” desde la ficha pública (familia → catálogo, educador → panel). */
  catalogBackHref: string;
  catalogBackHomeHref: string;
  catalogBackLabel: string;
};

/** Desde el calendario público del perfil: mismo `id` en peticiones consecutivas fuerza re-aplicar. */
export type SlotPrefillRequest = {
  id: number;
  startsAt: string;
  endsAt: string;
};

type BookingMode = 'published' | 'custom';
type BookingStep = 'details' | 'priceConfirmation';

const CUSTOM_NOTE_MIN = 15;
const PLATFORM_CHARGE_NOTE =
  'Eudify no cobra al enviar la solicitud. Si el educador la confirma, el cargo se realiza con este total estimado; si la rechaza, no hay cobro.';

function unitLabel(unit: string): string {
  if (unit === 'HOUR') return 'por hora';
  if (unit === 'SESSION') return 'por sesión';
  if (unit === 'DAY') return 'por día';
  return unit;
}

function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function toDatetimeLocalValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatSlotSummary(startsLocal: string, endsLocal: string): string | null {
  const a = parseDatetimeLocal(startsLocal);
  const b = parseDatetimeLocal(endsLocal);
  if (!a || !b || b <= a) return null;
  const sameDay = a.toDateString() === b.toDateString();
  const d1 = a.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const t1 = a.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const t2 = b.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (sameDay) {
    return `${d1}, ${t1} – ${t2}`;
  }
  const d2 = b.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `${d1} ${t1} → ${d2} ${t2}`;
}

export function ProviderBookingPanel({
  providerProfileId,
  viewer,
  detail,
  detailLoading,
  detailError,
  slotPrefillRequest,
  onSlotPrefillApplied,
  /** Ofertas desde la ficha pública (p. ej. sin sesión o antes de cargar `/providers/:id`). */
  publishedOffersFallback,
}: {
  providerProfileId: string;
  viewer: ProviderBookingViewer;
  detail: ProviderDetailResponse | null | undefined;
  detailLoading: boolean;
  detailError: boolean;
  slotPrefillRequest?: SlotPrefillRequest | null;
  onSlotPrefillApplied?: () => void;
  publishedOffersFallback?: ProviderPublishedOfferRow[];
}) {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const consumerQuery = useQuery({
    queryKey: ['consumer-profile'],
    queryFn: () => getConsumerProfile(getToken),
    enabled: viewer.canBook,
  });

  const customAltInputs = getLocalCustomAlternativeDatetimeInputs();
  const lastPrefillId = useRef<number | null>(null);

  const [bookingMode, setBookingMode] = useState<BookingMode>('published');
  const [bookingStep, setBookingStep] = useState<BookingStep>('details');
  const [slotLengthMins, setSlotLengthMins] = useState(60);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const [note, setNote] = useState('');
  const [childId, setChildId] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [attendanceChoice, setAttendanceChoice] = useState<
    '' | AppointmentAttendance
  >('');
  const [selectedOfferId, setSelectedOfferId] = useState('');

  const availabilityBlocks = useMemo(
    () => detail?.availabilityBlocks ?? [],
    [detail?.availabilityBlocks],
  );

  const babysitterOnly = useMemo(
    () => (detail ? isBabysitterOnlyProviderKinds(detail.kinds) : false),
    [detail],
  );

  const publishedOffers = useMemo(
    () => detail?.publishedOffers ?? publishedOffersFallback ?? [],
    [detail?.publishedOffers, publishedOffersFallback],
  );

  useEffect(() => {
    const list = detail?.publishedOffers ?? publishedOffersFallback ?? [];
    setSelectedOfferId((prev) =>
      prev && list.some((o) => o.id === prev) ? prev : '',
    );
  }, [detail, publishedOffersFallback]);

  const needsAttendanceChoice =
    Boolean(detail?.serviceMode === 'HYBRID' && !babysitterOnly);

  const showMeetingField =
    detail?.serviceMode === 'ONLINE' ||
    (detail?.serviceMode === 'HYBRID' &&
      !babysitterOnly &&
      attendanceChoice === 'ONLINE');

  const bookableSlots = useMemo(
    () => generateBookableSlots(availabilityBlocks, slotLengthMins),
    [availabilityBlocks, slotLengthMins],
  );

  const quickPickSlots = useMemo(
    () => filterSlotsToQuickPickHorizon(bookableSlots),
    [bookableSlots],
  );

  const slotsByDayQuick = useMemo(
    () => groupSlotsByDay(quickPickSlots),
    [quickPickSlots],
  );

  useEffect(() => {
    lastPrefillId.current = null;
    setBookingMode('published');
    setBookingStep('details');
    setSlotLengthMins(60);
    setSelectedSlotId(null);
    setStartsLocal('');
    setEndsLocal('');
    setNote('');
    setChildId('');
    setMeetingUrl('');
    setAttendanceChoice('');
    setSelectedOfferId('');
  }, [providerProfileId]);

  useEffect(() => {
    if (!viewer.canBook) return;
    const ch = consumerQuery.data?.children;
    if (!ch?.length) return;
    if (ch.length === 1) {
      setChildId(ch[0].id);
    }
  }, [viewer.canBook, consumerQuery.data?.children]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [slotLengthMins]);

  useEffect(() => {
    setSelectedSlotId(null);
    if (bookingMode === 'custom') {
      setStartsLocal('');
      setEndsLocal('');
    }
  }, [bookingMode]);

  useEffect(() => {
    if (!slotPrefillRequest) return;
    if (lastPrefillId.current === slotPrefillRequest.id) return;
    lastPrefillId.current = slotPrefillRequest.id;
    const start = new Date(slotPrefillRequest.startsAt);
    const end = new Date(slotPrefillRequest.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      onSlotPrefillApplied?.();
      return;
    }
    setBookingMode('published');
    setSelectedSlotId(null);
    setStartsLocal(toDatetimeLocalValue(start));
    setEndsLocal(toDatetimeLocalValue(end));
    onSlotPrefillApplied?.();
  }, [slotPrefillRequest, onSlotPrefillApplied]);

  const applySlot = useCallback((slot: { id: string; startsAt: string; endsAt: string }) => {
    const start = new Date(slot.startsAt);
    const end = new Date(slot.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    setSelectedSlotId(slot.id);
    setStartsLocal(toDatetimeLocalValue(start));
    setEndsLocal(toDatetimeLocalValue(end));
  }, []);

  const slotSummary = useMemo(
    () => formatSlotSummary(startsLocal, endsLocal),
    [startsLocal, endsLocal],
  );

  const durationPreviewMins = useMemo(() => {
    const a = parseDatetimeLocal(startsLocal);
    const b = parseDatetimeLocal(endsLocal);
    if (!a || !b || b <= a) return null;
    return Math.round((b.getTime() - a.getTime()) / 60_000);
  }, [startsLocal, endsLocal]);

  const pricePreview = useMemo(() => {
    if (!detail || durationPreviewMins == null) return null;
    const offerId = selectedOfferId.trim();
    const offer =
      offerId && publishedOffers.length > 0
        ? publishedOffers.find((o) => o.id === offerId) ?? null
        : null;
    if (offer) {
      const mismatch = Math.abs(durationPreviewMins - offer.durationMinutes) > 1;
      if (mismatch) {
        return {
          type: 'mismatch' as const,
          offer,
          durationMinutes: durationPreviewMins,
        };
      }
      return {
        type: 'offer' as const,
        offer,
        durationMinutes: offer.durationMinutes,
        priceMinor: offer.priceMinor,
        currency: offer.currency,
      };
    }
    const q = quoteFromProviderRatesForPreview(detail.rates, durationPreviewMins);
    if (!q) {
      return { type: 'none' as const };
    }
    return {
      type: 'rates' as const,
      ...q,
      durationMinutes: durationPreviewMins,
    };
  }, [detail, durationPreviewMins, selectedOfferId, publishedOffers]);

  useEffect(() => {
    setBookingStep('details');
  }, [
    attendanceChoice,
    bookingMode,
    childId,
    endsLocal,
    meetingUrl,
    note,
    providerProfileId,
    selectedOfferId,
    startsLocal,
  ]);

  const createMut = useMutation({
    mutationFn: () => {
      if (!childId.trim()) {
        throw new Error('Elige para qué hijo o hija es la clase.');
      }
      const startsAt = new Date(startsLocal).toISOString();
      const endsAt = new Date(endsLocal).toISOString();
      const alternative = bookingMode === 'custom';
      if (alternative && note.trim().length < CUSTOM_NOTE_MIN) {
        throw new Error(
          `Describe tu propuesta en al menos ${CUSTOM_NOTE_MIN} caracteres.`,
        );
      }
      if (
        alternative &&
        !isCustomAlternativeRangeValid(startsLocal, endsLocal)
      ) {
        throw new Error(
          `Las peticiones con otro horario solo pueden ser dentro de los próximos ${BOOKING_NEAR_WINDOW_DAY_COUNT} días calendario (hasta el ${customAltInputs.lastDayLabel}).`,
        );
      }
      if (!detail) {
        throw new Error('Carga la información del educador antes de reservar.');
      }
      const hybridNeedsPick =
        detail.serviceMode === 'HYBRID' && !babysitterOnly;
      if (
        hybridNeedsPick &&
        attendanceChoice !== 'IN_PERSON' &&
        attendanceChoice !== 'ONLINE'
      ) {
        throw new Error('Elige si la sesión será presencial o en línea.');
      }
      const includeMeeting =
        detail.serviceMode === 'ONLINE' ||
        (detail.serviceMode === 'HYBRID' &&
          !babysitterOnly &&
          attendanceChoice === 'ONLINE');
      return createAppointment(getToken, {
        providerProfileId,
        startsAt,
        endsAt,
        childId: childId.trim(),
        noteFromFamily: note.trim() || undefined,
        requestsAlternativeSchedule: alternative,
        ...(publishedOffers.length > 0 && selectedOfferId.trim()
          ? { providerOfferId: selectedOfferId.trim() }
          : {}),
        ...(hybridNeedsPick &&
          (attendanceChoice === 'IN_PERSON' || attendanceChoice === 'ONLINE')
          ? { attendanceMode: attendanceChoice }
          : {}),
        ...(includeMeeting && meetingUrl.trim()
          ? { meetingUrl: meetingUrl.trim() }
          : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', 'me'] });
      router.push('/dashboard/consumer');
    },
  });

  const bookingError =
    createMut.error instanceof ApiError
      ? createMut.error.message
      : createMut.error instanceof Error
        ? createMut.error.message
        : null;

  const attendanceSectionOk =
    !detail ||
    detail.serviceMode !== 'HYBRID' ||
    babysitterOnly ||
    attendanceChoice === 'IN_PERSON' ||
    attendanceChoice === 'ONLINE';

  const canSubmitPublished =
    bookingMode === 'published' &&
    Boolean(startsLocal && endsLocal && childId.trim()) &&
    availabilityBlocks.length > 0 &&
    attendanceSectionOk &&
    Boolean(pricePreview) &&
    pricePreview!.type !== 'mismatch' &&
    pricePreview!.type !== 'none';

  const canSubmitCustom =
    bookingMode === 'custom' &&
    Boolean(startsLocal && endsLocal && childId.trim()) &&
    note.trim().length >= CUSTOM_NOTE_MIN &&
    isCustomAlternativeRangeValid(startsLocal, endsLocal) &&
    attendanceSectionOk &&
    Boolean(pricePreview) &&
    pricePreview!.type !== 'mismatch' &&
    pricePreview!.type !== 'none';

  const canReviewPrice =
    bookingMode === 'published' ? canSubmitPublished : canSubmitCustom;

  const priceConfirmationSummary = useMemo(() => {
    if (!pricePreview || !slotSummary || durationPreviewMins == null) {
      return null;
    }

    if (pricePreview.type === 'offer') {
      const totalLabel = `${formatMoneyMinor(
        pricePreview.priceMinor,
        pricePreview.currency,
      )} ${pricePreview.currency}`;
      return {
        rateLabel: 'Oferta elegida',
        rateValue: `${pricePreview.offer.title} · ${totalLabel}`,
        estimateBasis: `${formatDurationMinutes(
          pricePreview.durationMinutes,
        )} de duración de la oferta publicada.`,
        totalLabel,
      };
    }

    if (pricePreview.type === 'rates') {
      const rateName = pricePreview.rateLabel?.trim() || 'Servicio';
      const rateAmount = `${formatMoneyMinor(
        pricePreview.rateAmountMinor,
        pricePreview.currency,
      )} ${pricePreview.currency}`;
      const durationLabel = formatDurationMinutes(durationPreviewMins);
      const estimateBasis =
        pricePreview.basis === 'HOUR'
          ? `${durationLabel} × tarifa por hora.`
          : pricePreview.basis === 'SESSION'
            ? 'Tarifa por sesión.'
            : 'Tarifa por día.';
      const totalLabel = `${formatMoneyMinor(
        pricePreview.priceMinor,
        pricePreview.currency,
      )} ${pricePreview.currency}`;
      return {
        rateLabel: 'Tarifa aplicada',
        rateValue: `${rateName} · ${rateAmount} ${unitLabel(pricePreview.basis)}`,
        estimateBasis,
        totalLabel,
      };
    }

    return null;
  }, [durationPreviewMins, pricePreview, slotSummary]);

  if (!viewer.isSignedIn) {
    return (
      <div className="rounded-2xl border border-border bg-linear-to-br from-muted/80 to-card p-5 shadow-sm">
        <h3 className="text-sm font-bold text-foreground">Tarifas (COP) y reservas</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Inicia sesión para ver las tarifas en <strong>COP</strong> de este educador, su
          disponibilidad detallada y solicitar una clase.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (detailLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-border bg-muted/50 p-6">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-4 h-20 rounded-lg bg-muted" />
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/80 p-5 text-sm text-red-800">
        No se pudo cargar tarifas y disponibilidad. Inténtalo de nuevo más tarde.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-bold text-foreground">Tarifas (COP)</h3>
        {detail.rates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Este educador aún no ha publicado tarifas en COP.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {detail.rates.map((r) => (
              <li
                key={r.id}
                className="flex justify-between gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm"
              >
                <span className="text-foreground">
                  {r.label?.trim() || 'Servicio'}{' '}
                  <span className="text-muted-foreground">
                    ({unitLabel(r.unit)})
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-foreground tabular-nums">
                  {formatMoneyMinor(r.amountMinor, r.currency)}{' '}
                  <span className="text-xs font-medium text-muted-foreground">COP</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewer.isProviderViewer ? (
        <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Como educador, gestionas tus citas desde el panel. Las familias
          reservan desde esta ficha.
        </p>
      ) : null}

      {viewer.canBook ? (
        <div className="rounded-2xl border border-accent/35 bg-linear-to-b from-accent-soft/20 to-card p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-foreground">Solicitar una clase</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Elige una franja en los próximos {BOOKING_NEAR_WINDOW_DAY_COUNT} días
            con los botones, o elige una ventana en{' '}
            <span className="font-semibold text-foreground">
              Disponibilidad publicada
            </span>{' '}
            más abajo para rellenar aquí el horario y subir la vista. «Otro
            horario» sirve para proponer un hueco en ese mismo periodo si no
            encaja en lo publicado; el educador lo revisa antes de confirmar.
          </p>

          <div className="mt-4 flex rounded-xl border border-border bg-muted/30 p-1 text-sm font-semibold">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2.5 transition ${bookingMode === 'published'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setBookingMode('published')}
            >
              Disponibilidad publicada
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2.5 transition ${bookingMode === 'custom'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setBookingMode('custom')}
            >
              Otro horario
            </button>
          </div>

          {consumerQuery.data && consumerQuery.data.children.length > 0 ? (
            <div className="mt-5">
              <Field
                label="¿Para quién es la clase?"
                hint="El educador verá este dato en su agenda."
              >
                <Select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  required
                >
                  <option value="">Selecciona hijo/a…</option>
                  {consumerQuery.data.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : consumerQuery.isSuccess ? (
            <p className="mt-5 text-sm text-red-700">
              Añade al menos un hijo o hija en tu perfil para reservar.
            </p>
          ) : null}

          {publishedOffers.length > 0 ? (
            <div className="mt-5">
              <Field
                label="Oferta (opcional)"
                hint="Puedes dejarlo vacío. Si eliges una, el educador verá esa oferta en la cita y en su agenda."
              >
                <Select
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  <option value="">Sin vincular a una oferta concreta</option>
                  {publishedOffers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.durationMinutes} min
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}

          {detail ? (
            <div className="mt-5 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-foreground">
                Detalles de la sesión
              </p>
              {needsAttendanceChoice ? (
                <Field
                  label="¿Cómo será esta sesión?"
                  hint="El educador ofrece presencial y en línea; elige una opción."
                >
                  <Select
                    value={attendanceChoice}
                    onChange={(e) =>
                      setAttendanceChoice(
                        (e.target.value || '') as '' | AppointmentAttendance,
                      )
                    }
                  >
                    <option value="">Selecciona modalidad…</option>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="ONLINE">En línea</option>
                  </Select>
                </Field>
              ) : null}
              {showMeetingField ? (
                <Field
                  label="Enlace Meet / Zoom (opcional)"
                  hint="Puedes dejarlo vacío y acordarlo después por mensaje."
                >
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/…"
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          {bookingMode === 'published' ? (
            <>
              {availabilityBlocks.length === 0 ? (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                  Este educador no tiene franjas futuras publicadas. Puedes
                  usar «Otro horario» para proponer una fecha, o volver más tarde.
                </div>
              ) : (
                <>
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-foreground">
                      Duración de la sesión
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Solo los próximos {BOOKING_NEAR_WINDOW_DAY_COUNT} días;
                      huecos que caben completos en lo publicado.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[30, 45, 60, 90].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSlotLengthMins(m)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${slotLengthMins === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                          {m === 60 ? '1 h' : m === 90 ? '1 h 30' : `${m} min`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bookableSlots.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No hay huecos con esta duración dentro de las ventanas
                      publicadas. Prueba otra duración o usa «Otro horario».
                    </p>
                  ) : quickPickSlots.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No hay huecos en los próximos {BOOKING_NEAR_WINDOW_DAY_COUNT}{' '}
                      días con esta duración. Prueba otra duración o usa «Otro
                      horario» si aplica.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Próximos {BOOKING_NEAR_WINDOW_DAY_COUNT} días — toca una
                        franja
                      </p>
                      {slotsByDayQuick.map(({ dayKey, dayTitle, slots }) => (
                        <section key={dayKey}>
                          <h4 className="mb-2 text-sm font-semibold capitalize text-foreground">
                            {dayTitle}
                          </h4>
                          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                            {slots.map((slot) => {
                              const active = selectedSlotId === slot.id;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => applySlot(slot)}
                                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${active
                                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-sm'
                                    : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/60'
                                    }`}
                                >
                                  {formatSlotRangeLabel(
                                    slot.startsAt,
                                    slot.endsAt,
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="mt-5 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground">
                Solo los mismos {BOOKING_NEAR_WINDOW_DAY_COUNT} días que la lista
                rápida (hasta el {customAltInputs.lastDayLabel}). El educador
                revisará la propuesta antes de confirmar.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Inicio propuesto">
                  <Input
                    type="datetime-local"
                    min={customAltInputs.minInput}
                    max={customAltInputs.maxInput}
                    value={startsLocal}
                    onChange={(e) => {
                      setStartsLocal(e.target.value);
                      setSelectedSlotId(null);
                    }}
                  />
                </Field>
                <Field label="Fin propuesto">
                  <Input
                    type="datetime-local"
                    min={customAltInputs.minInput}
                    max={customAltInputs.maxInput}
                    value={endsLocal}
                    onChange={(e) => {
                      setEndsLocal(e.target.value);
                      setSelectedSlotId(null);
                    }}
                  />
                </Field>
              </div>
              <Field
                label={`Mensaje para el educador (mín. ${CUSTOM_NOTE_MIN} caracteres)`}
                hint="Explica el motivo, flexibilidad u otras opciones de horario."
              >
                <TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="min-h-[100px]"
                />
              </Field>
              {note.trim().length > 0 && note.trim().length < CUSTOM_NOTE_MIN ? (
                <p className="text-xs text-amber-800">
                  Faltan {CUSTOM_NOTE_MIN - note.trim().length} caracteres para
                  poder enviar.
                </p>
              ) : null}
            </div>
          )}

          {slotSummary ? (
            <div className="mt-5 rounded-xl border border-primary/20 bg-muted/60 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                {bookingMode === 'custom'
                  ? 'Horario propuesto'
                  : 'Horario elegido'}
              </p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-foreground">
                {slotSummary}
              </p>
            </div>
          ) : null}

          {bookingMode === 'published' ? (
            <div className="mt-4">
              <Field
                label="Nota para el educador (opcional)"
                hint="Alergias, nivel, materiales…"
              >
                <TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          ) : null}

          {bookingError ? (
            <p className="mt-3 text-sm text-red-700">{bookingError}</p>
          ) : null}

          {pricePreview && startsLocal && endsLocal ? (
            <div className="mt-4 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
              {pricePreview.type === 'mismatch' ? (
                <p className="text-amber-900">
                  <span className="font-semibold">Duración y oferta no coinciden.</span>{' '}
                  La oferta «{pricePreview.offer.title}» es de{' '}
                  {pricePreview.offer.durationMinutes} min, pero el horario elegido es de{' '}
                  {pricePreview.durationMinutes} min. Cambia la oferta, la duración (en
                  disponibilidad publicada) o el horario.
                </p>
              ) : null}
              {pricePreview.type === 'none' ? (
                <p className="text-amber-900">
                  Este educador no tiene tarifas publicadas para calcular el precio. No se puede
                  enviar la solicitud sin una oferta o tarifas (p. ej. por hora).
                </p>
              ) : null}
              {pricePreview.type === 'offer' ? (
                <p className="text-foreground">
                  <span className="font-semibold text-primary">Total al confirmar (oferta):</span>{' '}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyMinor(pricePreview.priceMinor, pricePreview.currency)}{' '}
                    {pricePreview.currency}
                  </span>
                </p>
              ) : null}
              {pricePreview.type === 'rates' ? (
                <p className="text-foreground">
                  <span className="font-semibold text-primary">
                    Total estimado al confirmar
                    {pricePreview.basis === 'HOUR'
                      ? ` (${pricePreview.durationMinutes} min × tarifa por hora):`
                      : pricePreview.basis === 'SESSION'
                        ? ' (tarifa por sesión):'
                        : ' (tarifa por día):'}
                  </span>{' '}
                  <span className="tabular-nums font-semibold">
                    {formatMoneyMinor(pricePreview.priceMinor, pricePreview.currency)}{' '}
                    {pricePreview.currency}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          {bookingStep === 'priceConfirmation' &&
            priceConfirmationSummary &&
            canReviewPrice ? (
            <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Paso final
              </p>
              <h4 className="mt-1 text-base font-bold text-foreground">
                Confirma el precio antes de enviar
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa el resumen. La solicitud se enviará al educador cuando
                confirmes abajo.
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {priceConfirmationSummary.rateLabel}
                  </dt>
                  <dd className="max-w-[65%] text-right font-semibold text-foreground">
                    {priceConfirmationSummary.rateValue}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Cálculo</dt>
                  <dd className="max-w-[65%] text-right text-foreground">
                    {priceConfirmationSummary.estimateBasis}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-primary/15 pt-3">
                  <dt className="font-semibold text-foreground">
                    Total estimado al confirmar
                  </dt>
                  <dd className="text-right text-lg font-bold tabular-nums text-primary">
                    {priceConfirmationSummary.totalLabel}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl border border-border bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Nota de plataforma:
                </span>{' '}
                {PLATFORM_CHARGE_NOTE}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={createMut.isPending}
                  onClick={() => setBookingStep('details')}
                >
                  Editar solicitud
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full py-3 sm:flex-1"
                  disabled={createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending
                    ? 'Enviando…'
                    : 'Confirmar precio y enviar solicitud'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="mt-5 w-full py-3"
              disabled={
                createMut.isPending ||
                !consumerQuery.data?.children.length ||
                !canReviewPrice
              }
              onClick={() => setBookingStep('priceConfirmation')}
            >
              Revisar precio y confirmar
            </Button>
          )}
        </div>
      ) : viewer.isSignedIn && !viewer.isProviderViewer ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft/20 p-5 text-sm text-foreground">
          <p className="font-semibold">Completa tu perfil de familia</p>
          <p className="mt-1 text-muted-foreground">
            Para solicitar clases necesitamos datos completos y al menos un
            beneficiario.
          </p>
          <Link
            href={consumerHubHref('familia')}
            className="mt-3 inline-block font-semibold text-primary underline"
          >
            Ir a datos de la familia
          </Link>
        </div>
      ) : null}
    </div>
  );
}
