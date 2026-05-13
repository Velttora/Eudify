/** Correo al consumidor cuando un cobro de cita falla. */

export const PAYMENT_FAILED_SUBJECT =
  '[Edify Academy] Acción requerida: actualiza tu pago';

const BRAND = {
  primary: '#0b1f3a',
  primaryMid: '#1f3c88',
  accent: '#2ec4b6',
  muted: '#5f6b7a',
  bg: '#f7f9fc',
  card: '#ffffff',
  border: '#e6e8ec',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  footerHint: '#9aa5b1',
  bodyText: '#2b2b2b',
  headerText: '#fffffe',
} as const;

export type PaymentFailedMailPayload = {
  consumerName: string | null;
  providerName: string | null;
  childName: string | null;
  appointmentStartsAt: Date;
  appointmentEndsAt: Date;
  amountMinor: number;
  currency: string;
  failureReason: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoneyMinor(amountMinor: number, currency: string): string {
  const code = (currency || 'COP').trim().toUpperCase();
  try {
    return new Intl.NumberFormat(code === 'COP' ? 'es-CO' : 'es-ES', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(0)} ${code}`;
  }
}

function formatRange(start: Date, end: Date): string {
  const a = start.toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const b = end.toLocaleTimeString('es', { timeStyle: 'short' });
  return `${a} - ${b}`;
}

export function buildPaymentFailedPlainText(
  p: PaymentFailedMailPayload,
): string {
  const greeting = `Hola${p.consumerName ? ` ${p.consumerName}` : ''},`;
  const amount = formatMoneyMinor(p.amountMinor, p.currency);
  return [
    greeting,
    '',
    'No pudimos procesar el pago de tu cita confirmada.',
    `Educador/a: ${p.providerName ?? 'Educador/a'}`,
    p.childName ? `Alumno/a: ${p.childName}` : null,
    `Horario: ${formatRange(p.appointmentStartsAt, p.appointmentEndsAt)}`,
    `Total pendiente: ${amount} ${p.currency.toUpperCase()}`,
    p.failureReason ? `Motivo: ${p.failureReason}` : null,
    '',
    'Por favor entra a Edify Academy y actualiza tu método de pago para evitar retrasos con la sesión.',
    '',
    '— Equipo Edify Academy',
  ]
    .filter((line): line is string => line != null)
    .join('\n');
}

export function buildPaymentFailedHtml(p: PaymentFailedMailPayload): string {
  const c = BRAND;
  const headerInk = `color:${c.headerText};-webkit-text-fill-color:${c.headerText};`;
  const greeting = `Hola${p.consumerName ? ` ${escapeHtml(p.consumerName)}` : ''},`;
  const amount = `${formatMoneyMinor(p.amountMinor, p.currency)} ${escapeHtml(
    p.currency.toUpperCase(),
  )}`;
  const child = p.childName
    ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Alumno/a:</strong> ${escapeHtml(p.childName)}</p>`
    : '';
  const reason = p.failureReason?.trim()
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:${c.danger};font-family:system-ui,-apple-system,sans-serif;"><strong>Motivo:</strong> ${escapeHtml(p.failureReason.trim())}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme:light;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<style type="text/css">
  :root { color-scheme: light only; }
  @media (prefers-color-scheme: dark) {
    td.payment-failed-header {
      background-color: ${c.primary} !important;
      background-image: linear-gradient(135deg, ${c.primary} 0%, ${c.primaryMid} 100%) !important;
    }
    td.payment-failed-header,
    td.payment-failed-header h1,
    td.payment-failed-header p {
      color: ${c.headerText} !important;
      -webkit-text-fill-color: ${c.headerText} !important;
    }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${c.bg};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${c.card};border-radius:16px;border:1px solid ${c.border};overflow:hidden;box-shadow:0 4px 24px rgba(11,31,58,0.08);">
          <tr>
            <td class="payment-failed-header" bgcolor="${c.primary}" style="background-color:${c.primary};background:linear-gradient(135deg,${c.primary} 0%,${c.primaryMid} 100%);padding:28px 28px 24px;color:${c.headerText};">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,-apple-system,sans-serif;${headerInk}">Edify Academy</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.25;font-weight:600;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;${headerInk}">Pago requerido para tu cita</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${c.bodyText};font-family:system-ui,-apple-system,sans-serif;">${greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">No pudimos procesar el pago de tu cita confirmada. Actualiza tu método de pago desde Edify Academy para evitar retrasos con la sesión.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 24px;">
                <tr>
                  <td style="border-left:4px solid ${c.danger};padding:12px 16px;background:${c.dangerBg};border-radius:0 10px 10px 0;">
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Total pendiente:</strong> ${amount}</p>
                    <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Educador/a:</strong> ${escapeHtml(p.providerName ?? 'Educador/a')}</p>
                    ${child}
                    <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Horario:</strong> ${escapeHtml(formatRange(p.appointmentStartsAt, p.appointmentEndsAt))}</p>
                    ${reason}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">Un cordial saludo,<br><span style="color:${c.primary};font-weight:600;">Equipo Edify Academy</span></p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:${c.footerHint};font-family:system-ui,-apple-system,sans-serif;">Este es un mensaje automático. Si ya actualizaste tu tarjeta, puedes ignorar este aviso.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
