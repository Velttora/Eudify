import type { AppHeaderLink } from '@/shared/components/app-header';

/** Secciones del hub familiar (una sola ruta `/dashboard/consumer`). */
export type ConsumerHubSection = 'resumen' | 'familia' | 'citas' | 'pagos';

const BASE = '/dashboard/consumer';

export function parseConsumerHubSection(
  raw: string | null,
): ConsumerHubSection {
  if (raw === 'familia' || raw === 'citas' || raw === 'pagos') return raw;
  return 'resumen';
}

export function consumerHubHref(seccion: ConsumerHubSection): string {
  if (seccion === 'resumen') return BASE;
  return `${BASE}?seccion=${seccion}`;
}

/**
 * Navegación global del consumidor: la misma en toda la app (hub, planner, chat, explorar).
 * "Familia" vive como pestaña dentro del hub (ver ConsumerHubSection), no se repite aquí
 * para no tener el mismo destino accesible desde dos elementos de navegación distintos.
 */
const CONSUMER_NAV_BASE: AppHeaderLink[] = [
  { href: consumerHubHref('resumen'), label: 'Mi espacio', replace: true },
  { href: '/planner', label: 'Plan Anual' },
  { href: '/explorar', label: 'Educadores' },
  { href: '/dashboard/consumer/chat', label: 'Chat' },
];

/** `activeHref` recibe el emphasis visual (página actual dentro del nav global). */
export function consumerNavLinks(activeHref: string): AppHeaderLink[] {
  return CONSUMER_NAV_BASE.map((l) => ({ ...l, emphasized: l.href === activeHref }));
}
