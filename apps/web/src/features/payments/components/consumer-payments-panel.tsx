'use client';

import { useAuth } from '@clerk/nextjs';
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

import {
  createSetupIntent,
  deletePaymentMethod,
  listMyPaymentMethods,
  setDefaultPaymentMethod,
  syncPaymentMethod,
} from '@/features/payments/api/payments-api';
import { PaymentHistorySection } from '@/features/payments/components/payment-history-section';
import { EmptyState } from '@/shared/components/empty-state';
import { ApiError } from '@/shared/lib/api';

const rawStripePublicKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ??
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  '';
const stripePublicKey = rawStripePublicKey.trim();
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

function AddCardForm() {
  const { getToken } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);

  const addCardMutation = useMutation({
    mutationFn: async () => {
      if (!stripe || !elements) {
        throw new Error('Stripe aún no está listo');
      }
      const setupIntent = await createSetupIntent(getToken);
      if (!setupIntent.clientSecret) {
        throw new Error('No se obtuvo clientSecret para setup intent');
      }
      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error('No se encontró el formulario de tarjeta');
      }
      const result = await stripe.confirmCardSetup(setupIntent.clientSecret, {
        payment_method: {
          card,
        },
      });
      if (result.error) {
        throw new Error(result.error.message ?? 'No se pudo registrar la tarjeta');
      }
      const paymentMethodId =
        typeof result.setupIntent.payment_method === 'string'
          ? result.setupIntent.payment_method
          : result.setupIntent.payment_method?.id;
      if (!paymentMethodId) {
        throw new Error('Stripe no devolvió payment method');
      }
      await syncPaymentMethod(getToken, paymentMethodId);
    },
    onSuccess: async () => {
      setErrorText(null);
      await queryClient.invalidateQueries({
        queryKey: ['payments', 'methods'],
      });
    },
    onError: (err: unknown) => {
      setErrorText(err instanceof Error ? err.message : 'Error al agregar tarjeta');
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    addCardMutation.mutate();
  }

  return (
    <form
      id="add-payment-method"
      noValidate
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-4"
    >
      <h3 className="text-lg font-semibold">Agregar tarjeta</h3>
      <p className="text-sm text-muted-foreground">
        Si quieres editar una tarjeta, agrega la nueva y elimina la anterior.
      </p>
      <div className="rounded-md border p-3">
        <CardElement />
      </div>
      {errorText ? <p className="text-sm text-red-700">{errorText}</p> : null}
      <button
        type="submit"
        disabled={addCardMutation.isPending || !stripe || !elements}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {addCardMutation.isPending ? 'Guardando...' : 'Guardar tarjeta'}
      </button>
    </form>
  );
}

type ConsumerPaymentsPanelProps = {
  embedded?: boolean;
  /** Menos titulares: útil dentro del onboarding. */
  compact?: boolean;
};

export function ConsumerPaymentsPanel({
  embedded = false,
  compact = false,
}: ConsumerPaymentsPanelProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [errorText, setErrorText] = useState<string | null>(null);
  const methodsQuery = useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: () => listMyPaymentMethods(getToken),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      setDefaultPaymentMethod(getToken, paymentMethodId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'methods'] });
      setErrorText(null);
    },
    onError: (err: unknown) => {
      setErrorText(
        err instanceof ApiError ? err.message : 'No se pudo cambiar el método por defecto',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      deletePaymentMethod(getToken, paymentMethodId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'methods'] });
      setErrorText(null);
    },
    onError: (err: unknown) => {
      setErrorText(
        err instanceof ApiError ? err.message : 'No se pudo eliminar la tarjeta',
      );
    },
  });

  const hasStripeKey = useMemo(() => Boolean(stripePublicKey), []);

  const content = (
    <>
      {compact ? (
        <p className="text-sm text-muted-foreground">
          Opcional ahora: si lo omites, te lo recordaremos al agendar una cita.
        </p>
      ) : (
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Pagos de familia</h1>
          <p className="text-sm text-muted-foreground">
            Puedes crear tu perfil sin tarjeta, pero para agendar citas necesitas un método
            de pago por defecto.
          </p>
        </header>
      )}

      {!hasStripeKey || !stripePromise ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          Configura <code>NEXT_PUBLIC_STRIPE_PUBLIC_KEY</code> para habilitar Stripe
          Elements.
        </section>
      ) : (
        <Elements stripe={stripePromise}>
          <AddCardForm />
        </Elements>
      )}

      <section className="rounded-xl border p-4 space-y-4">
        <h2 className={compact ? 'text-base font-semibold' : 'text-lg font-semibold'}>
          Métodos guardados
        </h2>
        {methodsQuery.isLoading ? <p>Cargando...</p> : null}
        {methodsQuery.data?.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No tienes métodos de pago"
            body="Agrega una tarjeta para poder reservar sesiones cuando encuentres el educador adecuado."
            actionLabel="Agregar tarjeta"
            actionHref="#add-payment-method"
          />
        ) : null}
        <div className="space-y-2">
          {methodsQuery.data?.map((method) => (
            <div
              key={method.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {method.brand?.toUpperCase() ?? 'CARD'} ****{method.last4} · exp{' '}
                  {method.expMonth}/{method.expYear}
                </p>
                {method.isDefault ? (
                  <p className="text-xs text-emerald-700">Método por defecto</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={method.isDefault || setDefaultMutation.isPending}
                  onClick={() => setDefaultMutation.mutate(method.id)}
                  className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                >
                  {method.isDefault ? 'Por defecto' : 'Usar por defecto'}
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    const ok = window.confirm(
                      '¿Seguro que quieres eliminar esta tarjeta?',
                    );
                    if (!ok) return;
                    deleteMutation.mutate(method.id);
                  }}
                  className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        {errorText ? <p className="text-sm text-red-700">{errorText}</p> : null}
      </section>

      {!compact ? <PaymentHistorySection role="CONSUMER" /> : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }
  return <main className="mx-auto max-w-3xl space-y-6 p-6">{content}</main>;
}
