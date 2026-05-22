'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Field, TextArea } from '@/shared/components/ui/field';
import { ApiError } from '@/shared/lib/api';
import {
  escalateSupportTicket,
  getSupportTicket,
  postSupportTicketMessage,
  resolveSupportTicket,
} from './support-api';

export function SupportTicketDetailScreen({
  role,
}: {
  role: 'CONSUMER' | 'PROVIDER';
}) {
  const { getToken } = useAuth();
  const params = useParams();
  const ticketId = typeof params.ticketId === 'string' ? params.ticketId : '';
  const qc = useQueryClient();
  const hub =
    role === 'CONSUMER' ? '/dashboard/consumer' : '/dashboard/provider';

  const ticketQuery = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => getSupportTicket(getToken, ticketId),
    enabled: Boolean(ticketId),
  });

  const [draft, setDraft] = useState('');

  const sendMut = useMutation({
    mutationFn: (body: string) => postSupportTicketMessage(getToken, ticketId, body),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
    },
  });

  const resolveMut = useMutation({
    mutationFn: () => resolveSupportTicket(getToken, ticketId, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
    },
  });

  const escalateMut = useMutation({
    mutationFn: () => escalateSupportTicket(getToken, ticketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
    },
  });

  if (!ticketId) {
    return <p className="p-6 text-sm text-muted-foreground">Ticket no válido.</p>;
  }

  if (ticketQuery.isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Cargando ticket…</p>;
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-700">No se pudo cargar el ticket.</p>
        <Link href={hub} className="text-sm font-semibold text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const t = ticketQuery.data;
  const err =
    sendMut.error instanceof ApiError
      ? sendMut.error.message
      : sendMut.error instanceof Error
        ? sendMut.error.message
        : resolveMut.error instanceof Error
          ? resolveMut.error.message
          : escalateMut.error instanceof Error
            ? escalateMut.error.message
            : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={hub} className="text-sm font-medium text-primary hover:underline">
          ← Volver al panel
        </Link>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
          {t.status}
        </span>
      </div>
      <header>
        <h1 className="text-xl font-bold text-foreground">Ticket de soporte</h1>
        {t.formalTrackingNumber ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Seguimiento PQR: <span className="font-mono font-semibold">{t.formalTrackingNumber}</span>
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Categoría: {t.categoryCode} · Cita {t.appointmentId.slice(0, 8)}…
        </p>
      </header>

      {t.proposedResolution && t.status === 'PENDING_USER' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-semibold">Propuesta automática</p>
          <p className="mt-2 text-xs leading-relaxed">
            Revisa el primer mensaje del sistema. Si te parece bien, acepta; si no, escala a un
            agente.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={resolveMut.isPending}
              onClick={() => resolveMut.mutate()}
            >
              {resolveMut.isPending ? '…' : 'Aceptar solución propuesta'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={escalateMut.isPending}
              onClick={() => escalateMut.mutate()}
            >
              Hablar con una persona
            </Button>
          </div>
        </div>
      ) : null}

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {err}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4">
          <ul className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
            {(t.messages ?? []).map((m) => (
              <li
                key={m.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  m.authorType === 'SYSTEM'
                    ? 'border-slate-200 bg-slate-50 text-slate-900'
                    : m.authorType === 'AGENT'
                      ? 'border-violet-200 bg-violet-50 text-violet-950'
                      : 'border-border bg-background text-foreground'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {m.authorType === 'SYSTEM'
                    ? 'Sistema'
                    : m.authorType === 'AGENT'
                      ? 'Soporte'
                      : 'Tú'}
                </span>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString('es')}
                </p>
              </li>
            ))}
          </ul>

          {t.status !== 'RESOLVED' ? (
            <Field label="Tu mensaje">
              <TextArea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button
                type="button"
                className="mt-2"
                variant="secondary"
                disabled={sendMut.isPending || !draft.trim()}
                onClick={() => sendMut.mutate(draft.trim())}
              >
                {sendMut.isPending ? 'Enviando…' : 'Enviar mensaje'}
              </Button>
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">Este ticket está resuelto.</p>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">Resumen</p>
            <p className="mt-2 text-muted-foreground">Estado: {t.status}</p>
            <p className="mt-1 text-muted-foreground">Categoría: {t.categoryCode}</p>
            <p className="mt-1 text-muted-foreground">
              Mensajes: {(t.messages ?? []).length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Mantén un solo hilo por incidente para acelerar la resolución y conservar trazabilidad
            de soporte.
          </div>
        </aside>
      </div>
    </div>
  );
}
