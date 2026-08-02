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

import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

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
    if (!account) {
      const created = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
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
          onboardingComplete:
            created.details_submitted &&
            created.charges_enabled &&
            created.payouts_enabled,
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
        onboardingComplete:
          account.details_submitted &&
          account.charges_enabled &&
          account.payouts_enabled,
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
        'Conecta y completa tu cuenta de cobro para publicar disponibilidad u ofertas',
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
    if (
      !stripeAccount ||
      !stripeAccount.chargesEnabled ||
      !stripeAccount.payoutsEnabled
    ) {
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
        onboardingComplete:
          data.detailsSubmitted && data.chargesEnabled && data.payoutsEnabled,
      },
    });
  }
}
