'use client';

import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { postPublicFeedback } from '@/features/feedback/feedback-api';
import { Button, buttonStyles } from '@/shared/components/ui/button';

export function FeedbackFab() {
  const pathname = usePathname();
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'suggestion' | 'complaint'>('suggestion');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    },
    [setOpen],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);

  const reset = () => {
    setMessage('');
    setContactEmail('');
    setKind('suggestion');
    setDone(false);
    setError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async () => {
    setError(null);
    setSending(true);
    try {
      await postPublicFeedback({
        kind,
        message: message.trim(),
        contactEmail: contactEmail.trim() || undefined,
        sourcePath: typeof window !== 'undefined' ? `${window.location.origin}${pathname ?? ''}` : pathname ?? undefined,
        clerkUserIdHint: userId ?? undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'No se pudo enviar. Inténtalo de nuevo.';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Sugerencias o quejas"
        title="Sugerencias o quejas"
        className={`${buttonStyles('primary', 'fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full p-0 shadow-lg sm:bottom-6 sm:right-6')}`}
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError(null);
        }}
      >
        <span className="text-xl leading-none" aria-hidden>
          ✉️
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-fab-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="feedback-fab-title" className="text-lg font-semibold text-foreground">
                  Sugerencias o quejas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tu mensaje llega al equipo de Eudify Academy por correo.
                </p>
              </div>
              <button
                type="button"
                className={buttonStyles('ghost', 'shrink-0 px-2 py-1 text-lg')}
                onClick={close}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {done ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-foreground">Gracias. Hemos recibido tu mensaje.</p>
                <Button type="button" variant="secondary" className="w-full" onClick={close}>
                  Cerrar
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={
                      kind === 'suggestion'
                        ? buttonStyles('primary', 'flex-1 text-xs sm:text-sm')
                        : buttonStyles('secondary', 'flex-1 text-xs sm:text-sm')
                    }
                    onClick={() => setKind('suggestion')}
                  >
                    Sugerencia
                  </button>
                  <button
                    type="button"
                    className={
                      kind === 'complaint'
                        ? buttonStyles('primary', 'flex-1 text-xs sm:text-sm')
                        : buttonStyles('secondary', 'flex-1 text-xs sm:text-sm')
                    }
                    onClick={() => setKind('complaint')}
                  >
                    Queja
                  </button>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Mensaje</span>
                  <textarea
                    className="mt-1 min-h-[120px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Cuéntanos qué ocurre o qué mejorarías…"
                    maxLength={4000}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Tu correo (opcional, para responderte)
                  </span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                  />
                </label>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={close}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={sending || message.trim().length < 10}
                    onClick={() => void submit()}
                  >
                    {sending ? 'Enviando…' : 'Enviar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
