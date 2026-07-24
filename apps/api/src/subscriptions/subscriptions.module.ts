import { Module } from '@nestjs/common';

import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { RequiresPlanGuard } from './requires-plan.guard';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [UsersModule, PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, RequiresPlanGuard],
  exports: [SubscriptionsService, RequiresPlanGuard],
})
export class SubscriptionsModule {}
