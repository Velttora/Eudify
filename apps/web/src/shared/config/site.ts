/** URL canónica del sitio (apex). Vercel suele redirigir www → apex o al revés. */
export const SITE_URL = 'https://eudify.co';

export const SITE_HOST = 'eudify.co';

/** Orígenes permitidos en producción (web en eudify.co y www). */
export const SITE_ORIGINS = ['https://eudify.co', 'https://www.eudify.co'] as const;
