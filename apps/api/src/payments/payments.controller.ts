import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { CreateConnectOnboardingLinkDto } from './dto/create-connect-onboarding-link.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { SyncPaymentMethodDto } from './dto/sync-payment-method.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('me/setup-intent')
  createSetupIntent(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.payments.createSetupIntent(clerk.clerkUserId);
  }

  @Get('me/payment-methods')
  listPaymentMethods(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.payments.listPaymentMethods(clerk.clerkUserId);
  }

  @Post('me/payment-methods/sync')
  syncPaymentMethod(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: SyncPaymentMethodDto,
  ) {
    return this.payments.syncPaymentMethod(clerk.clerkUserId, dto.paymentMethodId);
  }

  @Patch('me/payment-methods/default')
  @HttpCode(200)
  setDefaultPaymentMethod(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: SetDefaultPaymentMethodDto,
  ) {
    return this.payments.setDefaultPaymentMethod(clerk.clerkUserId, dto.paymentMethodId);
  }

  @Delete('me/payment-methods/:paymentMethodId')
  @HttpCode(200)
  deletePaymentMethod(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    return this.payments.deletePaymentMethod(clerk.clerkUserId, paymentMethodId);
  }

  @Get('provider/connect/status')
  getConnectStatus(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.payments.getProviderStripeStatus(clerk.clerkUserId);
  }

  @Post('provider/connect/onboarding-link')
  createOnboardingLink(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CreateConnectOnboardingLinkDto,
  ) {
    return this.payments.createOrResumeConnectOnboarding(
      clerk.clerkUserId,
      dto.refreshUrl,
      dto.returnUrl,
    );
  }
}
