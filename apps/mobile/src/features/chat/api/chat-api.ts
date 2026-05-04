import { apiRequest } from '@/shared/lib/api';

export type ChatThreadRow = {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  counterpart: {
    fullName: string | null;
    role: 'CONSUMER' | 'PROVIDER';
  };
  me: {
    userId: string;
  };
};

export type ChatMessageRow = {
  id: string;
  threadId: string;
  senderUserId: string;
  text: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
};

export type ListThreadMessagesResponse = {
  threadId: string;
  items: ChatMessageRow[];
  nextCursor: string | null;
};

export function listChatThreads(getToken: () => Promise<string | null>) {
  return apiRequest<ChatThreadRow[]>('/chat/threads', { getToken });
}

export function listChatMessages(
  getToken: () => Promise<string | null>,
  threadId: string,
  params?: { cursorId?: string; limit?: number },
) {
  const query = new URLSearchParams();
  if (params?.cursorId) query.set('cursorId', params.cursorId);
  if (params?.limit) query.set('limit', String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<ListThreadMessagesResponse>(`/chat/threads/${threadId}/messages${suffix}`, {
    getToken,
  });
}

export function sendChatMessage(
  getToken: () => Promise<string | null>,
  threadId: string,
  text: string,
) {
  const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return apiRequest<ChatMessageRow>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    getToken,
    body: {
      text,
      clientMessageId,
    },
  });
}

export function markChatRead(
  getToken: () => Promise<string | null>,
  threadId: string,
  messageId: string,
) {
  return apiRequest<{ ok: true }>(`/chat/threads/${threadId}/read`, {
    method: 'POST',
    getToken,
    body: { messageId },
  });
}

export function registerPushDevice(
  getToken: () => Promise<string | null>,
  platform: 'IOS' | 'ANDROID' | 'WEB',
  token: string,
) {
  return apiRequest('/chat/devices', {
    method: 'POST',
    getToken,
    body: { platform, token },
  });
}
