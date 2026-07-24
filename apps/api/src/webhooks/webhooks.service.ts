import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';
import Stripe from 'stripe';

import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async processStripeEvent(event: Stripe.Event) {
    const existing = await this.prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing?.processedAt) {
      return { duplicate: true };
    }

    await this.prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue,
      },
      update: {
        type: event.type,
        payload: JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue,
      },
    });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const chargeId =
          typeof intent.latest_charge === 'string' ? intent.latest_charge : null;
        await this.payments.handleStripePaymentIntentSucceeded(intent.id, chargeId);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.payments.handleStripePaymentIntentFailed(
          intent.id,
          intent.last_payment_error?.message,
        );
        break;
      }
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await this.payments.handleStripeAccountUpdated({
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.subscriptions.handleStripeSubscriptionEvent(subscription);
        break;
      }
      case 'checkout.session.completed':
      default:
        break;
    }

    await this.prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: { processedAt: new Date() },
    });

    return { duplicate: false };
  }
}
