import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConsumerPlan, SubscriptionStatus, UserRole } from '@repo/database';
import Stripe from 'stripe';

import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { UsersService } from '../users/users.service';
import { planMeetsMinimum } from './plan-rank';

const STATUS_BY_STRIPE_STATUS: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  trialing: SubscriptionStatus.TRIALING,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.INCOMPLETE,
  unpaid: SubscriptionStatus.INCOMPLETE,
  paused: SubscriptionStatus.INCOMPLETE,
};

/** Estados en los que la familia realmente tiene acceso a los beneficios de su plan pago. */
const ACCESS_GRANTING_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
]);

export type MyPlanResult = {
  plan: ConsumerPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

const FREE_PLAN_RESULT: MyPlanResult = {
  plan: ConsumerPlan.SEMILLA,
  status: SubscriptionStatus.ACTIVE,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  private async requireConsumer(clerkUserId: string) {
    const user = await this.users.findByClerkOrThrow(clerkUserId);
    if (user.role !== UserRole.CONSUMER || !user.consumerProfile) {
      throw new ForbiddenException('Consumer role required');
    }
    return user.consumerProfile;
  }

  private priceIdForPlan(plan: ConsumerPlan): string {
    const envKey =
      plan === ConsumerPlan.FAMILIA
        ? 'STRIPE_PRICE_FAMILIA'
        : plan === ConsumerPlan.FAMILIA_PLUS
          ? 'STRIPE_PRICE_FAMILIA_PLUS'
          : null;
    const priceId = envKey ? process.env[envKey] : undefined;
    if (!envKey || !priceId) {
      throw new BadRequestException(
        `No hay un precio de Stripe configurado para el plan ${plan}`,
      );
    }
    return priceId;
  }

  private planForPriceId(priceId: string | undefined): ConsumerPlan | null {
    if (!priceId) return null;
    if (priceId === process.env.STRIPE_PRICE_FAMILIA) return ConsumerPlan.FAMILIA;
    if (priceId === process.env.STRIPE_PRICE_FAMILIA_PLUS) return ConsumerPlan.FAMILIA_PLUS;
    return null;
  }

  /** Usada por el guard: da acceso si el plan alcanza el mínimo Y la suscripción está en un estado vigente. */
  hasPlanAccess(current: MyPlanResult, minimumPlan: ConsumerPlan): boolean {
    if (minimumPlan === ConsumerPlan.SEMILLA) return true;
    if (!ACCESS_GRANTING_STATUSES.has(current.status)) return false;
    return planMeetsMinimum(current.plan, minimumPlan);
  }

  async getPlanForClerkUser(clerkUserId: string): Promise<MyPlanResult> {
    const consumer = await this.requireConsumer(clerkUserId);
    return this.getPlanForConsumerProfile(consumer.id);
  }

  async getPlanForConsumerProfile(consumerProfileId: string): Promise<MyPlanResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { consumerProfileId },
    });
    if (!subscription) return FREE_PLAN_RESULT;
    return {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async subscribeToPlan(clerkUserId: string, plan: ConsumerPlan): Promise<MyPlanResult> {
    if (plan === ConsumerPlan.SEMILLA) {
      throw new BadRequestException(
        'SEMILLA es el plan gratuito por defecto; usa /v1/subscriptions/cancel para volver a él',
      );
    }
    const consumer = await this.requireConsumer(clerkUserId);
    const stripeCustomer = await this.payments.ensureStripeCustomer(clerkUserId, consumer.id);
    const defaultMethod = await this.prisma.paymentMethod.findFirst({
      where: { consumerProfileId: consumer.id, isDefault: true },
    });
    if (!defaultMethod) {
      throw new BadRequestException('Agrega un método de pago antes de suscribirte a un plan');
    }
    const priceId = this.priceIdForPlan(plan);
    const stripe = this.stripeService.getClient();
    const existing = await this.prisma.subscription.findUnique({
      where: { consumerProfileId: consumer.id },
    });

    let stripeSubscription: Stripe.Subscription;
    if (existing?.stripeSubscriptionId && existing.status !== SubscriptionStatus.CANCELED) {
      if (!existing.stripeSubscriptionItemId) {
        throw new BadRequestException(
          'La suscripción existente no tiene un ítem de facturación válido; contacta soporte',
        );
      }
      stripeSubscription = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        items: [{ id: existing.stripeSubscriptionItemId, price: priceId }],
        proration_behavior: 'create_prorations',
        default_payment_method: defaultMethod.stripePaymentMethodId,
      });
    } else {
      stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomer.stripeCustomerId,
        items: [{ price: priceId }],
        default_payment_method: defaultMethod.stripePaymentMethodId,
        payment_behavior: 'error_if_incomplete',
        metadata: { consumerProfileId: consumer.id, plan },
      });
    }

    return this.syncFromStripeSubscription(consumer.id, stripeSubscription, plan);
  }

  async cancelSubscription(clerkUserId: string): Promise<MyPlanResult> {
    const consumer = await this.requireConsumer(clerkUserId);
    const existing = await this.prisma.subscription.findUnique({
      where: { consumerProfileId: consumer.id },
    });
    if (!existing?.stripeSubscriptionId || existing.status === SubscriptionStatus.CANCELED) {
      return FREE_PLAN_RESULT;
    }
    const stripe = this.stripeService.getClient();
    const stripeSubscription = await stripe.subscriptions.update(existing.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return this.syncFromStripeSubscription(consumer.id, stripeSubscription, existing.plan);
  }

  /** Punto único de sincronización: lo usan subscribeToPlan/cancelSubscription y los webhooks de Stripe. */
  async syncFromStripeSubscription(
    consumerProfileId: string,
    stripeSubscription: Stripe.Subscription,
    planHint?: ConsumerPlan,
  ): Promise<MyPlanResult> {
    const item = stripeSubscription.items.data[0];
    const priceId = item?.price.id;
    const plan = planHint ?? this.planForPriceId(priceId);
    if (!plan) {
      this.logger.warn(
        `No se pudo mapear el price ${priceId ?? '(sin price)'} de la subscription ${stripeSubscription.id} a un ConsumerPlan; se omite la sincronización.`,
      );
      return this.getPlanForConsumerProfile(consumerProfileId);
    }
    const status = STATUS_BY_STRIPE_STATUS[stripeSubscription.status] ?? SubscriptionStatus.INCOMPLETE;
    const currentPeriodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null;
    const canceledAt = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null;

    const saved = await this.prisma.subscription.upsert({
      where: { consumerProfileId },
      create: {
        consumerProfileId,
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id,
        stripePriceId: priceId,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt,
      },
      update: {
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeSubscriptionItemId: item?.id,
        stripePriceId: priceId,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt,
      },
    });

    return {
      plan: saved.plan,
      status: saved.status,
      currentPeriodEnd: saved.currentPeriodEnd,
      cancelAtPeriodEnd: saved.cancelAtPeriodEnd,
    };
  }

  /** Llamado desde el webhook cuando Stripe reporta la subscription por customer.subscription.*. */
  async handleStripeSubscriptionEvent(stripeSubscription: Stripe.Subscription): Promise<void> {
    const metadataConsumerId = stripeSubscription.metadata?.consumerProfileId;
    const consumerProfileId =
      metadataConsumerId ??
      (await this.consumerProfileIdForStripeCustomer(stripeSubscription.customer));
    if (!consumerProfileId) {
      this.logger.warn(
        `Webhook de subscription ${stripeSubscription.id} sin consumerProfileId resoluble (customer=${String(stripeSubscription.customer)})`,
      );
      return;
    }
    await this.syncFromStripeSubscription(consumerProfileId, stripeSubscription);
  }

  private async consumerProfileIdForStripeCustomer(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
  ): Promise<string | null> {
    const stripeCustomerId = typeof customer === 'string' ? customer : customer.id;
    const found = await this.prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId },
      select: { consumerProfileId: true },
    });
    return found?.consumerProfileId ?? null;
  }
}
