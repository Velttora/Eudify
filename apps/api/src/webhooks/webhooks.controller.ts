import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import Stripe from 'stripe';

import { Public } from '../auth/public.decorator';
import { StripeService } from '../stripe/stripe.service';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhooks: WebhooksService,
  ) {}

  @Public()
  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() rawBody: Buffer,
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      return { received: false, error: 'Missing stripe-signature header' };
    }
    const stripe = this.stripeService.getClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.stripeService.getWebhookSecret(),
    ) as Stripe.Event;
    await this.webhooks.processStripeEvent(event);
    return { received: true };
  }
}
