import { apiRequest } from '@/shared/lib/api';

export type ChatRole = 'CONSUMER' | 'PROVIDER';

export type ChatThreadRow = {
  id: string;
  consumerProfileId: string;
  providerProfileId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  totalMessages: number;
  me: {
    userId: string;
    role: ChatRole;
    lastReadAt: string | null;
    lastReadMessageId: string | null;
  };
  counterpart: {
    userId: string;
    profileId: string;
    fullName: string | null;
    photoUrl: string | null;
    role: ChatRole;
  };
  sessionContext: {
    appointmentId: string;
    childFirstName: string | null;
    offerTitle: string | null;
    startsAt: string;
    endsAt: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED';
    attendanceMode: 'IN_PERSON' | 'ONLINE' | null;
    requestsAlternativeSchedule: boolean;
  } | null;
};

export type ChatMessageRow = {
  id: string;
  threadId: string;
  senderUserId: string;
  text: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  appointmentId: string | null;
  clientMessageId: string | null;
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
  const q = query.toString();
  const suffix = q ? `?${q}` : '';
  return apiRequest<ListThreadMessagesResponse>(
    `/chat/threads/${threadId}/messages${suffix}`,
    { getToken },
  );
}

export function sendChatMessage(
  getToken: () => Promise<string | null>,
  threadId: string,
  body: { text: string; appointmentId?: string; clientMessageId?: string },
) {
  return apiRequest<ChatMessageRow>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    getToken,
    body,
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
  body: { platform: 'IOS' | 'ANDROID' | 'WEB'; token: string },
) {
  return apiRequest('/chat/devices', { method: 'POST', getToken, body });
}
