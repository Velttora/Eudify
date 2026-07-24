import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me')
  getMyPlan(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.subscriptions.getPlanForClerkUser(clerk.clerkUserId);
  }

  @Post('subscribe')
  @HttpCode(200)
  subscribe(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptions.subscribeToPlan(clerk.clerkUserId, dto.plan);
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.subscriptions.cancelSubscription(clerk.clerkUserId);
  }
}
