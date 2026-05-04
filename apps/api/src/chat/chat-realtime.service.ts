import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ChatRealtimeService {
  private server: Server | null = null;
  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly usersByThread = new Map<string, Set<string>>();

  bindServer(server: Server) {
    this.server = server;
  }

  onSocketConnected(userId: string, socketId: string) {
    const userSockets = this.socketsByUser.get(userId) ?? new Set<string>();
    userSockets.add(socketId);
    this.socketsByUser.set(userId, userSockets);
  }

  onSocketDisconnected(userId: string, socketId: string) {
    const userSockets = this.socketsByUser.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.socketsByUser.delete(userId);
      } else {
        this.socketsByUser.set(userId, userSockets);
      }
    }
    for (const [threadId, users] of this.usersByThread.entries()) {
      users.delete(userId);
      if (users.size === 0) {
        this.usersByThread.delete(threadId);
      } else {
        this.usersByThread.set(threadId, users);
      }
    }
  }

  onJoinedThread(threadId: string, userId: string) {
    const users = this.usersByThread.get(threadId) ?? new Set<string>();
    users.add(userId);
    this.usersByThread.set(threadId, users);
  }

  onLeftThread(threadId: string, userId: string) {
    const users = this.usersByThread.get(threadId);
    if (!users) return;
    users.delete(userId);
    if (users.size === 0) {
      this.usersByThread.delete(threadId);
      return;
    }
    this.usersByThread.set(threadId, users);
  }

  isUserOnline(userId: string): boolean {
    return (this.socketsByUser.get(userId)?.size ?? 0) > 0;
  }

  isUserActiveInThread(userId: string, threadId: string): boolean {
    return this.usersByThread.get(threadId)?.has(userId) ?? false;
  }

  emitNewMessage(threadId: string, message: unknown) {
    this.server?.to(this.roomForThread(threadId)).emit('chat:message.new', message);
  }

  emitReadReceipt(threadId: string, payload: unknown) {
    this.server?.to(this.roomForThread(threadId)).emit('chat:message.read', payload);
  }

  private roomForThread(threadId: string) {
    return `thread:${threadId}`;
  }
}
