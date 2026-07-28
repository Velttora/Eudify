'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import {
  getAdminSupportMetrics,
  listAdminSupportTickets,
} from '@/features/support/support-admin-api';
import { ApiError } from '@/shared/lib/api';

export default function AdminSupportPage() {
  const { getToken } = useAuth();

  const ticketsQuery = useQuery({
    queryKey: ['admin', 'support', 'tickets'],
    queryFn: () => listAdminSupportTickets(getToken),
    retry: false,
  });

  const metricsQuery = useQuery({
    queryKey: ['admin', 'support', 'metrics'],
    queryFn: () => getAdminSupportMetrics(getToken),
    retry: false,
  });

  const forbidden =
    ticketsQuery.error instanceof ApiError && ticketsQuery.error.status === 403;

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <h1 className="text-lg font-bold text-foreground">Soporte admin</h1>
        <p className="text-sm text-muted-foreground">
          Tu usuario no está en SUPPORT_ADMIN_CLERK_IDS o la variable no está definida en el API.
        </p>
        <Link href="/" className="text-sm font-semibold text-primary underline">
          Inicio
        </Link>
      </div>
    );
  }

  if (ticketsQuery.isLoading || metricsQuery.isLoading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const m = metricsQuery.data;
  const rows = ticketsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Soporte (admin)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas y cola de tickets. Requiere{' '}
            <code className="rounded bg-muted px-1 text-xs">SUPPORT_ADMIN_CLERK_IDS</code> en API.
          </p>
        </div>
        <Link href="/" className="text-sm text-primary underline">
          Inicio
        </Link>
      </header>

      {m ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tickets totales" value={m.totalTickets} />
          <Metric label="Resueltos" value={m.resolvedCount} />
          <Metric label="Escalados" value={m.escalatedCount} />
          <Metric label="Resueltos (auto)" value={m.autoResolvedCount} />
        </section>
      ) : null}

      {m?.complaintRateByCategory?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-foreground">Por categoría</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {m.complaintRateByCategory.map((c) => (
              <li
                key={c.categoryCode}
                className="rounded-lg border border-border bg-card px-3 py-1.5"
              >
                {c.categoryCode}: <strong>{c.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-foreground">Últimos tickets</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">Sin tickets aún.</li>
          ) : null}
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{t.id.slice(0, 10)}…</span>
              <span>{t.categoryCode}</span>
              {t.isPriority ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Prioritario
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t.status}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(t.createdAt).toLocaleString('es')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
