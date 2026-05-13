'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import {
  deleteChild,
  getConsumerProfile,
  patchChild,
  patchConsumerProfile,
  postChild,
} from '@/features/consumer/api/consumer-api';
import { FamilyLocationPrivacyNote } from '@/features/consumer/family-location-privacy-note';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { Button } from '@/shared/components/ui/button';
import { Field, Input, Select } from '@/shared/components/ui/field';

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

function buildMinimumBirthDateAllowed(): Date {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - 6);
  return threshold;
}

function isAtLeastSixMonthsOld(birthDateIso: string): boolean {
  const birthDate = new Date(`${birthDateIso}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;
  return birthDate <= buildMinimumBirthDateAllowed();
}

/**
 * Formulario de perfil familiar e hijos. La navegación y gates de bootstrap viven en el hub.
 */
export function ConsumerFamilyForm() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const profileQuery = useQuery({
    queryKey: ['consumer-profile'],
    queryFn: () => getConsumerProfile(getToken),
    enabled: bootstrapQuery.data?.user?.role === 'CONSUMER',
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
  const maxBirthDate = useMemo(
    () => buildMinimumBirthDateAllowed().toISOString().slice(0, 10),
    [],
  );

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
    } else {
      setChildren([newRow()]);
    }
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
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

      const existingServer = profileQuery.data?.children ?? [];
      const currentIds = new Set(
        children.map((c) => c.id).filter(Boolean) as string[],
      );
      for (const prev of existingServer) {
        if (!currentIds.has(prev.id)) {
          await deleteChild(getToken, prev.id);
        }
      }

      for (const row of children) {
        if (!row.firstName.trim() || !row.birthDate) {
          throw new Error('Cada niño necesita nombre y fecha de nacimiento.');
        }
        if (!isAtLeastSixMonthsOld(row.birthDate)) {
          throw new Error(
            'La fecha de nacimiento no puede ser futura y el niño debe tener al menos 6 meses.',
          );
        }
        if (row.id) {
          await patchChild(getToken, row.id, {
            firstName: row.firstName.trim(),
            birthDate: row.birthDate,
            interests: row.interests.trim() || undefined,
            notes: row.notes.trim() || undefined,
          });
        } else {
          await postChild(getToken, {
            firstName: row.firstName.trim(),
            birthDate: row.birthDate,
            interests: row.interests.trim() || undefined,
            notes: row.notes.trim() || undefined,
          });
        }
      }

      return getConsumerProfile(getToken);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['consumer-profile'] });
      await qc.invalidateQueries({ queryKey: bootstrapQueryKey });
    },
  });

  const removeChild = useMutation({
    mutationFn: async (row: ChildRow) => {
      if (row.id) {
        await deleteChild(getToken, row.id);
      }
      return row;
    },
    onSuccess: async (row) => {
      setChildren((prev) => prev.filter((r) => r.clientKey !== row.clientKey));
      if (row.id) {
        await qc.invalidateQueries({ queryKey: ['consumer-profile'] });
        await qc.invalidateQueries({ queryKey: bootstrapQueryKey });
      }
    },
  });

  const busy = useMemo(
    () =>
      save.isPending ||
      removeChild.isPending ||
      profileQuery.isLoading ||
      bootstrapQuery.isLoading,
    [
      save.isPending,
      removeChild.isPending,
      profileQuery.isLoading,
      bootstrapQuery.isLoading,
    ],
  );

  if (profileQuery.isError || bootstrapQuery.isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-red-600">
        No se pudo cargar el perfil.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  if (profileQuery.isLoading || bootstrapQuery.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando datos…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          Familia y datos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Actualiza tus datos y los de tus beneficiarios.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <Field label="Nombre completo">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <FamilyLocationPrivacyNote />
        <Field label="Ciudad">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field
          label="Foto (opcional)"
          hint="Archivo, cámara o enlace. Ayuda a que el educador te reconozca."
        >
          <ProfilePhotoInput
            value={photoUrl}
            onChange={setPhotoUrl}
            disabled={save.isPending}
          />
        </Field>
        <Field label="Dirección (calle y número)">
          <Input
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="Ej. Carrera 7 #72-41"
          />
        </Field>
        <Field label="Código postal">
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </Field>
        <Field
          label="Unidad o edificio"
          hint="Torre, portal, piso, nombre del conjunto…"
        >
          <Input
            value={unitOrBuilding}
            onChange={(e) => setUnitOrBuilding(e.target.value)}
            placeholder="Ej. Torre B, apto 402"
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
        <Field label="Relación con el niño/a">
          <Input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
          />
        </Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Niños
          </h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setChildren((c) => [...c, newRow()])}
          >
            Añadir
          </Button>
        </div>
        {children.map((row) => (
          <div
            key={row.clientKey}
            className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-4"
          >
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-red-700"
                disabled={busy}
                onClick={() => removeChild.mutate(row)}
              >
                Quitar
              </Button>
            </div>
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
            <Field label="Fecha de nacimiento">
              <Input
                type="date"
                value={row.birthDate}
                max={maxBirthDate}
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
              />
            </Field>
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
              />
            </Field>
          </div>
        ))}
      </section>

      {save.isError && (
        <p className="text-sm text-red-600">
          {save.error instanceof Error ? save.error.message : 'Error al guardar'}
        </p>
      )}
      {save.isSuccess && !save.isPending && (
        <p className="text-sm font-medium text-accent">Cambios guardados.</p>
      )}

      <Button
        className="w-full py-3"
        disabled={busy}
        onClick={() => save.mutate()}
      >
        Guardar cambios
      </Button>
    </div>
  );
}
