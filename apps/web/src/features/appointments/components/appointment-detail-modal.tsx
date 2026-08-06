'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  patchAppointment,
  type AppointmentRow,
} from '@/features/appointments/api/appointments-api';
import {
  appointmentStatusLabelEs,
  appointmentStatusNextStepEs,
  appointmentStatusVariant,
  apptStatusBadgeClass,
} from '@/features/appointments/lib/appointment-status-ui';
import {
  appointmentPaymentRequiredMessage,
  appointmentPaymentRequiredTitle,
  appointmentRequiresPayment,
} from '@/features/appointments/lib/appointment-payment-ui';
import {
  appointmentResolvedAttendance,
  appointmentShowAddress,
  appointmentShowMeetingLink,
  dwellingLabelEs,
  formatAddressForMaps,
  googleMapsSearchUrl,
  wazeSearchUrl,
} from '@/features/appointments/lib/appointment-address';
import { appointmentEligibleForHelp } from '@/features/support/support-eligibility';
import type { ServiceMode } from '@/shared/types/bootstrap';
import { buttonStyles } from '@/shared/components/ui/button';

function formatRange(isoStart: string, isoEnd: string) {
  try {
    const a = new Date(isoStart);
    const b = new Date(isoEnd);
    return `${a.toLocaleString('es', {
      dateStyle: 'full',
      timeStyle: 'short',
    })} – ${b.toLocaleTimeString('es', { timeStyle: 'short' })}`;
  } catch {
    return `${isoStart} – ${isoEnd}`;
  }
}

export type AppointmentViewerRole = 'CONSUMER' | 'PROVIDER';

