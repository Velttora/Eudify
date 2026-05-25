import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { robots: { index: false, follow: false } };

import { syncUserWithToken } from '@/features/bootstrap/server-sync';
import { landingPathAfterBootstrap } from '@/shared/lib/routing';

/**
 * Punto de entrada tras login: sincroniza con la API en el servidor y redirige
 * al dashboard, onboarding o elección de rol (sin loader colgado en el cliente).
 */
export default async function MiEspacioPage() {
  const a = await auth();
  if (!a.userId) {
    redirect('/sign-in');
  }

  const token = await a.getToken();
  if (!token) {
    redirect('/sign-in');
  }

  let data: Awaited<ReturnType<typeof syncUserWithToken>>;
  try {
    data = await syncUserWithToken(token);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[mi-espacio] POST /v1/users/sync falló:', err);
    }
    redirect('/sync-error');
  }

  if (!data?.bootstrap) {
    redirect('/sync-error');
  }

  redirect(landingPathAfterBootstrap(data.bootstrap));
}
