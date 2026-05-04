'use client';

import { useMemo, useState } from 'react';

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
  const status =
    ctx.status === 'CONFIRMED'
      ? 'Confirmada'
      : ctx.status === 'PENDING'
        ? 'Pendiente'
        : 'Completada';
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
    <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-2xl border border-border bg-card p-3">
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

      <section className="flex min-h-[520px] flex-col rounded-2xl border border-border bg-card p-4">
        <header className="border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">
            {selectedThread?.counterpart.fullName?.trim() || 'Conversación'}
          </p>
          {selectedThread ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatSessionContext(selectedThread)}
            </p>
          ) : null}
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto py-3">
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
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatTimestamp(m.createdAt)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-border pt-3">
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
    </div>
  );
}
