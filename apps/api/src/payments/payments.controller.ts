import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { CreateConnectOnboardingLinkDto } from './dto/create-connect-onboarding-link.dto';
import { SetDefaultPaymentMethodDto } from './dto/set-default-payment-method.dto';
import { SyncPaymentMethodDto } from './dto/sync-payment-method.dto';
import { PaymentsService } from './payments.service';

class ListPaymentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

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

  @Get('me/history')
  listMyPaymentHistory(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.payments.listConsumerPaymentHistory(
      clerk.clerkUserId,
      query.take,
    );
  }

  @Get('provider/me/history')
  listProviderPaymentHistory(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.payments.listProviderPaymentHistory(
      clerk.clerkUserId,
      query.take,
    );
  }

  @Get(':paymentId/receipt')
  getPaymentReceipt(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('paymentId') paymentId: string,
  ) {
    return this.payments.getPaymentReceiptUrl(clerk.clerkUserId, paymentId);
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
