import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRateLimitService } from './chat-rate-limit.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';

@Module({
  imports: [UsersModule, PushModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRealtimeService, ChatRateLimitService],
  exports: [ChatService],
})
export class ChatModule {}
