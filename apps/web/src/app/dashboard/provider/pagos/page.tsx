'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createProviderOnboardingLink,
  getProviderConnectStatus,
} from '@/features/payments/api/payments-api';

export default function ProviderPaymentsPage() {
  const { getToken } = useAuth();
  const statusQuery = useQuery({
    queryKey: ['payments', 'provider', 'connect-status'],
    queryFn: () => getProviderConnectStatus(getToken),
  });

  const onboardingMutation = useMutation({
    mutationFn: async () =>
      createProviderOnboardingLink(getToken, {
        refreshUrl: `${window.location.origin}/dashboard/provider/pagos`,
        returnUrl: `${window.location.origin}/dashboard/provider/pagos`,
      }),
    onSuccess: (data) => {
      window.location.assign(data.url);
    },
  });

  const status = statusQuery.data;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Cobros del educador</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Stripe Connect habilita el cobro automático; la agenda y la disponibilidad se pueden configurar por separado.
        </p>
      </header>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Estado de onboarding</h2>
        {statusQuery.isLoading ? <p>Cargando estado...</p> : null}
        {status ? (
          <div className="space-y-1 text-sm">
            <p>Cuenta conectada: {status.connected ? 'Si' : 'No'}</p>
            <p>Datos enviados: {status.detailsSubmitted ? 'Si' : 'No'}</p>
            <p>Charges enabled: {status.chargesEnabled ? 'Si' : 'No'}</p>
            <p>Payouts enabled: {status.payoutsEnabled ? 'Si' : 'No'}</p>
            <p>Onboarding completo: {status.onboardingComplete ? 'Si' : 'No'}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onboardingMutation.mutate()}
          disabled={onboardingMutation.isPending}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {onboardingMutation.isPending
            ? 'Redirigiendo...'
            : 'Conectar / continuar onboarding'}
        </button>
      </section>
    </main>
  );
}
