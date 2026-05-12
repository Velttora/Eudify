/** Correo de acuse al usuario tras enviar sugerencia o queja (formulario flotante). */

export const PUBLIC_FEEDBACK_ACK_SUBJECT = '[Edify Academy] Recibimos tu mensaje';

const BRAND = {
  primary: '#0b1f3a',
  primaryMid: '#1f3c88',
  accent: '#2ec4b6',
  muted: '#5f6b7a',
  bg: '#f7f9fc',
  card: '#ffffff',
  border: '#e6e8ec',
  footerHint: '#9aa5b1',
  bodyText: '#2b2b2b',
  /** Casi blanco: muchos clientes en modo oscuro remapean #fff; #fffffe suele conservarse. */
  headerText: '#fffffe',
} as const;

function copyForKind(kind: 'suggestion' | 'complaint') {
  if (kind === 'suggestion') {
    return {
      headline: 'Recibimos tu sugerencia',
      lead:
        'Gracias por tomarte el tiempo de compartir ideas con nosotros. Tu opinión nos ayuda a construir una mejor experiencia para familias y educadores.',
      kindPhrase: 'tu sugerencia',
    };
  }
  return {
    headline: 'Recibimos tu mensaje',
    lead:
      'Gracias por hacérnoslo saber. Tomamos en serio cada reporte y cada queja: nuestro equipo revisará lo que nos contaste con cuidado.',
    kindPhrase: 'tu mensaje (queja o inquietud)',
  };
}

export function buildPublicFeedbackAckPlainText(
  kind: 'suggestion' | 'complaint',
): string {
  const { kindPhrase } = copyForKind(kind);
  return [
    'Hola,',
    '',
    `Gracias por escribirnos. Hemos recibido ${kindPhrase} y lo tendremos presente.`,
    'Nuestro equipo lo revisará con atención; si necesitamos más detalle, te contactaremos a esta dirección.',
    '',
    'Apreciamos que nos ayudes a mejorar Edify Academy.',
    '',
    '— Equipo Edify Academy',
  ].join('\n');
}

export function buildPublicFeedbackAckHtml(
  kind: 'suggestion' | 'complaint',
): string {
  const { headline, lead } = copyForKind(kind);
  const c = BRAND;

  const headerInk = `color:${c.headerText};-webkit-text-fill-color:${c.headerText};`;

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
    td.feedback-ack-header {
      background-color: ${c.primary} !important;
      background-image: linear-gradient(135deg, ${c.primary} 0%, ${c.primaryMid} 100%) !important;
    }
    td.feedback-ack-header,
    td.feedback-ack-header h1,
    td.feedback-ack-header p {
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
            <td class="feedback-ack-header" bgcolor="${c.primary}" style="background-color:${c.primary};background:linear-gradient(135deg,${c.primary} 0%,${c.primaryMid} 100%);padding:28px 28px 24px;color:${c.headerText};">
              <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:system-ui,-apple-system,sans-serif;${headerInk}">Edify Academy</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.25;font-weight:600;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;${headerInk}">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${c.bodyText};font-family:system-ui,-apple-system,sans-serif;">Hola,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">${lead}</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${c.muted};font-family:system-ui,-apple-system,sans-serif;">Estaremos trabajando en ello. Si hace falta algún dato adicional, te escribiremos a esta misma dirección de correo.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 24px;">
                <tr>
                  <td style="border-left:4px solid ${c.accent};padding:12px 16px;background:${c.bg};border-radius:0 10px 10px 0;">
                    <p style="margin:0;font-size:14px;line-height:1.55;color:${c.primary};font-family:system-ui,-apple-system,sans-serif;"><strong>¿Necesitas ayuda urgente?</strong> Responderemos lo antes posible; gracias por tu paciencia.</p>
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
        <p style="margin:20px 0 0;font-size:11px;color:${c.footerHint};font-family:system-ui,-apple-system,sans-serif;">Este es un mensaje automático. Si quieres ampliar tu mensaje, puedes responder a este correo y llegará a nuestro equipo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
