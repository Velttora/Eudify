'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import {
  completeConsumerOnboarding,
  getConsumerProfile,
  patchConsumerProfile,
  postChild,
} from '@/features/consumer/api/consumer-api';
import { FamilyLocationPrivacyNote } from '@/features/consumer/family-location-privacy-note';
import { landingPathAfterBootstrap } from '@/shared/lib/routing';
import { ConsumerPaymentsPanel } from '@/features/payments/components/consumer-payments-panel';
import {
  FormSideNote,
  formFieldsGridClass,
  formFieldsGridSpanFull,
  formFieldsRowClass,
  FriendlyFormShell,
} from '@/shared/components/friendly-form-shell';
import { Button } from '@/shared/components/ui/button';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { Field, Input, Select } from '@/shared/components/ui/field';
import { apiRequest } from '@/shared/lib/api';
import {
  childFieldSchemas,
  childOnboardingSchema,
  consumerOnboardingFieldSchemas,
  consumerProfileStepSchema,
  fieldErrorsFromIssues,
  firstValidationError,
} from '@/features/onboarding/lib/onboarding-validation';

type ChildRow = {
  clientKey: string;
  id?: string;
  firstName: string;
  birthDate: string;
  interests: string;
  notes: string;
};

type ConsumerField = keyof typeof consumerOnboardingFieldSchemas;
type ChildField = keyof typeof childFieldSchemas;

function newRow(): ChildRow {
  return {
    clientKey: crypto.randomUUID(),
    firstName: '',
    birthDate: '',
    interests: '',
    notes: '',
  };
}

