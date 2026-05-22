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
import { EmptyState } from '@/shared/components/empty-state';
import { FormModalSheet } from '@/shared/components/form-modal-sheet';
import {
  formFieldsGridClass,
  formFieldsGridSpanFull,
  formFieldsRowClass,
  FormSideNote,
  formWithSideNotesLayoutClass,
} from '@/shared/components/friendly-form-shell';
import { ProfilePhotoInput } from '@/shared/components/profile-photo-input';
import { Button } from '@/shared/components/ui/button';
import { Field, Input, Select, TextArea } from '@/shared/components/ui/field';

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
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [activeSection, setActiveSection] = useState<'family' | 'children'>('family');
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [childDraft, setChildDraft] = useState<ChildRow | null>(null);
  const [childDraftError, setChildDraftError] = useState<string | null>(null);
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
      setChildren([]);
    }
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!dwellingType) {
        throw new Error('Indica si tu domicilio es casa o apartamento.');
      }
      if (children.length === 0) {
        throw new Error('Agrega al menos un niño para continuar.');
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

  function openCreateChildModal() {
    setChildDraft(newRow());
    setChildDraftError(null);
    setChildModalOpen(true);
  }

  function openEditChildModal(row: ChildRow) {
    setChildDraft({ ...row });
    setChildDraftError(null);
    setChildModalOpen(true);
  }

  function closeChildModal() {
    setChildModalOpen(false);
    setChildDraft(null);
    setChildDraftError(null);
  }

  function saveChildDraft() {
    if (!childDraft) return;
    if (!childDraft.firstName.trim() || !childDraft.birthDate) {
      setChildDraftError('Nombre y fecha de nacimiento son obligatorios.');
      return;
    }
    if (!isAtLeastSixMonthsOld(childDraft.birthDate)) {
      setChildDraftError(
        'La fecha no puede ser futura y el niño debe tener al menos 6 meses.',
      );
      return;
    }

    setChildren((prev) => {
      const exists = prev.some((r) => r.clientKey === childDraft.clientKey);
      if (!exists) {
        return [
          ...prev,
          {
            ...childDraft,
            firstName: childDraft.firstName.trim(),
            interests: childDraft.interests.trim(),
            notes: childDraft.notes.trim(),
          },
        ];
      }
      return prev.map((r) =>
        r.clientKey === childDraft.clientKey
          ? {
              ...childDraft,
              firstName: childDraft.firstName.trim(),
              interests: childDraft.interests.trim(),
              notes: childDraft.notes.trim(),
            }
          : r,
      );
    });
    closeChildModal();
  }

  const sideNotes =
    activeSection === 'family' ? (
      <FamilyLocationPrivacyNote />
    ) : (
      <FormSideNote title="Niños registrados">
        <p>Necesitas al menos un niño para reservar citas.</p>
      </FormSideNote>
    );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h2 className="text-xl font-bold text-primary sm:text-2xl">Familia y datos</h2>

      <div className={formWithSideNotesLayoutClass}>
        <div className="min-w-0 space-y-4">
          <div className="space-y-3 lg:hidden">{sideNotes}</div>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={activeSection === 'family' ? 'primary' : 'secondary'}
            className="w-full"
            onClick={() => setActiveSection('family')}
          >
            Datos familiares
          </Button>
          <Button
            type="button"
            variant={activeSection === 'children' ? 'primary' : 'secondary'}
            className="w-full"
            onClick={() => setActiveSection('children')}
          >
            Niños ({children.length})
          </Button>
        </div>
      </section>

      {activeSection === 'family' ? (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className={formFieldsGridClass}>
            <div className="xl:col-span-2">
              <Field label="Nombre completo">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
          </div>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Relación con el niño/a">
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </Field>
            <div className="lg:col-span-2">
              <Field label="Dirección (calle y número)">
              <Input
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Ej. Carrera 7 #72-41"
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
              placeholder="Torre, portal, piso, conjunto…"
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
          <div className={formFieldsGridSpanFull}>
            <Field label="Foto (opcional)">
              <ProfilePhotoInput
                value={photoUrl}
                onChange={setPhotoUrl}
                disabled={save.isPending}
              />
            </Field>
          </div>
        </div>
      </section>
      ) : null}

      {activeSection === 'children' ? (
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Niños
          </h3>
          <Button
            type="button"
            variant="secondary"
            onClick={openCreateChildModal}
          >
            Añadir
          </Button>
        </div>
        {children.length === 0 ? (
          <EmptyState
            icon="👧"
            title="No hay niños guardados"
            body="Usa el botón Añadir para registrar a cada beneficiario."
            actionLabel="Agregar primer niño"
            onAction={openCreateChildModal}
          />
        ) : null}
        <div className="space-y-2">
        {children.map((row) => (
          <div
            key={row.clientKey}
            className={`${formFieldsRowClass} rounded-xl border border-border/80 bg-background/50 p-3`}
          >
            <div className="min-w-0 xl:col-span-2">
              <p className="text-sm font-semibold text-foreground">{row.firstName}</p>
              <p className="text-xs text-muted-foreground">
                {row.birthDate || 'Sin fecha'}
                {row.interests ? ` · ${row.interests}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-3 xl:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="px-3 py-2 text-xs"
                onClick={() => openEditChildModal(row)}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2 text-xs text-red-700"
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

      {save.isError && (
        <p className="text-sm text-red-600">
          {save.error instanceof Error ? save.error.message : 'Error al guardar'}
        </p>
      )}
      {save.isSuccess && !save.isPending && (
        <p className="text-sm font-medium text-accent">Cambios guardados.</p>
      )}

      <Button
        className="w-full py-3 sm:w-auto sm:min-w-48"
        disabled={busy}
        onClick={() => save.mutate()}
      >
        Guardar cambios
      </Button>
        </div>

        <aside
          className="sticky top-24 hidden h-fit space-y-3 lg:block"
          role="complementary"
          aria-label="Información del formulario"
        >
          {sideNotes}
        </aside>
      </div>

      {childDraft ? (
        <FormModalSheet
          open={childModalOpen}
          title={childDraft.id ? 'Editar niño' : 'Agregar niño'}
          onClose={closeChildModal}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={closeChildModal}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveChildDraft}>
                Guardar niño
              </Button>
            </>
          }
        >
          <div className={formFieldsGridClass}>
              <Field label="Nombre">
                <Input
                  value={childDraft.firstName}
                  onChange={(e) =>
                    setChildDraft((prev) => (prev ? { ...prev, firstName: e.target.value } : prev))
                  }
                />
              </Field>
              <Field label="Fecha de nacimiento">
                <Input
                  type="date"
                  value={childDraft.birthDate}
                  max={maxBirthDate}
                  onChange={(e) =>
                    setChildDraft((prev) => (prev ? { ...prev, birthDate: e.target.value } : prev))
                  }
                />
              </Field>
              <div className={formFieldsGridSpanFull}>
                <Field label="Intereses (opcional)">
                  <Input
                    value={childDraft.interests}
                    onChange={(e) =>
                      setChildDraft((prev) => (prev ? { ...prev, interests: e.target.value } : prev))
                    }
                    placeholder="Música, lectura, deporte..."
                  />
                </Field>
              </div>
              <div className={formFieldsGridSpanFull}>
                <Field label="Notas (opcional)">
                  <TextArea
                    rows={2}
                    value={childDraft.notes}
                    onChange={(e) =>
                      setChildDraft((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                    }
                    placeholder="Alergias, rutinas o información útil..."
                  />
                </Field>
              </div>
              {childDraftError ? (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {childDraftError}
                </p>
              ) : null}
          </div>
        </FormModalSheet>
      ) : null}
    </div>
  );
}
