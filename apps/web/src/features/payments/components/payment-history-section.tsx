'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { formatMoneyMinor } from '@/features/educator-hub/application/educator-format';
import {
  getPaymentReceiptUrl,
  listMyPaymentHistory,
  listProviderPaymentHistory,
  type PaymentHistoryItem,
  type PaymentHistoryStatus,
} from '@/features/payments/api/payments-api';
import { ApiError } from '@/shared/lib/api';

function statusLabel(status: PaymentHistoryStatus): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'Pagado';
    case 'FAILED':
      return 'Fallido';
    case 'PROCESSING':
      return 'Procesando';
    case 'REQUIRES_PAYMENT_METHOD':
      return 'Pendiente de tarjeta';
    case 'CANCELED':
      return 'Cancelado';
    default:
      return status;
  }
}

function statusClass(status: PaymentHistoryStatus): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'FAILED':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'PROCESSING':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function PaymentHistorySection({
  role,
}: {
  role: 'CONSUMER' | 'PROVIDER';
}) {
  const { getToken } = useAuth();
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['payments', 'history', role],
    queryFn: () =>
      role === 'PROVIDER'
        ? listProviderPaymentHistory(getToken, 50)
        : listMyPaymentHistory(getToken, 50),
  });

  const receiptMut = useMutation({
    mutationFn: (paymentId: string) => getPaymentReceiptUrl(getToken, paymentId),
    onSuccess: (data) => {
      setReceiptError(null);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    },
    onError: (err: unknown) => {
      setReceiptError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo abrir el comprobante',
      );
    },
  });

  const items = historyQuery.data?.items ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {role === 'PROVIDER' ? 'Historial de cobros' : 'Historial de pagos'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === 'PROVIDER'
            ? 'Sesiones cobradas a familias. Puedes abrir el recibo de Stripe de los pagos confirmados.'
            : 'Sesiones que pagaste. Descarga el recibo de Stripe cuando el cobro esté confirmado.'}
        </p>
      </div>

      {historyQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando historial…</p>
      ) : null}
      {historyQuery.isError ? (
        <p className="text-sm text-red-700">
          {historyQuery.error instanceof Error
            ? historyQuery.error.message
            : 'No se pudo cargar el historial de pagos.'}
        </p>
      ) : null}

      {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
          {role === 'PROVIDER'
            ? 'Aún no hay cobros registrados. Aparecerán aquí cuando aceptes citas con precio y se procese el pago.'
            : 'Aún no hay pagos registrados. Aparecerán aquí cuando un educador acepte una cita con cobro.'}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <PaymentHistoryRow
              key={item.id}
              item={item}
              role={role}
              receiptPending={
                receiptMut.isPending && receiptMut.variables === item.id
              }
              onReceipt={() => receiptMut.mutate(item.id)}
            />
          ))}
        </ul>
      ) : null}

      {receiptError ? (
        <p className="text-sm text-red-700">{receiptError}</p>
      ) : null}
    </section>
  );
}

function PaymentHistoryRow({
  item,
  role,
  receiptPending,
  onReceipt,
}: {
  item: PaymentHistoryItem;
  role: 'CONSUMER' | 'PROVIDER';
  receiptPending: boolean;
  onReceipt: () => void;
}) {
  const counterpartyLabel =
    role === 'PROVIDER' ? 'Familia' : 'Educador/a';
  const amount =
    role === 'PROVIDER'
      ? formatMoneyMinor(item.netAmountMinor, item.currency)
      : formatMoneyMinor(item.amountMinor, item.currency);

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(item.status)}`}
          >
            {statusLabel(item.status)}
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {amount}
          </span>
        </div>
        <p className="text-sm text-foreground">
          {item.appointment.title?.trim() || 'Sesión'} · {counterpartyLabel}:{' '}
          <span className="font-medium">
            {item.counterpartyName?.trim() || '—'}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Sesión: {formatWhen(item.appointment.startsAt)}
          {item.processedAt
            ? ` · Cobro: ${formatWhen(item.processedAt)}`
            : ` · Registrado: ${formatWhen(item.createdAt)}`}
        </p>
        {item.status === 'FAILED' && item.failureReason ? (
          <p className="text-xs text-red-700">{item.failureReason}</p>
        ) : null}
        {role === 'PROVIDER' &&
        item.providerAmountMinor != null &&
        item.amountMinor !== item.providerAmountMinor ? (
          <p className="text-xs text-muted-foreground">
            Total familia {formatMoneyMinor(item.amountMinor, item.currency)}
            {item.platformFeeMinor != null
              ? ` · comisión ${formatMoneyMinor(item.platformFeeMinor, item.currency)}`
              : ''}
          </p>
        ) : null}
      </div>
      {item.hasReceipt ? (
        <button
          type="button"
          onClick={onReceipt}
          disabled={receiptPending}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {receiptPending ? 'Abriendo…' : 'Ver recibo'}
        </button>
      ) : null}
    </li>
  );
}
