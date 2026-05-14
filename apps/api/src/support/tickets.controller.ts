import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { TicketMessageDto } from './dto/ticket-message.dto';
import { SupportService } from './support.service';

@ApiTags('Support Tickets')
@Controller('tickets')
export class SupportTicketsController {
  constructor(private readonly support: SupportService) {}

  @Get('categories')
  listCategories() {
    return this.support.listCategories();
  }

  @Get()
  listMine(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.support.listMyTickets(clerk.clerkUserId);
  }

  @Get(':id')
  getOne(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
  ) {
    return this.support.getTicket(clerk.clerkUserId, id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CreateTicketDto,
  ) {
    return this.support.createTicket(clerk.clerkUserId, dto);
  }

  @Post(':id/messages')
  @HttpCode(201)
  addMessage(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
    @Body() dto: TicketMessageDto,
  ) {
    return this.support.addMessage(clerk.clerkUserId, id, dto.body);
  }

  @Post(':id/resolve')
  resolve(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
  ) {
    return this.support.resolveTicket(clerk.clerkUserId, id, dto);
  }

  @Post(':id/escalate')
  escalate(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
  ) {
    return this.support.escalateTicket(clerk.clerkUserId, id, dto);
  }
}
