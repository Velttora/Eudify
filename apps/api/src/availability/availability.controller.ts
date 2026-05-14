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
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { UpdateAvailabilityBlockDto } from './dto/update-availability-block.dto';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('me/blocks')
  listMine(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.availability.listMine(clerk.clerkUserId);
  }

  @Post('me/blocks')
  createMine(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CreateAvailabilityBlockDto,
  ) {
    return this.availability.createMine(clerk.clerkUserId, dto);
  }

  @Patch('me/blocks/:blockId')
  updateMine(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('blockId') blockId: string,
    @Body() dto: UpdateAvailabilityBlockDto,
  ) {
    return this.availability.updateMine(clerk.clerkUserId, blockId, dto);
  }

  @Delete('me/blocks/:blockId')
  deleteMine(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('blockId') blockId: string,
  ) {
    return this.availability.deleteMine(clerk.clerkUserId, blockId);
  }

  @Get('providers/:providerProfileId/blocks')
  listForProvider(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('providerProfileId') providerProfileId: string,
  ) {
    return this.availability.listForProviderProfile(
      providerProfileId,
      clerk.clerkUserId,
    );
  }
}
