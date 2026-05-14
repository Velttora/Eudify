import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportTicketStatus } from '@repo/database';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminPatchTicketDto } from './dto/admin-patch-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';
import { SupportService } from './support.service';

@ApiTags('Admin Support')
@Controller('admin/support')
@Roles('ADMIN')
@UseGuards(RolesGuard)
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  listTickets(
    @Query('status') status?: SupportTicketStatus,
    @Query('categoryCode') categoryCode?: string,
    @Query('providerProfileId') providerProfileId?: string,
  ) {
    return this.support.adminListTickets({
      status,
      categoryCode,
      providerProfileId,
    });
  }

  @Get('metrics')
  metrics() {
    return this.support.adminMetrics();
  }

  @Patch('tickets/:id')
  patchTicket(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
    @Body() dto: AdminPatchTicketDto,
  ) {
    return this.support.adminPatchTicket(clerk.clerkUserId, id, dto);
  }

  @Post('tickets/:id/messages')
  @HttpCode(201)
  addAgentMessage(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
    @Body() dto: TicketMessageDto,
  ) {
    return this.support.adminAddMessage(clerk.clerkUserId, id, dto.body);
  }
}
