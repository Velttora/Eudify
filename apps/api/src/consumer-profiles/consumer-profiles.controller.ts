import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { ConsumerProfilesService } from './consumer-profiles.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateConsumerProfileDto } from './dto/update-consumer-profile.dto';

@ApiTags('Consumer Profiles')
@Controller('consumer-profiles')
export class ConsumerProfilesController {
  constructor(private readonly service: ConsumerProfilesService) {}

  @Get('me')
  me(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.service.getMe(clerk.clerkUserId);
  }

  @Patch('me')
  updateMe(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: UpdateConsumerProfileDto,
  ) {
    return this.service.updateMe(clerk.clerkUserId, dto);
  }

  @Post('me/complete')
  complete(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.service.completeOnboarding(clerk.clerkUserId);
  }

  @Get('me/children')
  listChildren(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.service.listChildren(clerk.clerkUserId);
  }

  @Post('me/children')
  addChild(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CreateChildDto,
  ) {
    return this.service.addChild(clerk.clerkUserId, dto);
  }

  @Patch('me/children/:childId')
  updateChild(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('childId') childId: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.service.updateChild(clerk.clerkUserId, childId, dto);
  }

  @Delete('me/children/:childId')
  removeChild(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('childId') childId: string,
  ) {
    return this.service.removeChild(clerk.clerkUserId, childId);
  }
}
