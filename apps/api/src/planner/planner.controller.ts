import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { PlannerService } from './planner.service';

@ApiTags('Educational Planner')
@Controller('planner')
export class PlannerController {
  constructor(private readonly service: PlannerService) {}

  @Get('me/progress')
  getProgress(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Query('childProfileId') childProfileId: string,
  ) {
    return this.service.getProgress(clerk.clerkUserId, childProfileId);
  }

  @Post('me/progress/complete')
  @HttpCode(200)
  completeModule(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CompleteModuleDto,
  ) {
    return this.service.completeModule(clerk.clerkUserId, dto.childProfileId, dto.moduleNumber);
  }
}
