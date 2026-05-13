'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PLATFORM_DEFAULT_CURRENCY } from '@repo/currency';

import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { formatMoneyMinor } from '@/features/educator-hub/application/educator-format';
import {
  createRate,
  deleteRate,
  listMyRates,
} from '@/features/provider-rates/api/provider-rates-api';
import {
  getProviderProfile,
  patchProviderProfile,
} from '@/features/provider/api/provider-api';
import type { RateUnit } from '@/features/providers/api/providers-api';
import type { ProviderKind, ServiceMode } from '@/shared/types/bootstrap';
import { AppHeader } from '@/shared/components/app-header';
import { parseMoneyInputToMajorUnits } from '@/shared/lib/parse-money-input';
import { Button } from '@/shared/components/ui/button';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { Field, Input, Select, TextArea } from '@/shared/components/ui/field';

const modes: { value: ServiceMode; label: string }[] = [
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'ONLINE', label: 'En línea' },
  { value: 'HYBRID', label: 'Híbrido' },
];

export default function ProviderProfilePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const profileQuery = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => getProviderProfile(getToken),
    enabled: bootstrapQuery.data?.user?.role === 'PROVIDER',
  });

  const ratesQuery = useQuery({
    queryKey: ['provider-rates', 'me'],
    queryFn: () => listMyRates(getToken),
    enabled: bootstrapQuery.data?.user?.role === 'PROVIDER',
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
  const [isAvailable, setIsAvailable] = useState(true);

  const [rateLabel, setRateLabel] = useState('');
  const [rateAmount, setRateAmount] = useState('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('HOUR');

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
    setIsAvailable(p.isAvailable);
  }, [profileQuery.data]);

  useEffect(() => {
    const b = bootstrapQuery.data;
    if (!b) return;
    if (b.needsRoleSelection) {
      router.replace('/role');
      return;
    }
    if (b.user?.role !== 'PROVIDER') {
      router.replace('/dashboard/consumer');
      return;
    }
    if (b.needsOnboarding) {
      router.replace('/onboarding/provider');
    }
  }, [bootstrapQuery.data, router]);

  const save = useMutation({
    mutationFn: async () => {
      const focusAreas = focus
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (years === '' || serviceMode === '') {
        throw new Error('Completa años de experiencia y modalidad.');
      }
      const kinds: ProviderKind[] = [];
      if (kindTeacher) kinds.push('TEACHER');
      if (kindBabysitter) kinds.push('BABYSITTER');
      if (kinds.length === 0) {
        throw new Error('Selecciona al menos un tipo: docente o babysitter.');
      }
      if (!dwellingType) {
        throw new Error('Indica el tipo de espacio (casa o apartamento / consultorio).');
      }
      if (!streetAddress.trim() || !postalCode.trim() || !unitOrBuilding.trim()) {
        throw new Error('Completa dirección, código postal y unidad o edificio.');
      }
      return patchProviderProfile(getToken, {
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
        isAvailable,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider-profile'] });
      await qc.invalidateQueries({ queryKey: bootstrapQueryKey });
    },
  });

  const addRate = useMutation({
    mutationFn: async () => {
      const n = parseMoneyInputToMajorUnits(rateAmount);
      if (Number.isNaN(n) || n < 0) {
        throw new Error(
          'Importe en COP no válido. Ejemplos: 45000, 45.000 o 80.000,50 (coma solo para centavos).',
        );
      }
      const amountMinor = Math.round(n * 100);
      return createRate(getToken, {
        label: rateLabel.trim() || undefined,
        amountMinor,
        currency: PLATFORM_DEFAULT_CURRENCY,
        unit: rateUnit,
      });
    },
    onSuccess: async () => {
      setRateLabel('');
      setRateAmount('');
      await qc.invalidateQueries({ queryKey: ['provider-rates', 'me'] });
      await qc.invalidateQueries({ queryKey: ['provider-detail'] });
    },
  });

  const removeRate = useMutation({
    mutationFn: (id: string) => deleteRate(getToken, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['provider-rates', 'me'] });
      await qc.invalidateQueries({ queryKey: ['provider-detail'] });
    },
  });

  const busy = useMemo(
    () =>
      save.isPending || profileQuery.isLoading || bootstrapQuery.isLoading,
    [save.isPending, profileQuery.isLoading, bootstrapQuery.isLoading],
  );

  if (profileQuery.isError || bootstrapQuery.isError) {
    return (
      <div className="p-8 text-sm text-red-600">
        No se pudo cargar el perfil.{' '}
        <Link href="/mi-espacio" className="underline">
          Reintentar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader
        logoHref="/dashboard/provider"
        pageLabel="Mi perfil"
        links={[
          { href: '/dashboard/provider', label: 'Mi panel', emphasized: true },
          { href: '/profile/provider', label: 'Mi perfil' },
        ]}
      />
      <main className="mx-auto max-w-lg space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-semibold">Editar perfil profesional</h1>
          <p className="mt-2 text-sm text-stone-600">
            Mantén tu información al día para generar confianza con las familias.
          </p>
        </div>

        <section id="tarifas" className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <Field label="Nombre completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Bio">
            <TextArea value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
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
          <Field label="Especialidades / enfoque (separadas por coma)">
            <Input value={focus} onChange={(e) => setFocus(e.target.value)} />
          </Field>
          <Field label="Modalidad de servicio">
            <Select
              value={serviceMode}
              onChange={(e) =>
                setServiceMode(e.target.value as ServiceMode | '')
              }
            >
              <option value="">Selecciona…</option>
              {modes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        <Field label="Ciudad">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Dirección (calle y número)">
          <Input
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="Solo se comparte en el detalle de citas contigo"
          />
        </Field>
        <Field label="Código postal">
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </Field>
        <Field label="Unidad o edificio">
          <Input
            value={unitOrBuilding}
            onChange={(e) => setUnitOrBuilding(e.target.value)}
            placeholder="Piso, consultorio, torre…"
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
        <Field
          label="Foto de perfil"
          hint="Sube una imagen, úsala con la cámara o pega un enlace público."
        >
          <ProfilePhotoInput value={photoUrl} onChange={setPhotoUrl} disabled={save.isPending} />
        </Field>
        <Field label="Disponibilidad (texto libre)">
          <TextArea
            value={availabilitySummary}
            onChange={(e) => setAvailabilitySummary(e.target.value)}
          />
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-medium text-stone-700">
            ¿Qué ofreces?
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={kindTeacher}
              onChange={(e) => setKindTeacher(e.target.checked)}
            />
            Docente / educación
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={kindBabysitter}
              onChange={(e) => setKindBabysitter(e.target.checked)}
            />
            Babysitter / cuidado
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
            />
            Aparecer como disponible en el listado público
          </label>
        </div>
        <p className="text-xs text-stone-500">
          Valoración mostrada:{' '}
          {(profileQuery.data?.averageRating ?? 0).toFixed(1)} (
          {profileQuery.data?.ratingCount ?? 0} valoraciones) — calculada desde
          reseñas reales de familias.
        </p>
        </section>

        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Tarifas (COP)</h2>
            <p className="mt-1 text-sm text-stone-600">
              Solo usuarios con sesión ven estos importes en <strong>COP</strong> al abrir tu
              ficha desde el listado.
            </p>
          </div>
          {ratesQuery.isLoading ? (
            <p className="text-sm text-stone-500">Cargando tarifas…</p>
          ) : (
            <ul className="space-y-2">
              {(ratesQuery.data ?? []).length === 0 ? (
                <li className="text-sm text-stone-500">
                  Aún no has añadido tarifas.
                </li>
              ) : null}
              {(ratesQuery.data ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
                >
                  <span>
                    {r.label?.trim() || 'Servicio'} · {r.unit} ·{' '}
                    <span className="tabular-nums">
                      {formatMoneyMinor(r.amountMinor, r.currency)}{' '}
                      <span className="text-stone-500">COP</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-700 underline"
                    disabled={removeRate.isPending}
                    onClick={() => removeRate.mutate(r.id)}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Field label="Concepto (opcional)">
            <Input
              value={rateLabel}
              onChange={(e) => setRateLabel(e.target.value)}
              placeholder="Ej. Clase individual 1h"
            />
          </Field>
          <Field
            label="Importe (COP)"
            hint={
              <>
                Escribe el valor en <strong>pesos</strong>. Puedes usar punto para miles (ej.{' '}
                <strong>45.000</strong>) y coma solo para centavos (ej. <strong>80.000,50</strong>).
              </>
            }
          >
            <Input
              value={rateAmount}
              onChange={(e) => setRateAmount(e.target.value)}
              inputMode="decimal"
              placeholder="Ej. 45000 o 45.000"
            />
          </Field>
          <Field label="Unidad">
            <Select
              value={rateUnit}
              onChange={(e) => setRateUnit(e.target.value as RateUnit)}
            >
              <option value="HOUR">Por hora</option>
              <option value="SESSION">Por sesión</option>
              <option value="DAY">Por día</option>
            </Select>
          </Field>
          <p className="text-xs text-stone-600">
            Todas las tarifas se guardan y muestran en <strong>COP</strong> (peso colombiano).
          </p>
          {addRate.isError ? (
            <p className="text-sm text-red-600">
              {addRate.error instanceof Error
                ? addRate.error.message
                : 'Error al añadir'}
            </p>
          ) : null}
          <Button
            variant="secondary"
            className="w-full"
            disabled={addRate.isPending || !rateAmount.trim()}
            onClick={() => addRate.mutate()}
          >
            Añadir tarifa
          </Button>
        </section>

        {save.isError && (
          <p className="text-sm text-red-600">
            {save.error instanceof Error ? save.error.message : 'Error al guardar'}
          </p>
        )}
        {save.isSuccess && !save.isPending && (
          <p className="text-sm text-emerald-700">Cambios guardados.</p>
        )}

        <Button
          className="w-full py-3"
          disabled={busy}
          onClick={() => save.mutate()}
        >
          Guardar cambios
        </Button>
      </main>
    </div>
  );
}
