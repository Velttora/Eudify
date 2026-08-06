'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { pathAfterBootstrap } from '@/shared/lib/routing';
import { AppHeader } from '@/shared/components/app-header';

type HubNavItem = { href: string; label: string; exact?: boolean };
type HubNavSection = { label: string; items: HubNavItem[] };

/**
 * Order by daily work → catalog/presence → money → account → low-frequency tools.
 * Insights / Recursos stay last (placeholders + infrequent use).
 */
const NAV_SECTIONS: HubNavSection[] = [
  {
    label: 'Operación',
    items: [
      { href: '/dashboard/provider', label: 'Inicio', exact: true },
      { href: '/dashboard/provider/agenda', label: 'Agenda' },
      { href: '/dashboard/provider/chat', label: 'Chat' },
      { href: '/dashboard/provider/estudiantes', label: 'Estudiantes' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/dashboard/provider/ofertas', label: 'Ofertas' },
      { href: '/dashboard/provider/vitrina', label: 'Vitrina pública' },
    ],
  },
  {
    label: 'Dinero',
    items: [{ href: '/dashboard/provider/pagos', label: 'Pagos' }],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/profile/provider', label: 'Mi perfil' }],
  },
  {
    label: 'Más',
    items: [
      { href: '/dashboard/provider/insights', label: 'Insights' },
      { href: '/dashboard/provider/recursos', label: 'Recursos' },
    ],
  },
];

function isNavActive(pathname: string | null, item: HubNavItem) {
  if (item.exact === true) return pathname === item.href;
  return pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
}

function navClass(active: boolean) {
  return [
    'rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    active
      ? 'bg-[var(--primary)] text-white shadow-sm'
      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
  ].join(' ');
}

function HubNav({
  pathname,
  compact = false,
}: {
  pathname: string | null;
  /** Mobile drawer: slightly tighter section spacing */
  compact?: boolean;
}) {
  return (
    <nav className={compact ? 'flex flex-col gap-4' : 'flex flex-col gap-6'}>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {section.label}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isNavActive(pathname, item);
              return (
                <Link key={item.href} href={item.href} className={navClass(active)}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function EducatorHubShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  useEffect(() => {
    const b = bootstrapQuery.data;
    if (!b) return;
    const next = pathAfterBootstrap(b);
    if (next !== '/dashboard/provider') {
      router.replace(next);
    }
  }, [bootstrapQuery.data, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const loading = bootstrapQuery.isLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8 text-base text-[var(--muted-foreground)]">
        Cargando tu espacio profesional…
      </div>
    );
  }

  if (bootstrapQuery.isError || !bootstrapQuery.data) {
    return (
      <div className="p-8 text-base text-red-700">
        No se pudo cargar la sesión.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AppHeader logoHref="/dashboard/provider" pageLabel="Educador" links={[]} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
        <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
          >
            Menú del hub
            <span className="text-[var(--muted-foreground)]">{mobileOpen ? '▲' : '▼'}</span>
          </button>
          {mobileOpen ? (
            <div className="mt-2 pb-1">
              <HubNav pathname={pathname} compact />
            </div>
          ) : null}
        </div>

        <aside className="hidden w-56 shrink-0 self-stretch border-r border-[var(--border)] bg-[var(--card)] px-3 py-8 lg:block">
          <HubNav pathname={pathname} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
