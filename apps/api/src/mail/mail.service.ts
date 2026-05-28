import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

import {
  buildPaymentFailedHtml,
  buildPaymentFailedPlainText,
  PAYMENT_FAILED_SUBJECT,
  type PaymentFailedMailPayload,
} from "./payment-failed.mail";
import {
  buildPublicFeedbackAckHtml,
  buildPublicFeedbackAckPlainText,
  PUBLIC_FEEDBACK_ACK_SUBJECT,
} from "./public-feedback-ack.mail";
import {
  buildSupportTicketAckHtml,
  buildSupportTicketAckPlainText,
  supportTicketAckSubject,
} from "./support-ticket-ack.mail";

const DEFAULT_SUPPORT_INBOX = "camiloavict+eudify@gmail.com";
/** PQR y formulario flotante (sugerencias / quejas). */
const DEFAULT_ACADEMY_CONTACT = "contacto@eudify.co";

export type TicketCreatedMailPayload = {
  ticketId: string;
  appointmentId: string;
  categoryLabel: string;
  categoryCode: string;
  status: string;
  formalComplaint: boolean;
  formalTrackingNumber: string | null;
  creatorEmail: string;
  creatorName: string | null;
  consumerEmail: string;
  consumerName: string | null;
  providerEmail: string;
  providerName: string | null;
  initialMessage?: string | null;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        "SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS): los avisos de ticket no se envían por correo.",
      );
    }
  }

  isConfigured(): boolean {
    return this.transporter != null;
  }

  private fromAddress(): string {
    return (
      process.env.MAIL_FROM?.trim() ??
      process.env.SMTP_USER?.trim() ??
      "noreply@trofoschool.local"
    );
  }

  supportInbox(): string {
    return process.env.SUPPORT_NOTIFY_EMAIL?.trim() ?? DEFAULT_SUPPORT_INBOX;
  }

  /** Bandeja de reclamaciones formales (PQR) y contacto Eudify Academy. */
  academyContactInbox(): string {
    return (
      process.env.ACADEMY_CONTACT_EMAIL?.trim() ??
      process.env.PQR_NOTIFY_EMAIL?.trim() ??
      DEFAULT_ACADEMY_CONTACT
    );
  }

  private staffInboxForTicket(formalComplaint: boolean): string {
    return formalComplaint ? this.academyContactInbox() : this.supportInbox();
  }

  private async sendSafe(
    to: string,
    subject: string,
    text: string,
    html?: string,
    replyTo?: string,
  ): Promise<void> {
    if (!this.transporter) return;
    const t = to.trim().toLowerCase();
    if (!t || !t.includes("@")) return;
    const rt = replyTo?.trim();
    try {
      await this.transporter.sendMail({
        from: this.fromAddress(),
        to: t,
        subject,
        text,
        ...(html ? { html } : {}),
        ...(rt ? { replyTo: rt } : {}),
      });
      this.logger.log(`Correo enviado a ${t}: ${subject.slice(0, 40)}…`);
    } catch (err) {
      this.logger.error(
        `No se pudo enviar correo a ${t}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Aviso a soporte + creador + familia + educador (sin duplicar misma dirección). */
  async notifyTicketCreated(p: TicketCreatedMailPayload): Promise<void> {
    const trimmedMsg = p.initialMessage?.trim();
    const detailBlock = trimmedMsg ? `\n\nDetalle enviado:\n${trimmedMsg}` : "";

    const staffTo = this.staffInboxForTicket(p.formalComplaint);
    const linesCommon = [
      `Ticket: ${p.ticketId}`,
      `Cita: ${p.appointmentId}`,
      `Categoría: ${p.categoryLabel} (${p.categoryCode})`,
      `Estado: ${p.status}`,
      p.formalComplaint && p.formalTrackingNumber
        ? `PQR / seguimiento: ${p.formalTrackingNumber}`
        : null,
      p.initialMessage?.trim()
        ? `Mensaje inicial:\n${p.initialMessage.trim()}`
        : null,
      "",
      `Quién abrió el ticket: ${p.creatorName ?? "—"} <${p.creatorEmail}>`,
      `Familia (cuenta): ${p.consumerName ?? "—"} <${p.consumerEmail}>`,
      `Educador (cuenta): ${p.providerName ?? "—"} <${p.providerEmail}>`,
    ]
      .filter(Boolean)
      .join("\n");

    const staffSubject = p.formalComplaint
      ? `[Eudify] PQR / ticket formal · ${p.categoryCode}`
      : `[Eudify] Nuevo ticket de soporte · ${p.categoryCode}`;
    const staffIntro = p.formalComplaint
      ? "Hay una nueva reclamación formal (PQR) en Eudify.\n\n"
      : "Hay un nuevo ticket en Eudify.\n\n";

    await this.sendSafe(staffTo, staffSubject, `${staffIntro}${linesCommon}`);

    const norm = (e: string) => e.trim().toLowerCase();

    type Recipient = {
      email: string;
      subject: string;
      body: string;
      html?: string;
      replyTo?: string;
    };
    const out: Recipient[] = [];

    const creatorNorm = norm(p.creatorEmail);
    const creatorAck = {
      ticketId: p.ticketId,
      categoryLabel: p.categoryLabel,
      formalComplaint: p.formalComplaint,
      formalTrackingNumber: p.formalTrackingNumber,
      creatorName: p.creatorName,
      initialMessage: p.initialMessage,
    };
    out.push({
      email: p.creatorEmail,
      subject: supportTicketAckSubject(p.formalComplaint),
      body: buildSupportTicketAckPlainText(creatorAck),
      html: buildSupportTicketAckHtml(creatorAck),
      replyTo: staffTo,
    });

    if (norm(p.consumerEmail) !== creatorNorm) {
      out.push({
        email: p.consumerEmail,
        subject: "[Eudify] Aviso sobre una cita (ticket de soporte)",
        body:
          `Hola${p.consumerName ? ` ${p.consumerName}` : ""},\n\n` +
          `Se ha abierto un ticket de soporte vinculado a una cita en la que participas.\n` +
          `Categoría: ${p.categoryLabel}.\n` +
          `Quien lo abrió: ${p.creatorName ?? p.creatorEmail}.\n` +
          (p.formalTrackingNumber
            ? `Seguimiento formal: ${p.formalTrackingNumber}\n`
            : "") +
          detailBlock +
          `\n\nID del ticket: ${p.ticketId}\n\n` +
          `— Eudify`,
      });
    }

    const providerNorm = norm(p.providerEmail);
    if (
      providerNorm !== creatorNorm &&
      providerNorm !== norm(p.consumerEmail)
    ) {
      out.push({
        email: p.providerEmail,
        subject: "[Eudify] Aviso sobre una cita (ticket de soporte)",
        body:
          `Hola${p.providerName ? ` ${p.providerName}` : ""},\n\n` +
          `Se ha abierto un ticket de soporte vinculado a una cita en la que participas.\n` +
          `Categoría: ${p.categoryLabel}.\n` +
          `Quien lo abrió: ${p.creatorName ?? p.creatorEmail}.\n` +
          (p.formalTrackingNumber
            ? `Seguimiento formal: ${p.formalTrackingNumber}\n`
            : "") +
          detailBlock +
          `\n\nID del ticket: ${p.ticketId}\n\n` +
          `— Eudify`,
      });
    }

    const sent = new Set<string>();
    for (const r of out) {
      const k = norm(r.email);
      if (sent.has(k)) continue;
      sent.add(k);
      await this.sendSafe(r.email, r.subject, r.body, r.html, r.replyTo);
    }
  }

  async notifyPaymentFailed(
    email: string,
    payload: PaymentFailedMailPayload,
  ): Promise<void> {
    await this.sendSafe(
      email,
      PAYMENT_FAILED_SUBJECT,
      buildPaymentFailedPlainText(payload),
      buildPaymentFailedHtml(payload),
      this.supportInbox(),
    );
  }

  /** Formulario global (sugerencias / quejas) → bandeja de la academia. */
  async notifyPublicFeedback(p: {
    kind: "suggestion" | "complaint";
    message: string;
    contactEmail: string | null;
    sourcePath: string | null;
    clerkUserIdHint: string | null;
  }): Promise<void> {
    const to = this.academyContactInbox();
    const label = p.kind === "suggestion" ? "Sugerencia" : "Queja";
    const lines = [
      `${label} desde la app web`,
      "",
      p.message,
      "",
      p.contactEmail
        ? `Correo de contacto: ${p.contactEmail}`
        : "Sin correo de contacto indicado.",
      p.clerkUserIdHint ? `Usuario (Clerk): ${p.clerkUserIdHint}` : null,
      p.sourcePath ? `Origen: ${p.sourcePath}` : null,
      "",
      "— Eudify (formulario flotante)",
    ]
      .filter(Boolean)
      .join("\n");

    await this.sendSafe(to, `[Eudify] ${label} · app`, lines);

    const userEmail = p.contactEmail?.trim();
    if (!userEmail) return;

    await this.sendSafe(
      userEmail,
      PUBLIC_FEEDBACK_ACK_SUBJECT,
      buildPublicFeedbackAckPlainText(p.kind),
      buildPublicFeedbackAckHtml(p.kind),
      this.academyContactInbox(),
    );
  }
}
