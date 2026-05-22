'use client';

import { Field, Input, Select, TextArea } from '@/shared/components/ui/field';
import {
  FormSideNote,
  formFieldsGridClass,
  formFieldsGridSpanFull,
  FriendlyFormShell,
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
import {
  fieldErrorsFromIssues,
  firstValidationError,
  providerLocationStepSchema,
  providerOnboardingFieldSchemas,
  providerOnboardingSchema,
  providerProfessionalStepSchema,
} from '@/features/onboarding/lib/onboarding-validation';
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

type ProviderField = keyof typeof providerOnboardingFieldSchemas;

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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ProviderField, string>>
  >({});

  useEffect(() => {
    setStepError(null);
  }, [step]);

  function providerValues() {
    const kinds: ProviderKind[] = [];
    if (kindTeacher) kinds.push('TEACHER');
    if (kindBabysitter) kinds.push('BABYSITTER');
    return {
      fullName,
      bio,
      years,
      focus,
      serviceMode,
      city,
      streetAddress,
      postalCode,
      unitOrBuilding,
      dwellingType,
      photoUrl,
      availabilitySummary,
      kinds,
    };
  }

  function validateField(field: ProviderField) {
    const value = providerValues()[field];
    const result = providerOnboardingFieldSchemas[field].safeParse(value);
    const message = firstValidationError(result);
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return !message;
  }

  function applyFieldsValidation(
    fields: ProviderField[],
    fallbackMessage = 'Revisa los campos marcados.',
  ) {
    let firstError: string | null = null;
    const nextErrors: Partial<Record<ProviderField, string>> = {};
    const values = providerValues();
    for (const field of fields) {
      const result = providerOnboardingFieldSchemas[field].safeParse(values[field]);
      const message = firstValidationError(result);
      nextErrors[field] = message ?? undefined;
      if (!firstError && message) firstError = message;
    }
    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    setStepError(firstError ?? null);
    return firstError ? fallbackMessage : null;
  }

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
      const validation = providerOnboardingSchema.safeParse(providerValues());
      if (!validation.success) {
        setFieldErrors((prev) => ({
          ...prev,
          ...fieldErrorsFromIssues<ProviderField>(validation.error.issues),
        }));
        throw new Error(
          validation.error.issues[0]?.message ?? 'Revisa los campos marcados.',
        );
      }
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
      const profileErr = validateProfileStep();
      if (profileErr) {
        throw new Error(profileErr);
      }

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
    const validation = providerOnboardingSchema.safeParse(providerValues());
    if (!validation.success) {
      throw new Error(
        validation.error.issues[0]?.message ?? 'Revisa los campos marcados.',
      );
    }

    const focusAreas = focus
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const kinds: ProviderKind[] = [];
    if (kindTeacher) kinds.push('TEACHER');
    if (kindBabysitter) kinds.push('BABYSITTER');
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
      dwellingType: dwellingType as 'HOUSE' | 'APARTMENT',
      photoUrl: photoUrl.trim() || undefined,
      availabilitySummary: availabilitySummary.trim() || undefined,
      kinds,
    };
  }

  const providerProfileStepSchema = providerProfessionalStepSchema.merge(
    providerLocationStepSchema,
  );

  function validateProfileStep(): string | null {
    const result = providerProfileStepSchema.safeParse(providerValues());
    if (result.success) {
      const fields = Object.keys(providerProfileStepSchema.shape) as ProviderField[];
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const field of fields) delete next[field];
        return next;
      });
      setStepError(null);
      return null;
    }
    setFieldErrors((prev) => ({
      ...prev,
      ...fieldErrorsFromIssues<ProviderField>(result.error.issues),
    }));
    setStepError(result.error.issues[0]?.message ?? 'Revisa los campos marcados.');
    return 'Completa tu perfil y ubicación antes de continuar.';
  }

  function goNextStep() {
    if (step === 0) {
      const err = validateProfileStep();
      if (err) {
        setStepError(err);
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
    }
  }

  const stepSubtitle =
    step === 0
      ? 'Paso 1 de 3: perfil, servicios y dirección de facturación.'
      : step === 1
        ? 'Paso 2 de 3: foto y disponibilidad en texto (opcional).'
        : 'Paso 3 de 3: conecta Stripe para cobros automáticos.';

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
      maxWidthClass="max-w-7xl"
      title="Tu perfil profesional"
      subtitle={stepSubtitle}
      sideNotes={
        step < 2 ? (
          <FormSideNote title="Siguiente en el panel">
            <p>Agenda, tarifas y ofertas se configuran después de guardar.</p>
          </FormSideNote>
        ) : (
          <FormSideNote title="Stripe">
            <p>
              Al conectar guardamos tu progreso. Si lo dejas pendiente, retómalo en Panel →
              Pagos.
            </p>
          </FormSideNote>
        )
      }
      steps={[
        { label: 'Perfil y ubicación' },
        { label: 'Foto (opc.)' },
        { label: 'Cobros' },
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
          {step < 2 ? (
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
      {stepError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          {stepError}
        </p>
      ) : null}

      {step === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className={formFieldsGridClass}>
            <div className={formFieldsGridSpanFull}>
              <Field label="Nombre público" error={fieldErrors.fullName}>
                <Input
                  value={fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  onBlur={() => validateField('fullName')}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Años de experiencia" error={fieldErrors.years}>
              <Input
                type="number"
                min={0}
                max={80}
                value={years === '' ? '' : String(years)}
                aria-invalid={Boolean(fieldErrors.years)}
                onBlur={() => validateField('years')}
                onChange={(e) => {
                  const v = e.target.value;
                  setYears(v === '' ? '' : Number(v));
                }}
              />
            </Field>
            <Field label="Ciudad" error={fieldErrors.city}>
              <Input
                value={city}
                aria-invalid={Boolean(fieldErrors.city)}
                onBlur={() => validateField('city')}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Medellín"
              />
            </Field>
            <Field label="Modalidad" error={fieldErrors.serviceMode}>
              <Select
                value={serviceMode}
                aria-invalid={Boolean(fieldErrors.serviceMode)}
                onBlur={() => validateField('serviceMode')}
                onChange={(e) => {
                  setServiceMode(e.target.value as ServiceMode | '');
                  setTimeout(() => validateField('serviceMode'), 0);
                }}
              >
                <option value="">Elige…</option>
                {modes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="lg:col-span-2 xl:col-span-2">
              <Field label="Descripción (bio)" error={fieldErrors.bio}>
                <TextArea
                  value={bio}
                  aria-invalid={Boolean(fieldErrors.bio)}
                  onBlur={() => validateField('bio')}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Experiencia, edades, cómo trabajas…"
                  rows={3}
                />
              </Field>
            </div>
            <div className={formFieldsGridSpanFull}>
              <Field label="Especialidades (separadas por coma)" error={fieldErrors.focus}>
                <Input
                  value={focus}
                  aria-invalid={Boolean(fieldErrors.focus)}
                  onBlur={() => validateField('focus')}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Estimulación, inglés, tareas…"
                />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field label="Dirección (calle y número)" error={fieldErrors.streetAddress}>
                <Input
                  value={streetAddress}
                  aria-invalid={Boolean(fieldErrors.streetAddress)}
                  onBlur={() => validateField('streetAddress')}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Para citas presenciales en tu ubicación"
                />
              </Field>
            </div>
            <Field label="Código postal" error={fieldErrors.postalCode}>
              <Input
                value={postalCode}
                aria-invalid={Boolean(fieldErrors.postalCode)}
                onBlur={() => validateField('postalCode')}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </Field>
            <Field label="Unidad o edificio" error={fieldErrors.unitOrBuilding}>
              <Input
                value={unitOrBuilding}
                aria-invalid={Boolean(fieldErrors.unitOrBuilding)}
                onBlur={() => validateField('unitOrBuilding')}
                onChange={(e) => setUnitOrBuilding(e.target.value)}
                placeholder="Consultorio, piso, torre…"
              />
            </Field>
            <Field label="Tipo de espacio" error={fieldErrors.dwellingType}>
              <Select
                value={dwellingType}
                aria-invalid={Boolean(fieldErrors.dwellingType)}
                onBlur={() => validateField('dwellingType')}
                onChange={(e) => {
                  setDwellingType(e.target.value as 'HOUSE' | 'APARTMENT' | '');
                  setTimeout(() => validateField('dwellingType'), 0);
                }}
              >
                <option value="">Selecciona…</option>
                <option value="HOUSE">Casa / local en casa</option>
                <option value="APARTMENT">Apartamento / edificio / consultorio</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 border-t border-border/70 pt-4">
            <p className="mb-3 text-sm font-bold text-foreground">Servicios (marca uno o dos)</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label
                className={`flex min-h-18 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                  kindTeacher
                    ? 'border-accent bg-accent-soft/20'
                    : 'border-border bg-background hover:border-muted-foreground/40'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded border-border text-accent"
                  checked={kindTeacher}
                  onChange={(e) => {
                    setKindTeacher(e.target.checked);
                    setTimeout(() => validateField('kinds'), 0);
                  }}
                />
                <span className="text-sm font-bold leading-tight text-foreground">
                  Clases / educación
                </span>
              </label>
              <label
                className={`flex min-h-18 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                  kindBabysitter
                    ? 'border-accent bg-accent-soft/20'
                    : 'border-border bg-background hover:border-muted-foreground/40'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded border-border text-accent"
                  checked={kindBabysitter}
                  onChange={(e) => {
                    setKindBabysitter(e.target.checked);
                    setTimeout(() => validateField('kinds'), 0);
                  }}
                />
                <span className="text-sm font-bold leading-tight text-foreground">
                  Cuidado / babysitting
                </span>
              </label>
            </div>
            {fieldErrors.kinds ? (
              <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                {fieldErrors.kinds}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-base font-bold text-foreground">Foto y disponibilidad (texto)</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Referencia breve opcional; el calendario real lo configuras en el panel.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Foto de perfil (opcional)">
              <ProfilePhotoInput
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={submit.isPending}
              />
            </Field>
            <Field
              label="Disponibilidad (texto libre, opcional)"
              error={fieldErrors.availabilitySummary}
            >
              <TextArea
                value={availabilitySummary}
                aria-invalid={Boolean(fieldErrors.availabilitySummary)}
                onBlur={() => validateField('availabilitySummary')}
                onChange={(e) => setAvailabilitySummary(e.target.value)}
                placeholder="Ej. Mañanas lun–vie"
                rows={4}
              />
            </Field>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-foreground">Conecta Stripe para tus cobros</h2>
          <p className="text-sm text-muted-foreground">
            Edify usa Stripe Connect para cobrar a la familia cuando confirmas una reserva y
            enviarte el dinero a tu cuenta.
          </p>
          <div className="rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm font-bold text-foreground">
              Estado de Stripe:{' '}
              {connectStatusQuery.isLoading
                ? 'consultando...'
                : stripeComplete
                  ? 'conectado'
                  : connectStatusQuery.data?.connected
                    ? 'pendiente de completar'
                    : 'sin conectar'}
            </p>
            <ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <li>
                Cuenta conectada:{' '}
                <span className="font-semibold text-foreground">
                  {connectStatusQuery.data?.connected ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Datos enviados:{' '}
                <span className="font-semibold text-foreground">
                  {connectStatusQuery.data?.detailsSubmitted ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Cobros habilitados:{' '}
                <span className="font-semibold text-foreground">
                  {connectStatusQuery.data?.chargesEnabled ? 'Sí' : 'No'}
                </span>
              </li>
              <li>
                Pagos habilitados:{' '}
                <span className="font-semibold text-foreground">
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              Si no puedes terminarlo ahora, puedes continuar y completar Stripe desde Panel → Pagos.
            </p>
          </div>

          {stripeComplete ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              Tu cuenta de cobro está lista para reservas con pago automático.
            </p>
          ) : null}

          <div className="border-t border-border pt-4">
            <h2 className="text-base font-bold text-foreground">Después de guardar</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              <li className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-bold text-foreground">Cobros (Stripe Connect)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stripeComplete
                    ? 'Listo para cobrar automáticamente las reservas confirmadas.'
                    : 'Pendiente: necesario para cobrar automáticamente las reservas.'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {stripeComplete ? 'Ya quedó conectado.' : 'Lo retomas en: Panel → Pagos.'}
                </p>
              </li>
              <li className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-bold text-foreground">Agenda con bloques</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Las familias reservan en las ventanas que publiques en el calendario.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Lo harás en: Panel → Agenda y horarios.
                </p>
              </li>
              <li className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-bold text-foreground">Tarifas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define precios claros para sesiones u ofertas.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Lo harás en: Mi perfil → Tarifas.
                </p>
              </li>
              <li className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-bold text-foreground">Ofertas educativas</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Publica lo que enseñas o cuidas con título y detalle.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Lo harás en: Panel → Ofertas educativas.
                </p>
              </li>
            </ul>
            <p className="text-center text-sm text-muted-foreground">
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
