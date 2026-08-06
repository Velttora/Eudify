import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  PayoutStatus,
  UserRole,
} from '@repo/database';
import { PLATFORM_DEFAULT_CURRENCY } from '@repo/currency';

import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

/** Connected accounts must match the product market. Immutable after Stripe create. */
const CONNECT_ACCOUNT_COUNTRY = 'CO' as const;

/**
 * CO connected accounts cannot request `card_payments` (local acquiring).
 * They receive funds via destination charges / transfers under the recipient
 * service agreement. See https://stripe.com/docs/connect/cross-border-payouts
 */
function isConnectOnboardingComplete(account: {
  details_submitted?: boolean | null;
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
}): boolean {
  // Recipient / transfers-only accounts often never set charges_enabled.
  return Boolean(account.details_submitted && account.payouts_enabled);
}

function isProviderConnectReady(row: {
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}): boolean {
  return row.detailsSubmitted && row.payoutsEnabled;
}

const DEFAULT_STATEMENT_DESCRIPTOR_SUFFIX = 'EUDIFY';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly stripeService: StripeService,
    private readonly mail: MailService,
  ) {}

  private platformFeeBps(): number {
    const configured = Number(process.env.PLATFORM_FEE_BPS ?? 500);
    if (!Number.isFinite(configured)) {
      return 500;
    }
    return Math.max(0, Math.min(2_000, Math.round(configured)));
  }

  // Las familias compran en Eudify, pero la cuenta de Stripe es de Velttora LLC.
  // Sin este sufijo el extracto solo dice VELTTORA y se dispara el chargeback por
  // "no reconozco el cargo". Stripe rechaza < > \ " ' y corta a 22 caracteres.
  private statementDescriptorSuffix(): string {
    const configured =
      process.env.STRIPE_STATEMENT_DESCRIPTOR_SUFFIX ??
      DEFAULT_STATEMENT_DESCRIPTOR_SUFFIX;
    const sanitized = configured.replace(/[<>\\"']/g, '').trim().slice(0, 22);
    return /[a-zA-Z]/.test(sanitized)
      ? sanitized
      : DEFAULT_STATEMENT_DESCRIPTOR_SUFFIX;
  }

  private async requireConsumer(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.CONSUMER || !user.consumerProfile) {
      throw new ForbiddenException('Consumer role required');
    }
    return user.consumerProfile;
  }

  private async requireProvider(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.PROVIDER || !user.providerProfile) {
      throw new ForbiddenException('Provider role required');
    }
    return user.providerProfile;
  }

  async ensureStripeCustomer(clerkUserId: string, consumerProfileId: string) {
    const existing = await this.prisma.stripeCustomer.findUnique({
      where: { consumerProfileId },
    });
    if (existing) {
      return existing;
    }
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { id: consumerProfileId },
      select: { fullName: true },
    });
    const email = user.email?.trim();
    if (!email) {
      throw new BadRequestException('Tu cuenta no tiene email para crear el cliente de pagos');
    }
    const nameFromProfile = profile?.fullName?.trim();
    const displayName =
      nameFromProfile && nameFromProfile.length > 0 ? nameFromProfile : undefined;

    const stripe = this.stripeService.getClient();
    const customer = await stripe.customers.create({
      email,
      ...(displayName ? { name: displayName } : {}),
      metadata: {
        consumerProfileId,
        trofoUserId: user.id,
        clerkUserId: user.clerkUserId,
      },
    });
    return this.prisma.stripeCustomer.create({
      data: {
        consumerProfileId,
        stripeCustomerId: customer.id,
      },
    });
  }

  async createSetupIntent(clerkUserId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    const stripeCustomer = await this.ensureStripeCustomer(clerkUserId, consumer.id);
    const stripe = this.stripeService.getClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomer.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        consumerProfileId: consumer.id,
      },
    });
    return {
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomer.stripeCustomerId,
    };
  }

  async listPaymentMethods(clerkUserId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    return this.prisma.paymentMethod.findMany({
      where: { consumerProfileId: consumer.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async syncPaymentMethod(clerkUserId: string, paymentMethodId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    const stripeCustomer = await this.ensureStripeCustomer(clerkUserId, consumer.id);
    const stripe = this.stripeService.getClient();
    const method = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (method.type !== 'card' || !method.card) {
      throw new BadRequestException('Only card payment methods are supported');
    }
    if (!method.customer) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.stripeCustomerId,
      });
    }
    if (
      typeof method.customer === 'string' &&
      method.customer !== stripeCustomer.stripeCustomerId
    ) {
      throw new ForbiddenException('Payment method does not belong to this customer');
    }
    const existingDefault = await this.prisma.paymentMethod.findFirst({
      where: {
        consumerProfileId: consumer.id,
        isDefault: true,
      },
    });
    const saved = await this.prisma.paymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethodId },
      create: {
        consumerProfileId: consumer.id,
        stripePaymentMethodId: paymentMethodId,
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
        isDefault: !existingDefault,
      },
      update: {
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
      },
    });
    if (saved.isDefault) {
      await stripe.customers.update(stripeCustomer.stripeCustomerId, {
        invoice_settings: { default_payment_method: saved.stripePaymentMethodId },
      });
    }
    return saved;
  }

  async setDefaultPaymentMethod(clerkUserId: string, paymentMethodId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        consumerProfileId: consumer.id,
      },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }
    const stripeCustomer = await this.ensureStripeCustomer(clerkUserId, consumer.id);
    const stripe = this.stripeService.getClient();
    await stripe.customers.update(stripeCustomer.stripeCustomerId, {
      invoice_settings: { default_payment_method: method.stripePaymentMethodId },
    });
    await this.prisma.$transaction([
      this.prisma.paymentMethod.updateMany({
        where: { consumerProfileId: consumer.id, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.paymentMethod.update({
        where: { id: method.id },
        data: { isDefault: true },
      }),
    ]);
    return { ok: true };
  }

  async deletePaymentMethod(clerkUserId: string, paymentMethodId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        consumerProfileId: consumer.id,
      },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    const stripeCustomer = await this.ensureStripeCustomer(clerkUserId, consumer.id);
    const stripe = this.stripeService.getClient();

    // Desvincula el payment method de Stripe customer para evitar cargos futuros accidentales.
    await stripe.paymentMethods.detach(method.stripePaymentMethodId).catch(() => null);

    await this.prisma.paymentMethod.delete({ where: { id: method.id } });

    if (!method.isDefault) {
      return { ok: true };
    }

    const nextDefault = await this.prisma.paymentMethod.findFirst({
      where: { consumerProfileId: consumer.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!nextDefault) {
      return { ok: true };
    }

    await this.prisma.paymentMethod.update({
      where: { id: nextDefault.id },
      data: { isDefault: true },
    });
    await stripe.customers.update(stripeCustomer.stripeCustomerId, {
      invoice_settings: { default_payment_method: nextDefault.stripePaymentMethodId },
    });
    return { ok: true };
  }

  async assertConsumerCanBook(clerkUserId: string) {
    const consumer = await this.requireConsumer(clerkUserId);
    const defaultMethod = await this.prisma.paymentMethod.findFirst({
      where: { consumerProfileId: consumer.id, isDefault: true },
      select: { id: true },
    });
    if (!defaultMethod) {
      throw new ForbiddenException(
        'Necesitas un método de pago válido para agendar una cita',
      );
    }
  }

  async createOrResumeConnectOnboarding(
    clerkUserId: string,
    refreshUrl: string,
    returnUrl: string,
  ) {
    const provider = await this.requireProvider(clerkUserId);
    const stripe = this.stripeService.getClient();
    let account = await this.prisma.stripeAccount.findUnique({
      where: { providerProfileId: provider.id },
    });

    // Testing (and future self-heal): country is locked at create time. Drop
    // incomplete non-CO accounts so educators can re-onboard under Colombia.
    if (account) {
      const remote = await stripe.accounts.retrieve(account.stripeAccountId);
      const remoteCountry = (remote.country ?? '').toUpperCase();
      const wrongCountry =
        Boolean(remoteCountry) && remoteCountry !== CONNECT_ACCOUNT_COUNTRY;

      if (wrongCountry) {
        if (remote.details_submitted) {
          throw new BadRequestException(
            'Esta cuenta de Stripe ya se creó en otro país. Contacta soporte para recrearla en Colombia (CO).',
          );
        }
        await this.prisma.stripeAccount.delete({ where: { id: account.id } });
        try {
          await stripe.accounts.del(account.stripeAccountId);
        } catch {
          // Account may already be deleted or restricted; recreate path is what matters.
        }
        account = null;
      }
    }

    if (!account) {
      // CO Express: transfers only + recipient agreement (no card_payments).
      // Charges run on the platform; funds move with transfer_data.destination.
      // See https://stripe.com/docs/connect/cross-border-payouts
      const created = await stripe.accounts.create({
        type: 'express',
        country: CONNECT_ACCOUNT_COUNTRY,
        default_currency: PLATFORM_DEFAULT_CURRENCY.toLowerCase(),
        capabilities: {
          transfers: { requested: true },
        },
        tos_acceptance: {
          service_agreement: 'recipient',
        },
        metadata: {
          providerProfileId: provider.id,
        },
      });
      account = await this.prisma.stripeAccount.create({
        data: {
          providerProfileId: provider.id,
          stripeAccountId: created.id,
          detailsSubmitted: created.details_submitted,
          chargesEnabled: created.charges_enabled,
          payoutsEnabled: created.payouts_enabled,
          onboardingComplete: isConnectOnboardingComplete(created),
        },
      });
    }
    const accountLink = await stripe.accountLinks.create({
      account: account.stripeAccountId,
      type: 'account_onboarding',
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });
    return {
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  }

  async getProviderStripeStatus(clerkUserId: string) {
    const provider = await this.requireProvider(clerkUserId);
    const existing = await this.prisma.stripeAccount.findUnique({
      where: { providerProfileId: provider.id },
    });
    if (!existing) {
      return {
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
      };
    }
    const stripe = this.stripeService.getClient();
    const account = await stripe.accounts.retrieve(existing.stripeAccountId);
    const updated = await this.prisma.stripeAccount.update({
      where: { id: existing.id },
      data: {
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: isConnectOnboardingComplete(account),
      },
    });
    return {
      connected: true,
      detailsSubmitted: updated.detailsSubmitted,
      chargesEnabled: updated.chargesEnabled,
      payoutsEnabled: updated.payoutsEnabled,
      onboardingComplete: updated.onboardingComplete,
    };
  }

  async requireProviderStripeReady(clerkUserId: string) {
    const status = await this.getProviderStripeStatus(clerkUserId);
    if (!status.onboardingComplete) {
      throw new ForbiddenException(
        'Conecta y completa tu cuenta de cobro para recibir pagos de las citas',
      );
    }
  }

  async chargeAppointmentOnProviderAccept(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        consumerProfile: true,
        providerProfile: true,
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (!appointment.quotedPriceMinor || !appointment.quotedCurrency) {
      throw new BadRequestException(
        'La cita no tiene precio cotizado para cobro automático',
      );
    }
    const stripeCustomer = await this.prisma.stripeCustomer.findUnique({
      where: { consumerProfileId: appointment.consumerProfileId },
    });
    if (!stripeCustomer) {
      throw new BadRequestException('La familia no tiene customer de pagos');
    }
    const defaultMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        consumerProfileId: appointment.consumerProfileId,
        isDefault: true,
      },
    });
    if (!defaultMethod) {
      throw new BadRequestException('La familia no tiene método de pago por defecto');
    }
    const stripeAccount = await this.prisma.stripeAccount.findUnique({
      where: { providerProfileId: appointment.providerProfileId },
    });
    // TODO: Re-activar esta validación al finalizar pruebas de chat.
    // Recipient CO accounts receive transfers only; charges_enabled may stay false.
    if (!stripeAccount || !isProviderConnectReady(stripeAccount)) {
      throw new BadRequestException(
        'El educador no tiene cuenta de cobro lista para recibir pagos',
      );
    }
    const amountMinor = appointment.quotedPriceMinor;
    const feeBps = this.platformFeeBps();
    const platformFeeMinor = Math.round((amountMinor * feeBps) / 10_000);
    const providerAmountMinor = amountMinor - platformFeeMinor;

    const existing = await this.prisma.payment.findUnique({
      where: { appointmentId },
    });
    if (existing?.status === PaymentStatus.SUCCEEDED) {
      return existing;
    }
    const idempotencyKey = existing?.idempotencyKey ?? `appt_${appointmentId}_capture_v1`;
    const payment =
      existing ??
      (await this.prisma.payment.create({
        data: {
          appointmentId,
          consumerProfileId: appointment.consumerProfileId,
          providerProfileId: appointment.providerProfileId,
          amountMinor,
          currency: appointment.quotedCurrency,
          platformFeeBps: feeBps,
          platformFeeMinor,
          providerAmountMinor,
          status: PaymentStatus.PROCESSING,
          idempotencyKey,
        },
      }));

    if (existing && existing.status !== PaymentStatus.PROCESSING) {
      await this.prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: PaymentStatus.PROCESSING,
          failureReason: null,
        },
      });
    }

    const stripe = this.stripeService.getClient();
    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountMinor,
          currency: appointment.quotedCurrency.toLowerCase(),
          customer: stripeCustomer.stripeCustomerId,
          payment_method: defaultMethod.stripePaymentMethodId,
          confirm: true,
          off_session: true,
          application_fee_amount: platformFeeMinor,
          transfer_data: {
            destination: stripeAccount.stripeAccountId,
          },
          statement_descriptor_suffix: this.statementDescriptorSuffix(),
          metadata: {
            appointmentId,
            paymentId: payment.id,
            providerProfileId: appointment.providerProfileId,
            consumerProfileId: appointment.consumerProfileId,
          },
        },
        { idempotencyKey },
      );

      const chargeId =
        typeof intent.latest_charge === 'string' ? intent.latest_charge : null;
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentIntentId: intent.id,
          stripeChargeId: chargeId,
          status: PaymentStatus.SUCCEEDED,
          processedAt: new Date(),
        },
      });
      await this.prisma.payout.upsert({
        where: { paymentId: payment.id },
        create: {
          paymentId: payment.id,
          providerProfileId: appointment.providerProfileId,
          stripeAccountId: stripeAccount.stripeAccountId,
          amountMinor: providerAmountMinor,
          currency: appointment.quotedCurrency,
          status: PayoutStatus.PENDING,
        },
        update: {
          status: PayoutStatus.PENDING,
          failureReason: null,
        },
      });
      return updatedPayment;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: message,
        },
      });
      await this.notifyConsumerPaymentFailed(payment.id, message);
      return this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    }
  }

  async handleStripePaymentIntentSucceeded(
    paymentIntentId: string,
    chargeId?: string | null,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment) return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        stripeChargeId: chargeId ?? payment.stripeChargeId,
        processedAt: new Date(),
        failureReason: null,
      },
    });
  }

  async handleStripePaymentIntentFailed(paymentIntentId: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment) return;
    const wasAlreadyFailed = payment.status === PaymentStatus.FAILED;
    const failureReason = reason?.slice(0, 500) ?? 'payment_intent.payment_failed';
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
      },
    });
    if (!wasAlreadyFailed) {
      await this.notifyConsumerPaymentFailed(payment.id, failureReason);
    }
  }

  private async notifyConsumerPaymentFailed(
    paymentId: string,
    failureReason: string | null,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            child: { select: { firstName: true } },
          },
        },
        consumerProfile: {
          include: { user: { select: { email: true } } },
        },
        providerProfile: {
          select: { fullName: true },
        },
      },
    });
    const email = payment?.consumerProfile.user.email?.trim();
    if (!payment || !email) return;

    await this.mail.notifyPaymentFailed(email, {
      consumerName: payment.consumerProfile.fullName,
      providerName: payment.providerProfile.fullName,
      childName: payment.appointment.child?.firstName ?? null,
      appointmentStartsAt: payment.appointment.startsAt,
      appointmentEndsAt: payment.appointment.endsAt,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      failureReason,
    });
  }

  async handleStripeAccountUpdated(data: {
    accountId: string;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }) {
    const existing = await this.prisma.stripeAccount.findFirst({
      where: { stripeAccountId: data.accountId },
    });
    if (!existing) return;
    await this.prisma.stripeAccount.update({
      where: { id: existing.id },
      data: {
        detailsSubmitted: data.detailsSubmitted,
        chargesEnabled: data.chargesEnabled,
        payoutsEnabled: data.payoutsEnabled,
        onboardingComplete: isConnectOnboardingComplete({
          details_submitted: data.detailsSubmitted,
          charges_enabled: data.chargesEnabled,
          payouts_enabled: data.payoutsEnabled,
        }),
      },
    });
  }

  private clampTake(take?: number) {
    const n = take == null ? 40 : Math.floor(Number(take));
    if (!Number.isFinite(n)) return 40;
    return Math.max(1, Math.min(100, n));
  }

  async listConsumerPaymentHistory(clerkUserId: string, take?: number) {
    const consumer = await this.requireConsumer(clerkUserId);
    const items = await this.prisma.payment.findMany({
      where: { consumerProfileId: consumer.id },
      orderBy: { createdAt: 'desc' },
      take: this.clampTake(take),
      include: {
        appointment: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            offerTitleSnapshot: true,
            providerOffer: { select: { title: true } },
          },
        },
        providerProfile: { select: { id: true, fullName: true } },
      },
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        failureReason: p.failureReason,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
        hasReceipt: p.status === PaymentStatus.SUCCEEDED,
        appointment: {
          id: p.appointment.id,
          startsAt: p.appointment.startsAt,
          endsAt: p.appointment.endsAt,
          status: p.appointment.status,
          title:
            p.appointment.offerTitleSnapshot?.trim() ||
            p.appointment.providerOffer?.title?.trim() ||
            null,
        },
        counterpartyName: p.providerProfile.fullName,
        counterpartyRole: 'PROVIDER' as const,
        netAmountMinor: p.amountMinor,
      })),
    };
  }

  async listProviderPaymentHistory(clerkUserId: string, take?: number) {
    const provider = await this.requireProvider(clerkUserId);
    const items = await this.prisma.payment.findMany({
      where: { providerProfileId: provider.id },
      orderBy: { createdAt: 'desc' },
      take: this.clampTake(take),
      include: {
        appointment: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            status: true,
            offerTitleSnapshot: true,
            providerOffer: { select: { title: true } },
          },
        },
        consumerProfile: { select: { id: true, fullName: true } },
        payout: {
          select: {
            status: true,
            amountMinor: true,
            paidAt: true,
          },
        },
      },
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        failureReason: p.failureReason,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
        hasReceipt: p.status === PaymentStatus.SUCCEEDED,
        platformFeeMinor: p.platformFeeMinor,
        providerAmountMinor: p.providerAmountMinor,
        payoutStatus: p.payout?.status ?? null,
        appointment: {
          id: p.appointment.id,
          startsAt: p.appointment.startsAt,
          endsAt: p.appointment.endsAt,
          status: p.appointment.status,
          title:
            p.appointment.offerTitleSnapshot?.trim() ||
            p.appointment.providerOffer?.title?.trim() ||
            null,
        },
        counterpartyName: p.consumerProfile.fullName,
        counterpartyRole: 'CONSUMER' as const,
        netAmountMinor: p.providerAmountMinor,
      })),
    };
  }

  async getPaymentReceiptUrl(clerkUserId: string, paymentId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        stripePaymentIntentId: true,
        stripeChargeId: true,
        consumerProfileId: true,
        providerProfileId: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const isConsumer =
      user.role === UserRole.CONSUMER &&
      user.consumerProfile?.id === payment.consumerProfileId;
    const isProvider =
      user.role === UserRole.PROVIDER &&
      user.providerProfile?.id === payment.providerProfileId;
    if (!isConsumer && !isProvider) {
      throw new ForbiddenException('No puedes ver este comprobante');
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        'Solo los pagos confirmados tienen comprobante de Stripe',
      );
    }

    const stripe = this.stripeService.getClient();
    let receiptUrl: string | null = null;

    if (payment.stripeChargeId) {
      const charge = await stripe.charges.retrieve(payment.stripeChargeId);
      receiptUrl = charge.receipt_url ?? null;
    } else if (payment.stripePaymentIntentId) {
      const intent = await stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
        { expand: ['latest_charge'] },
      );
      const latest = intent.latest_charge;
      if (latest && typeof latest !== 'string') {
        receiptUrl = latest.receipt_url ?? null;
        if (latest.id && !payment.stripeChargeId) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { stripeChargeId: latest.id },
          });
        }
      }
    }

    if (!receiptUrl) {
      throw new NotFoundException(
        'Stripe aún no tiene un recibo descargable para este cargo',
      );
    }
    return { url: receiptUrl };
  }
}
