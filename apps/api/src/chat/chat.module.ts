import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';
import { UsersModule } from '../users/users.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';

@Module({
  imports: [UsersModule, PushModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatRealtimeService],
  exports: [ChatService],
})
export class ChatModule {}
