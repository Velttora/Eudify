import { ConsumerExploreNearAppointments } from '@/features/consumer/components/consumer-explore-near-appointments';
import { ProviderDiscovery } from '@/features/discover/provider-discovery';
import { PublicSiteHeader } from '@/shared/components/public-site-header';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { syncUserWithToken } from '@/features/bootstrap/server-sync';

export default async function ExplorarPage() {
  const a = await auth();
  if (a.userId) {
    const token = await a.getToken();
    if (token) {
      try {
        const data = await syncUserWithToken(token);
        const b = data?.bootstrap;
        if (
          b &&
          !b.needsRoleSelection &&
          !b.needsOnboarding &&
          b.user?.role === 'PROVIDER'
        ) {
          redirect('/dashboard/provider');
        }
      } catch {
        // Si falla el sync, se muestra el catálogo (p. ej. API caída).
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicSiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Educadores y cuidadores
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base mb-5">
          Abre una tarjeta para ver la ficha completa: trayectoria, calendario,
          tarifas en COP (con sesión) y reserva.
        </p>
        <ConsumerExploreNearAppointments />
        <div className="mt-8">
          <ProviderDiscovery />
        </div>
      </main>
    </div>
  );
}
