import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

@Module({
  imports: [UsersModule],
  controllers: [PlannerController],
  providers: [PlannerService],
})
export class PlannerModule {}
