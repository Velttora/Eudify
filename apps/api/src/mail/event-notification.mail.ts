/** Correos transaccionales por eventos de citas / chat. */

const BRAND = {
  primary: "#0b1f3a",
  muted: "#5f6b7a",
  bg: "#f7f9fc",
  card: "#ffffff",
  border: "#e6e8ec",
  bodyText: "#2b2b2b",
  headerText: "#fffffe",
  footerHint: "#9aa5b1",
} as const;

export type EventNotificationMailPayload = {
  subject: string;
  greetingName: string | null;
  title: string;
  bodyLines: string[];
  ctaLabel: string;
  ctaUrl: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildEventNotificationPlainText(
  p: EventNotificationMailPayload,
): string {
  const greeting = `Hola${p.greetingName ? ` ${p.greetingName}` : ""},`;
  const lines = [
    greeting,
    "",
    p.title,
    "",
    ...p.bodyLines,
    "",
    p.ctaUrl ? `${p.ctaLabel}: ${p.ctaUrl}` : null,
    "",
    "— Equipo Eudify",
  ].filter((line): line is string => line != null);
  return lines.join("\n");
}

export function buildEventNotificationHtml(
  p: EventNotificationMailPayload,
): string {
  const greeting = `Hola${p.greetingName ? ` ${escapeHtml(p.greetingName)}` : ""},`;
  const bodyHtml = p.bodyLines
    .map((line) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(line)}</p>`)
    .join("");
  const cta =
    p.ctaUrl
      ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(p.ctaUrl)}" style="display:inline-block;background:${BRAND.primary};color:${BRAND.headerText};text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;">${escapeHtml(p.ctaLabel)}</a></p>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <tr><td style="background:${BRAND.primary};padding:18px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.headerText};">Eudify</p>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 8px;font-size:15px;color:${BRAND.bodyText};">${greeting}</p>
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${BRAND.primary};">${escapeHtml(p.title)}</h1>
          ${bodyHtml}
          ${cta}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid ${BRAND.border};">
          <p style="margin:0;font-size:12px;color:${BRAND.footerHint};">Este mensaje se envió porque tienes una cuenta en Eudify.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
