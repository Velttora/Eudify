import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { MarkChatReadDto } from './dto/mark-chat-read.dto';
import { ListChatMessagesQueryDto } from './dto/list-chat-messages.query.dto';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UnregisterPushDeviceDto } from './dto/unregister-push-device.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  listMine(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.chat.listMyThreads(clerk.clerkUserId);
  }

  @Get('threads/:threadId/messages')
  listMessages(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('threadId') threadId: string,
    @Query() query: ListChatMessagesQueryDto,
  ) {
    return this.chat.listThreadMessages(
      clerk.clerkUserId,
      threadId,
      query.limit,
      query.cursorId,
    );
  }

  @Post('threads/:threadId/messages')
  sendMessage(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('threadId') threadId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chat.sendMessage(clerk.clerkUserId, threadId, dto);
  }

  @Post('threads/:threadId/read')
  @HttpCode(200)
  markRead(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('threadId') threadId: string,
    @Body() dto: MarkChatReadDto,
  ) {
    return this.chat.markThreadRead(clerk.clerkUserId, threadId, dto.messageId);
  }

  @Post('devices')
  registerDevice(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.chat.registerPushDevice(clerk.clerkUserId, dto.platform, dto.token);
  }

  @Post('devices/unregister')
  @HttpCode(200)
  unregisterDevice(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: UnregisterPushDeviceDto,
  ) {
    return this.chat.unregisterPushDevice(clerk.clerkUserId, dto.token);
  }
}
