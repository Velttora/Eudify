/** Correo de acuse al usuario tras abrir una ayuda o PQR. */

export function supportTicketAckSubject(formalComplaint: boolean): string {
  return formalComplaint
    ? "[Eudify Academy] Recibimos tu PQR"
    : "[Eudify Academy] Recibimos tu solicitud de ayuda";
}

const BRAND = {
  primary: "#0b1f3a",
  primaryMid: "#1f3c88",
  accent: "#2ec4b6",
  muted: "#5f6b7a",
  bg: "#f7f9fc",
  card: "#ffffff",
  border: "#e6e8ec",
  footerHint: "#9aa5b1",
  bodyText: "#2b2b2b",
  /** Casi blanco: muchos clientes en modo oscuro remapean #fff; #fffffe suele conservarse. */
  headerText: "#fffffe",
} as const;

type SupportTicketAckPayload = {
  ticketId: string;
  categoryLabel: string;
  formalComplaint: boolean;
  formalTrackingNumber: string | null;
  creatorName: string | null;
  initialMessage?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function copyForTicket(formalComplaint: boolean) {
  if (formalComplaint) {
    return {
      headline: "Recibimos tu PQR",
      lead: "Gracias por escribirnos. Registramos tu PQR y nuestro equipo revisará tu caso con atención.",
      kindPhrase: "tu PQR",
      nextStep:
        "Puedes hacer seguimiento desde la app. Si necesitamos información adicional, te escribiremos a este correo.",
    };
  }

  return {
    headline: "Recibimos tu solicitud de ayuda",
    lead: "Gracias por contactarnos. Registramos tu solicitud de ayuda y nuestro equipo la revisará lo antes posible.",
    kindPhrase: "tu solicitud de ayuda",
    nextStep:
      "Puedes seguir el hilo desde la app. Si necesitamos más detalle, te contactaremos por este mismo correo.",
  };
}

export function buildSupportTicketAckPlainText(
  p: SupportTicketAckPayload,
): string {
  const { kindPhrase, nextStep } = copyForTicket(p.formalComplaint);
  const greeting = `Hola${p.creatorName ? ` ${p.creatorName}` : ""},`;
  const lines = [
    greeting,
    "",
    `Gracias por escribirnos. Hemos recibido ${kindPhrase}.`,
    `Ticket: ${p.ticketId}`,
    `Categoría: ${p.categoryLabel}.`,
    p.formalTrackingNumber
      ? `Número de seguimiento (PQR): ${p.formalTrackingNumber}`
      : null,
    p.initialMessage?.trim()
      ? `Detalle enviado:\n${p.initialMessage.trim()}`
      : null,
    "",
    nextStep,
    "",
    "— Equipo Eudify Academy",
  ];

  return lines.filter((line): line is string => line != null).join("\n");
}

export function buildSupportTicketAckHtml(p: SupportTicketAckPayload): string {
  const { headline, lead, nextStep } = copyForTicket(p.formalComplaint);
  const c = BRAND;
  const headerInk = `color:${c.headerText};-webkit-text-fill-color:${c.headerText};`;
  const greeting = `Hola${p.creatorName ? ` ${escapeHtml(p.creatorName)}` : ""},`;
  const tracking = p.formalTrackingNumber
    ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Seguimiento PQR:</strong> ${escapeHtml(p.formalTrackingNumber)}</p>`
    : "";
  const detail = p.initialMessage?.trim()
    ? `<tr>
        <td style="padding:0 28px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">Detalle enviado</p>
          <p style="margin:0;white-space:pre-wrap;font-size:14px;line-height:1.6;color:${c.bodyText};font-family:system-ui,-apple-system,sans-serif;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 14px;">${escapeHtml(p.initialMessage.trim())}</p>
        </td>
      </tr>`
    : "";

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
    td.support-ack-header {
      background-color: ${c.primary} !important;
      background-image: linear-gradient(135deg, ${c.primary} 0%, ${c.primaryMid} 100%) !important;
    }
    td.support-ack-header,
    td.support-ack-header h1,
    td.support-ack-header p {
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
            <td class="support-ack-header" bgcolor="${c.primary}" style="background-color:${c.primary};background:linear-gradient(135deg,${c.primary} 0%,${c.primaryMid} 100%);padding:28px 28px 24px;color:${c.headerText};">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,-apple-system,sans-serif;${headerInk}">Eudify Academy</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.25;font-weight:600;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;${headerInk}">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${c.bodyText};font-family:system-ui,-apple-system,sans-serif;">${greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">${lead}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 24px;">
                <tr>
                  <td style="border-left:4px solid ${c.accent};padding:12px 16px;background:${c.bg};border-radius:0 10px 10px 0;">
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Ticket:</strong> ${escapeHtml(p.ticketId)}</p>
                    <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>Categoría:</strong> ${escapeHtml(p.categoryLabel)}</p>
                    ${tracking}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${detail}
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">${nextStep}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">Un cordial saludo,<br><span style="color:${c.primary};font-weight:600;">Equipo Eudify Academy</span></p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:${c.footerHint};font-family:system-ui,-apple-system,sans-serif;">Este es un mensaje automático. Si quieres ampliar tu caso, puedes responder a este correo y llegará a nuestro equipo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
