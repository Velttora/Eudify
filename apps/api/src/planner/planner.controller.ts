import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { SaveLearningPlanDto } from './dto/save-learning-plan.dto';
import { PlannerService } from './planner.service';

@ApiTags('Educational Planner')
@Controller('planner')
export class PlannerController {
  constructor(private readonly service: PlannerService) {}

  @Get('me/plans')
  listPlans(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.service.listPlans(clerk.clerkUserId);
  }

  @Get('me/plan')
  getPlan(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Query('childProfileId') childProfileId: string,
    @Query('categoryId') categoryId: string,
  ) {
    return this.service.getPlan(clerk.clerkUserId, childProfileId, categoryId);
  }

  @Put('me/plan')
  savePlan(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: SaveLearningPlanDto,
  ) {
    return this.service.savePlan(clerk.clerkUserId, dto);
  }
}