export default function ConsumerOnboardingPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['consumer-profile'],
    queryFn: () => getConsumerProfile(getToken),
  });

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [unitOrBuilding, setUnitOrBuilding] = useState('');
  const [dwellingType, setDwellingType] = useState<'HOUSE' | 'APARTMENT' | ''>('');
  const [relationship, setRelationship] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [children, setChildren] = useState<ChildRow[]>([newRow()]);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ConsumerField, string>>
  >({});
  const [childErrors, setChildErrors] = useState<
    Record<string, Partial<Record<ChildField, string>>>
  >({});

  useEffect(() => {
    setStepError(null);
  }, [step]);

  function profileValues() {
    return {
      fullName,
      phone,
      city,
      streetAddress,
      postalCode,
      unitOrBuilding,
      dwellingType,
      relationship,
      photoUrl,
    };
  }

  function validateField(field: ConsumerField) {
    const value = profileValues()[field];
    const result = consumerOnboardingFieldSchemas[field].safeParse(value);
    const message = firstValidationError(result);
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
    return !message;
  }

  function validateChildField(row: ChildRow, field: ChildField) {
    const result = childFieldSchemas[field].safeParse(row[field]);
    const message = firstValidationError(result);
    setChildErrors((prev) => ({
      ...prev,
      [row.clientKey]: {
        ...prev[row.clientKey],
        [field]: message ?? undefined,
      },
    }));
    return !message;
  }

  function applyProfileValidation() {
    const result = consumerProfileStepSchema.safeParse(profileValues());
    if (result.success) {
      setFieldErrors({});
      setStepError(null);
      return true;
    }
    setFieldErrors((prev) => ({
      ...prev,
      ...fieldErrorsFromIssues<ConsumerField>(result.error.issues),
    }));
    setStepError(result.error.issues[0]?.message ?? 'Revisa los campos marcados.');
    return false;
  }

  function applyChildrenValidation() {
    const nextErrors: Record<string, Partial<Record<ChildField, string>>> = {};
    let firstError: string | null = null;

    for (const row of children) {
      const result = childOnboardingSchema.safeParse(row);
      if (result.success) continue;
      nextErrors[row.clientKey] = fieldErrorsFromIssues<ChildField>(
        result.error.issues,
      );
      firstError ??= result.error.issues[0]?.message ?? 'Revisa los campos marcados.';
    }

    setChildErrors(nextErrors);
    setStepError(firstError);
    return firstError == null;
  }

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setFullName(p.fullName ?? '');
    setPhone(p.phone ?? '');
    setCity(p.city ?? '');
    setStreetAddress(p.streetAddress ?? '');
    setPostalCode(p.postalCode ?? '');
    setUnitOrBuilding(p.unitOrBuilding ?? '');
    setDwellingType(p.dwellingType ?? '');
    setRelationship(p.relationshipToChild ?? '');
    setPhotoUrl(p.photoUrl ?? '');
    if (p.children.length) {
      setChildren(
        p.children.map((c) => ({
          clientKey: c.id,
          id: c.id,
          firstName: c.firstName,
          birthDate: c.birthDate.slice(0, 10),
          interests: c.interests ?? '',
          notes: c.notes ?? '',
        })),
      );
    }
  }, [profileQuery.data]);

  const bootstrap = bootstrapQuery.data;

  useEffect(() => {
    if (!bootstrap) return;
    if (bootstrap.needsRoleSelection) {
      router.replace('/role');
      return;
    }
    if (bootstrap.user?.role !== 'CONSUMER') {
      router.replace('/dashboard/provider');
      return;
    }
    if (!bootstrap.needsOnboarding) {
      router.replace(landingPathAfterBootstrap(bootstrap));
    }
  }, [bootstrap, router]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!applyProfileValidation()) {
        throw new Error('Revisa los datos familiares.');
      }
      if (!applyChildrenValidation()) {
        throw new Error('Revisa los datos de los niños.');
      }
      await patchConsumerProfile(getToken, {
        fullName,
        phone,
        city,
        streetAddress,
        postalCode,
        unitOrBuilding,
        dwellingType: dwellingType as 'HOUSE' | 'APARTMENT',
        relationshipToChild: relationship,
        photoUrl: photoUrl.trim() || undefined,
      });

      for (const row of children) {
        if (!row.id) {
          await postChild(getToken, {
            firstName: row.firstName.trim(),
            birthDate: row.birthDate,
            interests: row.interests.trim() || undefined,
            notes: row.notes.trim() || undefined,
          });
        }
      }

      await completeConsumerOnboarding(getToken);
      return fetchBootstrap(getToken);
    },
    onSuccess: async (b) => {
      qc.setQueryData(bootstrapQueryKey, b);
      await qc.invalidateQueries({ queryKey: ['consumer-profile'] });
      router.replace(landingPathAfterBootstrap(b));
    },
  });

  const removeChild = useMutation({
    mutationFn: async (row: ChildRow) => {
      if (row.id) {
        await apiRequest(`/consumer-profiles/me/children/${row.id}`, {
          method: 'DELETE',
          getToken,
        });
      }
      return row.clientKey;
    },
    onSuccess: (clientKey) => {
      setChildren((prev) => prev.filter((r) => r.clientKey !== clientKey));
    },
  });

  const busy = useMemo(
    () =>
      submit.isPending ||
      removeChild.isPending ||
      profileQuery.isLoading ||
      bootstrapQuery.isLoading,
    [
      submit.isPending,
      removeChild.isPending,
      profileQuery.isLoading,
      bootstrapQuery.isLoading,
    ],
  );

  function validateProfileStep(): string | null {
    return applyProfileValidation()
      ? null
      : 'Revisa los campos marcados antes de continuar.';
  }

  function validateChildrenStep(): string | null {
    return applyChildrenValidation()
      ? null
      : 'Revisa los campos marcados antes de continuar.';
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
      const err = validateChildrenStep();
      if (err) {
        setStepError(err);
        return;
      }
      setStep(2);
    }
  }

  const stepSubtitle =
    step === 0
      ? 'Paso 1 de 3: tus datos y domicilio para citas presenciales.'
      : step === 1
        ? 'Paso 2 de 3: niños o niñas vinculados a tu cuenta (mínimo uno).'
        : 'Paso 3 de 3: pago opcional. Puedes saltarlo; te lo recordaremos al agendar.';

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
      title="Tu perfil familiar"
      subtitle={stepSubtitle}
      sideNotes={
        <>
          {step === 0 ? <FamilyLocationPrivacyNote /> : null}
          {step === 2 ? (
            <FormSideNote title="Pago opcional">
              Puedes terminar sin tarjeta y configurarlo al reservar.
            </FormSideNote>
          ) : null}
        </>
      }
      steps={[
        { label: 'Tú y domicilio' },
        { label: 'Menores' },
        { label: 'Pago (opc.)' },
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
              {busy ? 'Guardando…' : 'Terminar registro'}
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
            <div className="xl:col-span-2">
              <Field label="Nombre completo" error={fieldErrors.fullName}>
                <Input
                  value={fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  onBlur={() => validateField('fullName')}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Cómo quieres que te llamen"
                />
              </Field>
            </div>
            <Field label="Teléfono (opcional)" error={fieldErrors.phone}>
              <Input
                type="tel"
                value={phone}
                aria-invalid={Boolean(fieldErrors.phone)}
                onBlur={() => validateField('phone')}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57…"
              />
            </Field>
            <Field label="Relación con el menor" error={fieldErrors.relationship}>
              <Input
                value={relationship}
                aria-invalid={Boolean(fieldErrors.relationship)}
                onBlur={() => validateField('relationship')}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Mamá, papá, abuela…"
              />
            </Field>
            <Field label="Ciudad" error={fieldErrors.city}>
              <Input
                value={city}
                aria-invalid={Boolean(fieldErrors.city)}
                onBlur={() => validateField('city')}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Bogotá"
              />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Dirección (calle y número)" error={fieldErrors.streetAddress}>
                <Input
                  value={streetAddress}
                  aria-invalid={Boolean(fieldErrors.streetAddress)}
                  onBlur={() => validateField('streetAddress')}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Para citas en tu domicilio"
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
                placeholder="Torre, interior, conjunto…"
              />
            </Field>
            <Field label="Tipo de vivienda" error={fieldErrors.dwellingType}>
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
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
              </Select>
            </Field>
            <div className={formFieldsGridSpanFull}>
              <Field label="Foto (opcional)">
                <ProfilePhotoInput
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  disabled={busy}
                />
              </Field>
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-foreground">
              Niños o niñas (mínimo uno)
            </h2>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 py-2.5"
              disabled={busy}
              onClick={() => setChildren((c) => [...c, newRow()])}
            >
              + Añadir
            </Button>
          </div>

          <div className="space-y-3">
          {children.map((row, index) => (
            <div
              key={row.clientKey}
              className={`${formFieldsRowClass} rounded-xl border border-border/80 bg-background/40 p-3`}
            >
              <Field label={`Nombre #${index + 1}`} error={childErrors[row.clientKey]?.firstName}>
                <Input
                  value={row.firstName}
                  aria-invalid={Boolean(childErrors[row.clientKey]?.firstName)}
                  onBlur={() => validateChildField(row, 'firstName')}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((r) =>
                        r.clientKey === row.clientKey
                          ? { ...r, firstName: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Nacimiento" error={childErrors[row.clientKey]?.birthDate}>
                <Input
                  type="date"
                  value={row.birthDate}
                  aria-invalid={Boolean(childErrors[row.clientKey]?.birthDate)}
                  onBlur={() => validateChildField(row, 'birthDate')}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((r) =>
                        r.clientKey === row.clientKey
                          ? { ...r, birthDate: e.target.value }
                          : r,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Intereses (opc.)" error={childErrors[row.clientKey]?.interests}>
                <Input
                  value={row.interests}
                  aria-invalid={Boolean(childErrors[row.clientKey]?.interests)}
                  onBlur={() => validateChildField(row, 'interests')}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((r) =>
                        r.clientKey === row.clientKey
                          ? { ...r, interests: e.target.value }
                          : r,
                      ),
                    )
                  }
                  placeholder="Música, deporte…"
                />
              </Field>
              <Field label="Notas (opc.)" error={childErrors[row.clientKey]?.notes}>
                <Input
                  value={row.notes}
                  aria-invalid={Boolean(childErrors[row.clientKey]?.notes)}
                  onBlur={() => validateChildField(row, 'notes')}
                  onChange={(e) =>
                    setChildren((prev) =>
                      prev.map((r) =>
                        r.clientKey === row.clientKey
                          ? { ...r, notes: e.target.value }
                          : r,
                      ),
                    )
                  }
                  placeholder="Alergias, horarios…"
                />
              </Field>
              <div className="flex items-end justify-end sm:col-span-2 xl:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full py-2 text-sm text-red-700 hover:bg-red-50 xl:w-auto"
                  disabled={busy}
                  onClick={() => removeChild.mutate(row)}
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-bold text-foreground">Método de pago (opcional)</h2>
          <ConsumerPaymentsPanel embedded compact />
        </section>
      ) : null}

      {submit.isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {submit.error instanceof Error
            ? submit.error.message
            : 'No se pudo guardar. Revisa la conexión.'}
        </p>
      ) : null}
    </FriendlyFormShell>
  );
}
