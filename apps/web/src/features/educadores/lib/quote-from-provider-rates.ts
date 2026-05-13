import type { ProviderRateRow } from '@/features/providers/api/providers-api';

type QuotePreview = {
  priceMinor: number;
  currency: string;
  basis: 'HOUR' | 'SESSION' | 'DAY';
  rateLabel: string | null;
  rateAmountMinor: number;
};

/** Misma prioridad que el API: HOUR (proporcional) → SESSION → DAY. */
export function quoteFromProviderRatesForPreview(
  rates: ProviderRateRow[],
  durationMinutes: number,
): QuotePreview | null {
  const sorted = [...rates].sort((a, b) => a.sortOrder - b.sortOrder);
  const hourRates = sorted.filter((r) => r.unit === 'HOUR');
  if (hourRates.length > 0) {
    const r = hourRates[0]!;
    const currency = (r.currency || 'COP').trim().toUpperCase();
    const raw = (r.amountMinor * durationMinutes) / 60;
    const priceMinor = Math.max(1, Math.round(raw));
    return {
      priceMinor,
      currency,
      basis: 'HOUR',
      rateLabel: r.label,
      rateAmountMinor: Math.max(1, r.amountMinor),
    };
  }
  const sessionRates = sorted.filter((r) => r.unit === 'SESSION');
  if (sessionRates.length > 0) {
    const r = sessionRates[0]!;
    const currency = (r.currency || 'COP').trim().toUpperCase();
    return {
      priceMinor: Math.max(1, r.amountMinor),
      currency,
      basis: 'SESSION',
      rateLabel: r.label,
      rateAmountMinor: Math.max(1, r.amountMinor),
    };
  }
  const dayRates = sorted.filter((r) => r.unit === 'DAY');
  if (dayRates.length > 0) {
    const r = dayRates[0]!;
    const currency = (r.currency || 'COP').trim().toUpperCase();
    return {
      priceMinor: Math.max(1, r.amountMinor),
      currency,
      basis: 'DAY',
      rateLabel: r.label,
      rateAmountMinor: Math.max(1, r.amountMinor),
    };
  }
  return null;
}
