'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '@/features/notifications/api/notifications-api';

export const notificationsQueryKey = ['notifications', 'me'] as const;

function formatRelative(iso: string) {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return d.toLocaleDateString('es', { dateStyle: 'short' });
  } catch {
    return '';
  }
}

export function NotificationBell() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const query = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => listNotifications(getToken, 25),
    enabled: Boolean(isLoaded && isSignedIn),
    refetchInterval: open ? 12_000 : 20_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(getToken, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(getToken),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isLoaded || !isSignedIn) return null;

  const unread = query.data?.unreadCount ?? 0;
  const hasUnread = unread > 0;
  const items = query.data?.items ?? [];

  return (
    <div ref={rootRef} className="relative z-10">
      <button
        type="button"
        aria-label={
          hasUnread ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${
          hasUnread
            ? 'text-[var(--foreground)]'
            : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
        } hover:bg-[var(--muted)]`}
      >
        <BellIcon />
        {hasUnread ? (
          <span
            className="pointer-events-none absolute right-0 top-0 flex h-[18px] min-w-[18px] -translate-y-0.5 translate-x-0.5 items-center justify-center rounded-full bg-[#e11d48] px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[var(--card)]"
            aria-hidden
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 z-[60] mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-[var(--primary)] hover:underline"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Marcar todas leídas
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(70vh,22rem)] overflow-y-auto">
            {query.isLoading ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Cargando…
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                No tienes notificaciones todavía.
              </li>
            ) : (
              items.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onOpen={() => {
                    if (!n.readAt) markOne.mutate(n.id);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  n,
  onOpen,
}: {
  n: NotificationRow;
  onOpen: () => void;
}) {
  const unread = !n.readAt;
  const inner = (
    <div
      className={`border-b border-[var(--border)] px-3 py-3 text-left transition hover:bg-[var(--muted)]/60 ${
        unread ? 'bg-[var(--primary)]/5' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {unread ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{n.title}</p>
          <p className="mt-0.5 line-clamp-3 text-xs text-[var(--muted-foreground)]">{n.body}</p>
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            {formatRelative(n.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );

  if (n.href) {
    return (
      <li>
        <Link href={n.href} onClick={onOpen} className="block">
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" className="block w-full" onClick={onOpen}>
        {inner}
      </button>
    </li>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a5.5 5.5 0 0 0-5.5 5.5v1.7c0 .7-.2 1.4-.6 2L4.3 14.5A1.2 1.2 0 0 0 5.3 16.5h13.4a1.2 1.2 0 0 0 1-2l-1.6-2.3c-.4-.6-.6-1.3-.6-2V8.5A5.5 5.5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 16.5a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
