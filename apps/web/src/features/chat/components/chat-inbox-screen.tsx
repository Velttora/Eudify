'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { appointmentStatusLabelEs } from '@/features/appointments/lib/appointment-status-ui';
import { FormModalSheet } from '@/shared/components/form-modal-sheet';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/field';
import {
  useChatMessagesInfinite,
  useChatRealtimeBindings,
  useChatThreads,
  useMarkRead,
  useSendMessage,
} from '../hooks/use-chat';

function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatSessionContext(thread: {
  sessionContext: {
    childFirstName: string | null;
    offerTitle: string | null;
    startsAt: string;
    endsAt: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
    attendanceMode: 'IN_PERSON' | 'ONLINE' | null;
    requestsAlternativeSchedule: boolean;
  } | null;
}) {
  const ctx = thread.sessionContext;
  if (!ctx) return 'Sin sesión vinculada todavía';
  const child = ctx.childFirstName?.trim() || 'Alumno/a';
  const status = appointmentStatusLabelEs(ctx);
  const mode =
    ctx.attendanceMode === 'ONLINE'
      ? 'En línea'
      : ctx.attendanceMode === 'IN_PERSON'
        ? 'Presencial'
        : 'Por definir';
  const when = `${formatTimestamp(ctx.startsAt)} - ${new Date(ctx.endsAt).toLocaleTimeString('es', {
    timeStyle: 'short',
  })}`;
  const topic = ctx.offerTitle?.trim() || 'Sesión';
  return `${topic} · ${child} · ${status} · ${mode} · ${when}`;
}

export function ChatInboxScreen() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [threadsModalOpen, setThreadsModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const threadsQuery = useChatThreads();
  const threads = threadsQuery.data ?? [];
  const selectedThread =
    threads.find((t) => t.id === selectedThreadId) ?? threads[0] ?? null;
  const effectiveThreadId = selectedThread?.id ?? null;
  const messagesQuery = useChatMessagesInfinite(effectiveThreadId);
  const sendMut = useSendMessage(effectiveThreadId);
  const markReadMut = useMarkRead(effectiveThreadId);
  useChatRealtimeBindings(effectiveThreadId);
  const messages = useMemo(
    () => {
      const flat = (messagesQuery.data?.pages ?? [])
        .flatMap((p) => p.items)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const seen = new Set<string>();
      return flat.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    [messagesQuery.data?.pages],
  );

  const lastMessageId = messages.at(-1)?.id;

  // Keep the viewport pinned to the latest message when the thread or content changes.
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [effectiveThreadId, lastMessageId, messages.length]);

  if (threadsQuery.isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Cargando conversaciones…</p>;
  }

  if (threadsQuery.isError) {
    return <p className="p-8 text-sm text-red-700">No se pudo cargar el chat.</p>;
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Tu chat aparecerá aquí cuando una cita sea aceptada.
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 min-w-0 space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-3 md:block md:max-h-[min(74vh,720px)] md:sticky md:top-24">
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => setSelectedThreadId(thread.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
              effectiveThreadId === thread.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted'
            }`}
          >
            <p className="font-semibold text-foreground">
              {thread.counterpart.fullName?.trim() || 'Contacto'}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              {formatSessionContext(thread)}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {thread.lastMessagePreview || 'Sin mensajes todavía'}
            </p>
          </button>
        ))}
      </aside>

      {/*
        Fixed pane height + min-h-0 on the messages list so overflow-y-auto actually
        scrolls instead of expanding the whole conversation.
      */}
      <section className="flex h-[min(70dvh,720px)] min-h-[min(420px,70dvh)] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 shrink-0 md:hidden">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-between"
            onClick={() => setThreadsModalOpen(true)}
          >
            <span className="truncate">
              Conversación: {selectedThread?.counterpart.fullName?.trim() || 'Sin seleccionar'}
            </span>
            <span aria-hidden>▾</span>
          </Button>
        </div>
        <header className="shrink-0 border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">
            {selectedThread?.counterpart.fullName?.trim() || 'Conversación'}
          </p>
          {selectedThread ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatSessionContext(selectedThread)}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-3">
          {messages.map((m) => {
            const mine = m.senderUserId === selectedThread?.me.userId;
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-xl border px-3 py-2 text-sm ${
                  mine
                    ? 'ml-auto border-primary/30 bg-primary/10 text-foreground'
                    : 'border-border bg-background text-foreground'
                }`}
              >
                <p className="wrap-break-word whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatTimestamp(m.createdAt)}
                </p>
              </div>
            );
          })}
          <div ref={messagesEndRef} aria-hidden className="h-px w-full shrink-0" />
        </div>

        <div className="mt-3 shrink-0 border-t border-border pt-3">
          {sendMut.isError ? (
            <p className="mb-2 text-xs text-red-700">
              {sendMut.error instanceof Error
                ? sendMut.error.message
                : 'No se pudo enviar el mensaje.'}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
              onFocus={() => {
                const latest = messages.at(-1);
                if (latest?.id && effectiveThreadId) {
                  markReadMut.mutate(latest.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!effectiveThreadId || !draft.trim()) return;
                  sendMut.mutate({ text: draft.trim() });
                  setDraft('');
                }
              }}
            />
            <Button
              type="button"
              disabled={!effectiveThreadId || !draft.trim() || sendMut.isPending}
              onClick={() => {
                if (!effectiveThreadId || !draft.trim()) return;
                sendMut.mutate({ text: draft.trim() });
                setDraft('');
              }}
            >
              Enviar
            </Button>
          </div>
        </div>
      </section>

      <FormModalSheet
        open={threadsModalOpen}
        title="Conversaciones"
        subtitle="Selecciona una conversación para abrirla."
        onClose={() => setThreadsModalOpen(false)}
      >
        <div className="space-y-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => {
                setSelectedThreadId(thread.id);
                setThreadsModalOpen(false);
              }}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                effectiveThreadId === thread.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <p className="font-semibold text-foreground">
                {thread.counterpart.fullName?.trim() || 'Contacto'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {formatSessionContext(thread)}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {thread.lastMessagePreview || 'Sin mensajes todavía'}
              </p>
            </button>
          ))}
        </div>
      </FormModalSheet>
    </div>
  );
}
