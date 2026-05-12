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
  FriendlyFormShell,
  HelpCallout,
} from '@/shared/components/friendly-form-shell';
import { Button } from '@/shared/components/ui/button';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { Field, Input, Select } from '@/shared/components/ui/field';
import { apiRequest } from '@/shared/lib/api';

type ChildRow = {
  clientKey: string;
  id?: string;
  firstName: string;
  birthDate: string;
  interests: string;
  notes: string;
};

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

  useEffect(() => {
    setStepError(null);
  }, [step]);

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
    if (bootstrap.user.role !== 'CONSUMER') {
      router.replace('/dashboard/provider');
      return;
    }
    if (!bootstrap.needsOnboarding) {
      router.replace(landingPathAfterBootstrap(bootstrap));
    }
  }, [bootstrap, router]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!streetAddress.trim() || !postalCode.trim() || !unitOrBuilding.trim()) {
        throw new Error(
          'Completa dirección, código postal y unidad o edificio (paso «Tú»).',
        );
      }
      if (!dwellingType) {
        throw new Error('Indica si tu domicilio es casa o apartamento.');
      }
      await patchConsumerProfile(getToken, {
        fullName,
        phone,
        city,
        streetAddress,
        postalCode,
        unitOrBuilding,
        dwellingType,
        relationshipToChild: relationship,
        photoUrl: photoUrl.trim() || undefined,
      });

      for (const row of children) {
        if (!row.firstName.trim() || !row.birthDate) {
          throw new Error(
            'Cada niño o niña necesita un nombre y una fecha de nacimiento. Revisa el paso 2.',
          );
        }
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

  function validateTuStep(): string | null {
    if (!streetAddress.trim() || !postalCode.trim() || !unitOrBuilding.trim()) {
      return 'Completa dirección, código postal y unidad o edificio.';
    }
    if (!dwellingType) {
      return 'Indica si tu domicilio es casa o apartamento.';
    }
    return null;
  }

  function validateChildrenStep(): string | null {
    for (const row of children) {
      if (!row.firstName.trim() || !row.birthDate) {
        return 'Cada niño o niña necesita un nombre y una fecha de nacimiento.';
      }
    }
    return null;
  }

  function goNextStep() {
    if (step === 0) {
      const err = validateTuStep();
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
      ? 'Paso 1 de 3: datos tuyos y del domicilio (citas presenciales).'
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
      maxWidthClass="max-w-3xl"
      title="Tu perfil familiar"
      subtitle={stepSubtitle}
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
              className="w-full py-3.5 text-base sm:ml-auto sm:min-w-[11rem]"
              disabled={busy}
              onClick={() => goNextStep()}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full py-3.5 text-base sm:ml-auto sm:min-w-[11rem]"
              disabled={busy}
              onClick={() => submit.mutate()}
            >
              {busy ? 'Guardando…' : 'Terminar registro'}
            </Button>
          )}
        </div>
      }
    >
      <HelpCallout title="Por qué pedimos esto" compact>
        Ayuda a educadores y cuidadores a conocerte. Puedes corregir datos después en Mi
        perfil.
      </HelpCallout>

      {stepError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          {stepError}
        </p>
      ) : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">
            Tú (persona que usa la cuenta)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Nombre completo">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Cómo quieres que te llamen"
                />
              </Field>
            </div>
            <Field label="Teléfono (opcional)">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57…"
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <FamilyLocationPrivacyNote />
            </div>
            <Field label="Ciudad">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Bogotá"
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Dirección (calle y número)">
                <Input
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Para citas en tu domicilio"
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
                placeholder="Torre, interior, conjunto…"
              />
            </Field>
            <Field label="Tipo de vivienda">
              <Select
                value={dwellingType}
                onChange={(e) =>
                  setDwellingType(e.target.value as 'HOUSE' | 'APARTMENT' | '')
                }
              >
                <option value="">Selecciona…</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
              </Select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Relación con el menor">
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Mamá, papá, abuela…"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field
                label="Foto (opcional)"
                hint="Archivo, cámara o enlace público."
              >
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
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-stone-900">
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

          {children.map((row, index) => (
            <div
              key={row.clientKey}
              className="space-y-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-stone-800">#{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="py-2 text-sm text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={() => removeChild.mutate(row)}
                >
                  Quitar
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <Field label="Nombre">
                  <Input
                    value={row.firstName}
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
                <Field label="Nacimiento">
                  <Input
                    type="date"
                    value={row.birthDate}
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
                <div className="sm:col-span-2">
                  <Field label="Intereses (opcional)">
                    <Input
                      value={row.interests}
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
                </div>
                <div className="sm:col-span-2">
                  <Field label="Notas (opcional)">
                    <Input
                      value={row.notes}
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
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-stone-900">Método de pago (opcional)</h2>
          <HelpCallout title="Tip" compact>
            Si aún no quieres enlazar tarjeta, pulsa «Terminar registro». Para reservar citas
            te pediremos un método por defecto más adelante.
          </HelpCallout>
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
