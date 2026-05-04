'use client';

import { useAuth } from '@clerk/nextjs';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  listChatMessages,
  listChatThreads,
  markChatRead,
  sendChatMessage,
  type ChatMessageRow,
} from '../api/chat-api';
import { getChatSocket } from '../realtime/chat-socket';

export function useChatThreads() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ['chat', 'threads'],
    queryFn: () => listChatThreads(getToken),
  });
}

export function useChatMessagesInfinite(threadId: string | null) {
  const { getToken } = useAuth();
  return useInfiniteQuery({
    queryKey: ['chat', 'thread', threadId],
    queryFn: ({ pageParam }) =>
      listChatMessages(getToken, threadId!, {
        cursorId: pageParam as string | undefined,
        limit: 25,
      }),
    enabled: Boolean(threadId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useSendMessage(threadId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { text: string; appointmentId?: string }) => {
      if (!threadId) {
        throw new Error('Selecciona una conversación antes de enviar mensajes.');
      }
      return sendChatMessage(getToken, threadId, {
        ...payload,
        clientMessageId: crypto.randomUUID(),
      });
    },
    onSuccess: (message) => {
      qc.setQueryData(['chat', 'thread', threadId], (prev: unknown) => {
        const data = prev as
          | {
              pages: { items: ChatMessageRow[]; nextCursor: string | null; threadId: string }[];
              pageParams: unknown[];
            }
          | undefined;
        if (!data || data.pages.length === 0) return prev;
        const pages = [...data.pages];
        const first = pages[0];
        if (!first) return prev;
        const alreadyExists = pages.some((p) =>
          p.items.some((m) => m.id === message.id),
        );
        if (alreadyExists) return prev;
        pages[0] = { ...first, items: [message, ...first.items] };
        return { ...data, pages };
      });
      qc.invalidateQueries({ queryKey: ['chat', 'threads'] });
    },
  });
}

export function useMarkRead(threadId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => {
      if (!threadId) {
        throw new Error('No hay conversación seleccionada.');
      }
      return markChatRead(getToken, threadId, messageId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'threads'] });
    },
  });
}

export function useChatRealtimeBindings(threadId: string | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!threadId) return;
    let canceled = false;
    let unsub: (() => void) | null = null;

    void (async () => {
      const socket = await getChatSocket(getToken);
      if (canceled) return;

      const onMessage = (message: ChatMessageRow) => {
        if (message.threadId !== threadId) return;
        qc.setQueryData(['chat', 'thread', threadId], (prev: unknown) => {
          const data = prev as
            | {
                pages: { items: ChatMessageRow[]; nextCursor: string | null; threadId: string }[];
                pageParams: unknown[];
              }
            | undefined;
          if (!data || data.pages.length === 0) return prev;
          const pages = [...data.pages];
          const first = pages[0];
          if (!first) return prev;
          const alreadyExists = pages.some((p) =>
            p.items.some((m) => m.id === message.id),
          );
          if (alreadyExists) return prev;
          pages[0] = { ...first, items: [message, ...first.items] };
          return { ...data, pages };
        });
        qc.invalidateQueries({ queryKey: ['chat', 'thread', threadId] });
        qc.invalidateQueries({ queryKey: ['chat', 'threads'] });
      };

      socket.emit('chat:join', { threadId });
      socket.on('chat:message.new', onMessage);

      unsub = () => {
        socket.emit('chat:leave', { threadId });
        socket.off('chat:message.new', onMessage);
      };
    })();

    return () => {
      canceled = true;
      unsub?.();
    };
  }, [getToken, qc, threadId]);
}
