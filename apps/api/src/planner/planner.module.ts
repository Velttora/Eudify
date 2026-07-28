import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

@Module({
  imports: [UsersModule, SubscriptionsModule],
  controllers: [PlannerController],
  providers: [PlannerService],
})
export class PlannerModule {}
