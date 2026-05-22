'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import {
  listMyAppointments,
  listProviderAppointments,
  type AppointmentRow,
} from '@/features/appointments/api/appointments-api';
import { Button } from '@/shared/components/ui/button';
import { Field, Input, TextArea } from '@/shared/components/ui/field';
import { ApiError } from '@/shared/lib/api';
import {
  createSupportTicket,
  listSupportCategories,
  type SupportCategoryRow,
} from './support-api';

function useAppointmentFromQuery(
  role: 'CONSUMER' | 'PROVIDER',
  appointmentId: string | null,
  rows: AppointmentRow[] | undefined,
) {
  return useMemo(() => {
    if (!appointmentId || !rows) return null;
    return rows.find((a) => a.id === appointmentId) ?? null;
  }, [appointmentId, rows]);
}

function Inner({ role }: { role: 'CONSUMER' | 'PROVIDER' }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const appointmentId = sp.get('appointmentId');

  const hub =
    role === 'CONSUMER' ? '/dashboard/consumer' : '/dashboard/provider';

  const apptsQuery = useQuery({
    queryKey:
      role === 'CONSUMER'
        ? ['appointments', 'me']
        : ['appointments', 'provider', 'me'],
    queryFn: () =>
      role === 'CONSUMER'
        ? listMyAppointments(getToken)
        : listProviderAppointments(getToken),
  });

  const categoriesQuery = useQuery({
    queryKey: ['support', 'categories'],
    queryFn: () => listSupportCategories(getToken),
    staleTime: 0,
  });

  const appointment = useAppointmentFromQuery(
    role,
    appointmentId,
    apptsQuery.data,
  );

  const [step, setStep] = useState(0);
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [sessionMinutes, setSessionMinutes] = useState('');
  const [message, setMessage] = useState('');
  const [formal, setFormal] = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!appointmentId || !categoryCode) {
        throw new Error('Falta cita o categoría.');
      }
      const metadata: Record<string, unknown> = {};
      if (categoryCode === 'SHORT_SESSION') {
        const n = Number(sessionMinutes);
        if (!Number.isFinite(n) || n < 1) {
          throw new Error('Indica los minutos reales de la sesión (número).');
        }
        metadata.sessionActualMinutes = n;
      }
      return createSupportTicket(getToken, {
        appointmentId,
        categoryCode,
        metadata,
        formalComplaint: formal,
        initialMessage: message.trim() || undefined,
      });
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      router.replace(`${hub}/soporte/${ticket.id}`);
    },
  });

  const categories = categoriesQuery.data ?? [];
  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentCode).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const selectedCategory = useMemo(
    () => topCategories.find((c) => c.code === categoryCode) ?? null,
    [topCategories, categoryCode],
  );

  if (!appointmentId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Abre «Obtener ayuda» desde el detalle de una cita para vincular el ticket.
        </p>
        <Link href={hub} className="text-sm font-semibold text-primary underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  if (apptsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>
    );
  }

  if (apptsQuery.isError || !appointment) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-sm text-red-700">
          No encontramos esa cita en tu cuenta.
        </p>
        <Link href={hub} className="text-sm font-semibold text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  if (categoriesQuery.isError) {
    const msg =
      categoriesQuery.error instanceof ApiError
        ? categoriesQuery.error.message
        : 'Error al cargar categorías de soporte.';
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-sm text-red-700">{msg}</p>
        <Button type="button" variant="secondary" onClick={() => categoriesQuery.refetch()}>
          Reintentar
        </Button>
        <Link href={hub} className="block text-sm font-semibold text-primary underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  const err =
    createMut.error instanceof ApiError
      ? createMut.error.message
      : createMut.error instanceof Error
        ? createMut.error.message
        : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">Obtener ayuda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cita con{' '}
          {role === 'CONSUMER'
            ? appointment.providerProfile.fullName?.trim() || 'educador'
            : appointment.consumerProfile.fullName?.trim() || 'familia'}{' '}
          ·{' '}
          {new Date(appointment.startsAt).toLocaleString('es', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          {step === 0 ? (
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">¿Qué pasó?</p>
              {topCategories.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
                  <p>
                    No hay opciones de categoría disponibles. Comprueba que el API esté en marcha
                    y vuelve a intentar (el servidor rellena el catálogo la primera vez que hace
                    falta).
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => categoriesQuery.refetch()}
                  >
                    Cargar opciones
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {topCategories.map((c: SupportCategoryRow) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryCode(c.code);
                          setStep(c.code === 'SHORT_SESSION' ? 1 : 2);
                        }}
                        className="h-full w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-accent hover:bg-muted/40"
                      >
                        {c.labelEs}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {step === 1 && categoryCode === 'SHORT_SESSION' ? (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para evaluar un posible reembolso parcial, indica cuántos minutos duró la sesión
                en realidad.
              </p>
              <Field label="Minutos reales de sesión">
                <Input
                  type="number"
                  min={1}
                  value={sessionMinutes}
                  onChange={(e) => setSessionMinutes(e.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                  Atrás
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setStep(2)}
                  disabled={!sessionMinutes.trim()}
                >
                  Continuar
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              {selectedCategory?.descriptionEs ? (
                <p className="text-xs text-muted-foreground">{selectedCategory.descriptionEs}</p>
              ) : null}
              <Field
                label="Detalle (opcional)"
                hint="Cuanta más información, mejor podremos ayudarte."
              >
                <TextArea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formal}
                  onChange={(e) => setFormal(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Reclamación formal (PQR)</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Genera número de seguimiento y prioriza revisión según políticas internas.
                  </span>
                </span>
              </label>
              {err ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  {err}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(categoryCode === 'SHORT_SESSION' ? 1 : 0)}
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={createMut.isPending}
                  onClick={() => createMut.mutate()}
                >
                  {createMut.isPending ? 'Enviando…' : 'Enviar ticket'}
                </Button>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">Resumen de solicitud</p>
            <p className="mt-2 text-muted-foreground">
              Categoría:{' '}
              <span className="font-medium text-foreground">
                {selectedCategory?.labelEs ?? 'Sin seleccionar'}
              </span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Paso actual: <span className="font-medium text-foreground">{step + 1} / 3</span>
            </p>
            {categoryCode === 'SHORT_SESSION' ? (
              <p className="mt-1 text-muted-foreground">
                Minutos reportados:{' '}
                <span className="font-medium text-foreground">
                  {sessionMinutes.trim() || 'Pendiente'}
                </span>
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Usa este flujo para incidentes de una cita concreta. Si detectas riesgo inmediato, usa
            canales de emergencia locales y luego registra el caso.
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SupportNewTicketScreen({ role }: { role: 'CONSUMER' | 'PROVIDER' }) {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>}
    >
      <Inner role={role} />
    </Suspense>
  );
}
