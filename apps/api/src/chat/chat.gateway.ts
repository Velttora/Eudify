import { verifyToken } from '@clerk/backend';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';

type SocketUserData = {
  clerkUserId: string;
  userId: string;
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.bindServer(server);
  }

  private async authenticateClient(client: Socket): Promise<SocketUserData> {
    const bearer =
      (typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null) ??
      (typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization
        : null);
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : bearer;
    if (!token) {
      throw new Error('missing_token');
    }
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('missing_clerk_secret');
    }
    const payload = await verifyToken(token, { secretKey });
    const clerkUserId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!clerkUserId) {
      throw new Error('invalid_token_subject');
    }
    const actor = await this.chat.resolveSocketActor(clerkUserId);
    return { clerkUserId, userId: actor.userId };
  }

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateClient(client);
      client.data.user = user;
      this.realtime.onSocketConnected(user.userId, client.id);
      client.emit('chat:ready', { userId: user.userId });
    } catch {
      client.emit('chat:error', { code: 'UNAUTHORIZED' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as SocketUserData | undefined;
    if (!user) return;
    this.realtime.onSocketDisconnected(user.userId, client.id);
  }

  @SubscribeMessage('chat:join')
  async onJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId?: string },
  ) {
    const user = client.data.user as SocketUserData | undefined;
    if (!user?.clerkUserId) {
      client.emit('chat:error', { code: 'UNAUTHORIZED' });
      return;
    }
    if (!payload?.threadId) {
      client.emit('chat:error', { code: 'BAD_REQUEST' });
      return;
    }
    try {
      await this.chat.assertThreadParticipant(user.clerkUserId, payload.threadId);
      const room = this.roomForThread(payload.threadId);
      await client.join(room);
      this.realtime.onJoinedThread(payload.threadId, user.userId);
      client.emit('chat:joined', { threadId: payload.threadId });
    } catch {
      client.emit('chat:error', { code: 'FORBIDDEN_THREAD' });
    }
  }

  @SubscribeMessage('chat:leave')
  async onLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId?: string },
  ) {
    const user = client.data.user as SocketUserData | undefined;
    if (!user?.userId || !payload?.threadId) return;
    await client.leave(this.roomForThread(payload.threadId));
    this.realtime.onLeftThread(payload.threadId, user.userId);
    client.emit('chat:left', { threadId: payload.threadId });
  }

  @SubscribeMessage('chat:typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId?: string; isTyping?: boolean },
  ) {
    const user = client.data.user as SocketUserData | undefined;
    if (!user?.clerkUserId || !payload?.threadId) return;
    try {
      await this.chat.assertThreadParticipant(user.clerkUserId, payload.threadId);
      client.to(this.roomForThread(payload.threadId)).emit('chat:typing', {
        threadId: payload.threadId,
        userId: user.userId,
        isTyping: payload.isTyping === true,
      });
    } catch {
      client.emit('chat:error', { code: 'FORBIDDEN_THREAD' });
    }
  }

  private roomForThread(threadId: string) {
    return `thread:${threadId}`;
  }
}
