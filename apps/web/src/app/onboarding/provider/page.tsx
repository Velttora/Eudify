'use client';

import { Field, Input, Select, TextArea } from '@/shared/components/ui/field';
import {
  FriendlyFormShell,
  HelpCallout,
} from '@/shared/components/friendly-form-shell';
import type { ProviderKind, ServiceMode } from '@/shared/types/bootstrap';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import {
  completeProviderOnboarding,
  getProviderProfile,
  patchProviderProfile,
} from '@/features/provider/api/provider-api';
import {
  createProviderOnboardingLink,
  getProviderConnectStatus,
} from '@/features/payments/api/payments-api';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { landingPathAfterBootstrap } from '@/shared/lib/routing';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const modes: { value: ServiceMode; label: string }[] = [
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'ONLINE', label: 'En línea' },
  { value: 'HYBRID', label: 'Presencial y en línea' },
];

export default function ProviderOnboardingPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => getProviderProfile(getToken),
  });

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const bootstrap = bootstrapQuery.data;
  const isProvider = bootstrap?.user?.role === 'PROVIDER';

  const connectStatusQuery = useQuery({
    queryKey: ['payments', 'provider', 'connect-status'],
    queryFn: () => getProviderConnectStatus(getToken),
    enabled: isProvider,
  });

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [years, setYears] = useState<number | ''>('');
  const [focus, setFocus] = useState('');
  const [serviceMode, setServiceMode] = useState<ServiceMode | ''>('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [unitOrBuilding, setUnitOrBuilding] = useState('');
  const [dwellingType, setDwellingType] = useState<'HOUSE' | 'APARTMENT' | ''>('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [availabilitySummary, setAvailabilitySummary] = useState('');
  const [kindTeacher, setKindTeacher] = useState(true);
  const [kindBabysitter, setKindBabysitter] = useState(false);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    setStepError(null);
  }, [step]);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setFullName(p.fullName ?? '');
    setBio(p.bio ?? '');
    setYears(p.yearsOfExperience ?? '');
    setFocus((p.focusAreas ?? []).join(', '));
    setServiceMode(p.serviceMode ?? '');
    setCity(p.city ?? '');
    setStreetAddress(p.streetAddress ?? '');
    setPostalCode(p.postalCode ?? '');
    setUnitOrBuilding(p.unitOrBuilding ?? '');
    setDwellingType(p.dwellingType ?? '');
    setPhotoUrl(p.photoUrl ?? '');
    setAvailabilitySummary(p.availabilitySummary ?? '');
    const kinds = p.kinds ?? [];
    setKindTeacher(kinds.includes('TEACHER'));
    setKindBabysitter(kinds.includes('BABYSITTER'));
  }, [profileQuery.data]);

  useEffect(() => {
    if (!bootstrap) return;
    if (bootstrap.needsRoleSelection) {
      router.replace('/role');
      return;
    }
    if (bootstrap.user?.role !== 'PROVIDER') {
      router.replace('/dashboard/consumer');
      return;
    }
    if (!bootstrap.needsOnboarding) {
      router.replace(landingPathAfterBootstrap(bootstrap));
    }
  }, [bootstrap, router]);

  const submit = useMutation({
    mutationFn: async () => {
      await patchProviderProfile(getToken, buildProviderProfilePayload());
      await completeProviderOnboarding(getToken);
      return fetchBootstrap(getToken);
    },
    onSuccess: async (b) => {
      qc.setQueryData(bootstrapQueryKey, b);
      await qc.invalidateQueries({ queryKey: ['provider-profile'] });
      router.replace(landingPathAfterBootstrap(b));
    },
  });

  const connectStripe = useMutation({
    mutationFn: async () => {
      const professionalError = validateProfessionalStep();
      if (professionalError) throw new Error(professionalError);
      const locationError = validateLocationStep();
      if (locationError) throw new Error(locationError);

      await patchProviderProfile(getToken, buildProviderProfilePayload());
      const origin = window.location.origin;
      return createProviderOnboardingLink(getToken, {
        refreshUrl: `${origin}/onboarding/provider`,
        returnUrl: `${origin}/onboarding/provider`,
      });
    },
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
  });

  const busy = useMemo(
    () =>
      submit.isPending ||
      connectStripe.isPending ||
      profileQuery.isLoading ||
      bootstrapQuery.isLoading,
    [
      submit.isPending,
      connectStripe.isPending,
      profileQuery.isLoading,
      bootstrapQuery.isLoading,
    ],
  );

  const stripeComplete = Boolean(connectStatusQuery.data?.onboardingComplete);

  function buildProviderProfilePayload() {
    const focusAreas = focus
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (years === '' || serviceMode === '') {
      throw new Error(
        'Faltan años de experiencia o la modalidad (presencial / en línea). Revísalo en el paso 1.',
      );
    }
    const kinds: ProviderKind[] = [];
    if (kindTeacher) kinds.push('TEACHER');
    if (kindBabysitter) kinds.push('BABYSITTER');
    if (kinds.length === 0) {
      throw new Error(
        'Marca al menos una casilla: educación o cuidado infantil.',
      );
    }
    if (!streetAddress.trim() || !postalCode.trim() || !unitOrBuilding.trim()) {
      throw new Error(
        'Completa dirección, código postal y unidad o edificio de tu espacio de trabajo.',
      );
    }
    if (!dwellingType) {
      throw new Error('Indica si tu espacio es casa o apartamento / consultorio en edificio.');
    }

    return {
      fullName,
      bio,
      yearsOfExperience: Number(years),
      focusAreas,
      serviceMode: serviceMode as ServiceMode,
      city,
      streetAddress,
      postalCode,
      unitOrBuilding,
      dwellingType,
      photoUrl: photoUrl.trim() || undefined,
      availabilitySummary: availabilitySummary.trim() || undefined,
      kinds,
    };
  }

  function validateProfessionalStep(): string | null {
    if (!fullName.trim()) {
      return 'Indica tu nombre público (paso 1).';
    }
    if (years === '' || serviceMode === '') {
      return 'Faltan años de experiencia o la modalidad (presencial / en línea).';
    }
    const kinds: ProviderKind[] = [];
    if (kindTeacher) kinds.push('TEACHER');
    if (kindBabysitter) kinds.push('BABYSITTER');
    if (kinds.length === 0) {
      return 'Marca al menos una casilla: educación o cuidado infantil.';
    }
    return null;
  }

  function validateLocationStep(): string | null {
    if (!streetAddress.trim() || !postalCode.trim() || !unitOrBuilding.trim()) {
      return 'Completa dirección, código postal y unidad o edificio de tu espacio.';
    }
    if (!dwellingType) {
      return 'Indica si tu espacio es casa o apartamento / consultorio en edificio.';
    }
    return null;
  }

  function goNextStep() {
    if (step === 0) {
      const err = validateProfessionalStep();
      if (err) {
        setStepError(err);
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      const err = validateLocationStep();
      if (err) {
        setStepError(err);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  }

  const stepSubtitle =
    step === 0
      ? 'Paso 1 de 4: quién eres y qué ofreces.'
      : step === 1
        ? 'Paso 2 de 4: dónde atiendes presencialmente (si aplica).'
        : step === 2
          ? 'Paso 3 de 4: foto y texto libre de disponibilidad (el calendario lo harás después en el panel).'
          : 'Paso 4 de 4: conecta Stripe para cobros automáticos y revisa los próximos pasos.';

  if (profileQuery.isError || bootstrapQuery.isError) {
    return (
      <div className="mx-auto max-w-lg p-8 text-base text-red-700">
        No pudimos cargar esta pantalla.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  return (
    <FriendlyFormShell
      maxWidthClass="max-w-3xl"
      title="Tu perfil profesional"
      subtitle={stepSubtitle}
      steps={[
        { label: 'Sobre ti' },
        { label: 'Ubicación' },
        { label: 'Foto y texto' },
        { label: 'Cobros y pasos' },
      ]}
      currentStep={step + 1}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full py-3.5 text-base sm:w-auto"
              disabled={busy}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Atrás
            </Button>
          ) : (
            <span className="hidden sm:block sm:w-24" aria-hidden />
          )}
          {step < 3 ? (
            <Button
              type="button"
              className="w-full py-3.5 text-base sm:ml-auto sm:min-w-44"
              disabled={busy}
              onClick={() => goNextStep()}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full py-3.5 text-base sm:ml-auto sm:min-w-44"
              disabled={busy}
              onClick={() => submit.mutate()}
            >
              {busy ? 'Guardando…' : 'Guardar y entrar al panel'}
            </Button>
          )}
        </div>
      }
    >
      <HelpCallout title="Tip" compact>
        Lenguaje sencillo y frases cortas. El calendario con bloques, tarifas y ofertas lo
        terminas después en el panel.
      </HelpCallout>

      {stepError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          {stepError}
        </p>
      ) : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">Sobre ti</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 lg:col-span-2">
              <Field label="Nombre público">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Descripción (bio)">
                <TextArea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Experiencia, edades, cómo trabajas…"
                  rows={4}
                />
              </Field>
            </div>
            <Field label="Años de experiencia">
              <Input
                type="number"
                min={0}
                max={80}
                value={years === '' ? '' : String(years)}
                onChange={(e) => {
                  const v = e.target.value;
                  setYears(v === '' ? '' : Number(v));
                }}
              />
            </Field>
            <Field label="Ciudad">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Medellín"
              />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Especialidades (separadas por coma)">
                <Input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Estimulación, inglés, tareas…"
                />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field label="Modalidad">
                <Select
                  value={serviceMode}
                  onChange={(e) =>
                    setServiceMode(e.target.value as ServiceMode | '')
                  }
                >
                  <option value="">Elige…</option>
                  {modes.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <h2 className="mb-3 text-base font-bold text-stone-900">
              ¿Qué ofreces? (marca una o dos)
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`flex min-h-18 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                  kindTeacher
                    ? 'border-emerald-600 bg-emerald-50/60'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded border-stone-300 text-emerald-800"
                  checked={kindTeacher}
                  onChange={(e) => setKindTeacher(e.target.checked)}
                />
                <span className="text-sm font-bold leading-tight text-stone-900">
                  Clases / educación
                </span>
              </label>
              <label
                className={`flex min-h-18 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                  kindBabysitter
                    ? 'border-emerald-600 bg-emerald-50/60'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded border-stone-300 text-emerald-800"
                  checked={kindBabysitter}
                  onChange={(e) => setKindBabysitter(e.target.checked)}
                />
                <span className="text-sm font-bold leading-tight text-stone-900">
                  Cuidado / babysitting
                </span>
              </label>
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">Direccion de facturación</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Dirección (calle y número)">
                <Input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Para citas presenciales en tu ubicación"
                />
              </Field>
            </div>
            <Field label="Código postal">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
            <Field label="Unidad o edificio">
              <Input
                value={unitOrBuilding}
                onChange={(e) => setUnitOrBuilding(e.target.value)}
                placeholder="Consultorio, piso, torre…"
              />
            </Field>
            <Field label="Tipo de espacio">
              <Select
                value={dwellingType}
                onChange={(e) =>
                  setDwellingType(e.target.value as 'HOUSE' | 'APARTMENT' | '')
                }
              >
                <option value="">Selecciona…</option>
                <option value="HOUSE">Casa / local en casa</option>
                <option value="APARTMENT">Apartamento / edificio / consultorio</option>
              </Select>
            </Field>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">Foto y disponibilidad (texto)</h2>
          <p className="text-sm text-stone-600">
            En el panel podrás marcar bloques reales en el calendario. Aquí puedes dejar una
            referencia breve (opcional).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Foto de perfil (opcional)"
                hint="Archivo, cámara o enlace público."
              >
                <ProfilePhotoInput
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  disabled={submit.isPending}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Disponibilidad (texto libre, opcional)">
                <TextArea
                  value={availabilitySummary}
                  onChange={(e) => setAvailabilitySummary(e.target.value)}
                  placeholder="Ej. Mañanas lun–vie"
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">Conecta Stripe para tus cobros</h2>
          <p className="text-sm text-stone-600">
            Edify usa Stripe Connect para cobrar a la familia cuando confirmas una reserva y
            enviarte el dinero a tu cuenta.
          </p>
          <HelpCallout title="Importante" compact>
            Antes de enviarte a Stripe guardaremos lo que ya completaste en este formulario.
          </HelpCallout>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <p className="text-sm font-bold text-stone-900">
              Estado de Stripe:{' '}
              {connectStatusQuery.isLoading
                ? 'consultando...'
                : stripeComplete
                  ? 'conectado'
                  : connectStatusQuery.data?.connected
                    ? 'pendiente de completar'
                    : 'sin conectar'}
            </p>
            <ul className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
              <li>
                Cuenta conectada:{' '}
                <span className="font-semibold text-stone-900">
                  {connectStatusQuery.data?.connected ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Datos enviados:{' '}
                <span className="font-semibold text-stone-900">
                  {connectStatusQuery.data?.detailsSubmitted ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Cobros habilitados:{' '}
                <span className="font-semibold text-stone-900">
                  {connectStatusQuery.data?.chargesEnabled ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Pagos habilitados:{' '}
                <span className="font-semibold text-stone-900">
                  {connectStatusQuery.data?.payoutsEnabled ? 'Sí' : 'No'}
                </span>
              </li>
            </ul>
          </div>

          {connectStatusQuery.isError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No pudimos consultar el estado de Stripe ahora. Puedes intentar conectar de todas
              formas o continuar y retomarlo desde Pagos.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              className="w-full py-3 sm:w-auto"
              disabled={busy || stripeComplete}
              onClick={() => connectStripe.mutate()}
            >
              {connectStripe.isPending
                ? 'Redirigiendo a Stripe...'
                : stripeComplete
                  ? 'Stripe conectado'
                  : connectStatusQuery.data?.connected
                    ? 'Continuar conexión con Stripe'
                    : 'Conectar con Stripe'}
            </Button>
            <p className="text-xs leading-relaxed text-stone-500">
              Si no puedes terminarlo ahora, puedes continuar y completar Stripe desde Panel → Pagos.
            </p>
          </div>

          {stripeComplete ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              Tu cuenta de cobro está lista para reservas con pago automático.
            </p>
          ) : null}

          <div className="border-t border-stone-100 pt-4">
            <h2 className="text-base font-bold text-stone-900">Después de guardar</h2>
            <HelpCallout title="Importante" compact>
              Al entrar al panel verás una guía para completar agenda, tarifas y ofertas. Si
              Stripe quedó pendiente, también podrás retomarlo desde Pagos.
            </HelpCallout>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <p className="text-sm font-bold text-stone-900">Cobros (Stripe Connect)</p>
                <p className="mt-1 text-xs text-stone-600">
                  {stripeComplete
                    ? 'Listo para cobrar automáticamente las reservas confirmadas.'
                    : 'Pendiente: necesario para cobrar automáticamente las reservas.'}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {stripeComplete ? 'Ya quedó conectado.' : 'Lo retomas en: Panel → Pagos.'}
                </p>
              </li>
              <li className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <p className="text-sm font-bold text-stone-900">Agenda con bloques</p>
                <p className="mt-1 text-xs text-stone-600">
                  Las familias reservan en las ventanas que publiques en el calendario.
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  Lo harás en: Panel → Agenda y horarios.
                </p>
              </li>
              <li className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <p className="text-sm font-bold text-stone-900">Tarifas</p>
                <p className="mt-1 text-xs text-stone-600">
                  Define precios claros para sesiones u ofertas.
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  Lo harás en: Mi perfil → Tarifas.
                </p>
              </li>
              <li className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <p className="text-sm font-bold text-stone-900">Ofertas educativas</p>
                <p className="mt-1 text-xs text-stone-600">
                  Publica lo que enseñas o cuidas con título y detalle.
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  Lo harás en: Panel → Ofertas educativas.
                </p>
              </li>
            </ul>
            <p className="text-center text-sm text-stone-600">
              ¿Listo? Pulsa «Guardar y entrar al panel» abajo.
            </p>
          </div>
        </section>
      ) : null}

      {submit.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {submit.error instanceof Error
            ? submit.error.message
            : 'No se pudo guardar. Revisa la conexión.'}
        </p>
      ) : null}

      {connectStripe.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {connectStripe.error instanceof Error
            ? connectStripe.error.message
            : 'No se pudo iniciar la conexión con Stripe. Inténtalo de nuevo.'}
        </p>
      ) : null}
    </FriendlyFormShell>
  );
}
