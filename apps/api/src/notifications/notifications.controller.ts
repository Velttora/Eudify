import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('clerk')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Query('take') take?: string,
  ) {
    const n = take ? Number(take) : 30;
    return this.notifications.listMine(
      clerk.clerkUserId,
      Number.isFinite(n) ? n : 30,
    );
  }

  @Patch(':id/read')
  markRead(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(clerk.clerkUserId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.notifications.markAllRead(clerk.clerkUserId);
  }
}