function CompletedSessionReviewsSection({
  appointment,
  viewerRole,
  counterpartyName,
}: {
  appointment: AppointmentRow;
  viewerRole: AppointmentViewerRole;
  counterpartyName: string;
}) {
  if (appointment.status !== 'COMPLETED') return null;
  const consumerRev = appointment.reviews?.find((r) => r.authorRole === 'CONSUMER');
  const providerRev = appointment.reviews?.find((r) => r.authorRole === 'PROVIDER');

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Valoraciones de la sesión
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        Tras completar la cita, la familia valora al educador y el educador a la familia. Solo las
        partes de esta cita ven estos textos.
      </p>
      {!consumerRev && !providerRev ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Aún no hay valoraciones enviadas para esta cita.
        </p>
      ) : null}
      {consumerRev ? (
        <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {viewerRole === 'CONSUMER'
              ? `Tu valoración a ${counterpartyName}`
              : 'Valoración de la familia sobre la sesión'}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-800">{consumerRev.stars} de 5</p>
          {consumerRev.comment?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
              {consumerRev.comment.trim()}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sin comentario de texto.</p>
          )}
        </div>
      ) : null}
      {providerRev ? (
        <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {viewerRole === 'PROVIDER'
              ? 'Tu valoración a la familia'
              : `Valoración del educador (${counterpartyName})`}
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-800">{providerRev.stars} de 5</p>
          {providerRev.comment?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
              {providerRev.comment.trim()}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Sin comentario de texto.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppointmentDetailModal({
  open,
  onClose,
  appointment,
  viewerRole,
}: {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentRow | null;
  viewerRole: AppointmentViewerRole;
}) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [meetDraft, setMeetDraft] = useState('');
  const [meetSavedMsg, setMeetSavedMsg] = useState<string | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);

  useEffect(() => {
    if (!open || !appointment) return;
    setMeetDraft(appointment.meetingUrl?.trim() ?? '');
    setMeetSavedMsg(null);
  }, [open, appointment?.id, appointment?.meetingUrl]);

  const saveMeetMut = useMutation({
    mutationFn: (meetingUrl: string) => {
      if (!appointment) throw new Error('Sin cita');
      return patchAppointment(getToken, appointment.id, { meetingUrl });
    },
    onSuccess: () => {
      setMeetSavedMsg('Enlace guardado.');
      void qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  if (!open || !appointment) return null;

  const mode = appointment.providerProfile.serviceMode as ServiceMode | null;
  const resolved = appointmentResolvedAttendance({
    providerProfile: appointment.providerProfile,
    attendanceMode: appointment.attendanceMode ?? null,
  });
  const venue = appointment.inPersonVenueHost ?? 'CONSUMER';
  const addressProfile =
    venue === 'PROVIDER'
      ? appointment.providerProfile
      : appointment.consumerProfile;
  const addressLine = formatAddressForMaps({
    streetAddress: addressProfile.streetAddress ?? null,
    postalCode: addressProfile.postalCode ?? null,
    city: addressProfile.city ?? null,
    unitOrBuilding: addressProfile.unitOrBuilding ?? null,
    dwellingType: addressProfile.dwellingType ?? null,
  });
  const mapsQuery = addressLine.trim();
  const counterpartyName =
    viewerRole === 'CONSUMER'
      ? appointment.providerProfile.fullName?.trim() || 'Educador/a'
      : appointment.consumerProfile.fullName?.trim() || 'Familia';
  const statusVariant = appointmentStatusVariant(appointment);
  const statusNextStep = appointmentStatusNextStepEs(appointment, viewerRole);
  const requiresPayment = appointmentRequiresPayment(appointment);

  const helpBase =
    viewerRole === 'CONSUMER'
      ? '/dashboard/consumer/soporte/nuevo'
      : '/dashboard/provider/soporte/nuevo';
  const showHelp = appointmentEligibleForHelp(appointment);

  const showMeet = appointmentShowMeetingLink({
    providerProfile: appointment.providerProfile,
    attendanceMode: appointment.attendanceMode ?? null,
  });
  const showAddress = appointmentShowAddress({
    providerProfile: appointment.providerProfile,
    attendanceMode: appointment.attendanceMode ?? null,
  });
  const canEditMeet =
    showMeet &&
    (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED');
  const savedMeet = appointment.meetingUrl?.trim() || '';
  const meetDirty = meetDraft.trim() !== savedMeet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appt-detail-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div>
            <h2 id="appt-detail-title" className="text-lg font-bold text-foreground">
              Detalle de la cita
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Solo tú y {counterpartyName} veéis esta información en el contexto de esta cita.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm">
          <div>
            <span className={apptStatusBadgeClass(statusVariant)}>
              {appointmentStatusLabelEs(appointment)}
            </span>
            {statusNextStep ? (
              <p className="mt-2 rounded-xl border border-accent/30 bg-accent-soft/20 px-3 py-2 text-xs leading-relaxed text-primary">
                {statusNextStep}
              </p>
            ) : null}
            {requiresPayment ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
                <p className="font-bold">{appointmentPaymentRequiredTitle()}</p>
                <p className="mt-1 text-xs leading-relaxed">
                  {viewerRole === 'CONSUMER'
                    ? appointmentPaymentRequiredMessage(appointment)
                    : 'El pago de esta cita confirmada no se pudo procesar. La familia debe actualizar su método de pago.'}
                </p>
                {viewerRole === 'CONSUMER' ? (
                  <Link
                    href="/dashboard/consumer/pagos"
                    onClick={onClose}
                    className={buttonStyles(
                      'secondary',
                      'mt-3 inline-block border-red-200 px-4 py-2 text-xs text-red-800',
                    )}
                  >
                    Actualizar método de pago
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {appointment.offerTitleSnapshot?.trim() || appointment.providerOffer?.title?.trim() ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Oferta
              </p>
              <p className="mt-1 text-foreground">
                {(appointment.offerTitleSnapshot && appointment.offerTitleSnapshot.trim()) ||
                  appointment.providerOffer?.title}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Horario
            </p>
            <p className="mt-1 text-foreground">{formatRange(appointment.startsAt, appointment.endsAt)}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {viewerRole === 'CONSUMER' ? 'Educador/a' : 'Familia'}
            </p>
            <p className="mt-1 font-medium text-foreground">{counterpartyName}</p>
            {appointment.child ? (
              <p className="mt-0.5 text-muted-foreground">
                Niño/a: <span className="font-medium text-foreground">{appointment.child.firstName}</span>
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Modalidad del servicio
            </p>
            <p className="mt-1 text-foreground">
              {mode === 'ONLINE' && 'En línea'}
              {mode === 'IN_PERSON' && 'Presencial'}
              {mode === 'HYBRID' ? (
                <>
                  Híbrido (ofrece presencial y en línea)
                  {resolved ? (
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Esta cita: {resolved === 'ONLINE' ? 'En línea' : 'Presencial'}
                    </span>
                  ) : null}
                </>
              ) : null}
              {!mode && '—'}
            </p>
          </div>

          {showAddress ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {venue === 'PROVIDER'
                  ? 'Ubicación presencial (espacio del educador/a)'
                  : 'Ubicación presencial (domicilio de la familia)'}
              </p>
              {addressProfile.dwellingType ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tipo:{' '}
                  <span className="font-medium text-foreground">
                    {dwellingLabelEs(addressProfile.dwellingType)}
                  </span>
                </p>
              ) : null}
              {mapsQuery ? (
                <>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground">{addressLine}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={googleMapsSearchUrl(mapsQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles('primary', 'px-3 py-2 text-xs')}
                    >
                      Abrir en Google Maps
                    </a>
                    <a
                      href={wazeSearchUrl(mapsQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonStyles('secondary', 'px-3 py-2 text-xs')}
                    >
                      Abrir en Waze
                    </a>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-amber-800">
                  Falta completar la dirección en el perfil de{' '}
                  {venue === 'PROVIDER' ? 'el educador' : 'la familia'} para poder mostrar mapas.
                </p>
              )}
            </div>
          ) : null}

          {showMeet ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Enlace de la reunión (Meet, Zoom…)
              </p>
              {canEditMeet ? (
                <div className="mt-2 space-y-2">
                  <label className="block">
                    <span className="sr-only">URL de la reunión</span>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://meet.google.com/… o Zoom"
                      value={meetDraft}
                      onChange={(e) => {
                        setMeetDraft(e.target.value);
                        setMeetSavedMsg(null);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={saveMeetMut.isPending || !meetDirty}
                      onClick={() => saveMeetMut.mutate(meetDraft.trim())}
                      className={buttonStyles('primary', 'px-3 py-2 text-xs disabled:opacity-50')}
                    >
                      {saveMeetMut.isPending ? 'Guardando…' : 'Guardar enlace'}
                    </button>
                    {savedMeet ? (
                      <a
                        href={savedMeet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonStyles('secondary', 'px-3 py-2 text-xs')}
                      >
                        Abrir enlace
                      </a>
                    ) : null}
                  </div>
                  {meetSavedMsg ? (
                    <p className="text-xs font-medium text-emerald-700">{meetSavedMsg}</p>
                  ) : null}
                  {saveMeetMut.isError ? (
                    <p className="text-xs text-red-700">
                      {saveMeetMut.error instanceof Error
                        ? saveMeetMut.error.message
                        : 'No se pudo guardar el enlace.'}
                    </p>
                  ) : null}
                  {!savedMeet && !meetDraft.trim() ? (
                    <p className="text-xs text-amber-800">
                      {viewerRole === 'PROVIDER'
                        ? 'Añade el enlace de Meet o Zoom para que la familia pueda conectarse.'
                        : 'Si el educador aún no lo puso, puedes pegar aquí el enlace de la videollamada.'}
                    </p>
                  ) : null}
                </div>
              ) : savedMeet ? (
                <a
                  href={savedMeet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-sm font-semibold text-primary underline underline-offset-2"
                >
                  {savedMeet}
                </a>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No hay enlace de reunión para esta cita.
                </p>
              )}
            </div>
          ) : null}

          {appointment.noteFromFamily?.trim() ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nota de la familia
              </p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 text-foreground">
                {appointment.noteFromFamily.trim()}
              </p>
            </div>
          ) : null}

          <CompletedSessionReviewsSection
            appointment={appointment}
            viewerRole={viewerRole}
            counterpartyName={counterpartyName}
          />

          {showHelp ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ayuda con esta cita
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Si hubo un problema con la sesión o el cobro, abre un ticket vinculado a esta cita.
              </p>
              <Link
                href={`${helpBase}?appointmentId=${encodeURIComponent(appointment.id)}`}
                onClick={onClose}
                className={buttonStyles('secondary', 'mt-3 inline-block px-4 py-2 text-xs')}
              >
                Obtener ayuda
              </Link>
            </div>
          ) : null}

          {appointment.requestsAlternativeSchedule &&
          appointment.status !== 'PENDING' ? (
            <p className="text-xs font-medium text-primary">
              Esta cita se creó desde una propuesta de horario alternativo.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
