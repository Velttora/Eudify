import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useChatMessagesInfinite,
  useChatRealtimeBindings,
  useChatThreads,
  useMarkRead,
  useSendMessage,
} from '@/features/chat/hooks/useChat';
import { Screen } from '@/shared/ui/Screen';
import { palette } from '@/shared/theme/palette';

function formatTimestamp(iso: string) {
  try {
    return new Date(iso).toLocaleString('es');
  } catch {
    return iso;
  }
}

export function ChatScreen() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const threadsQuery = useChatThreads();
  const threads = threadsQuery.data ?? [];
  const selectedThread =
    threads.find((t) => t.id === selectedThreadId) ?? threads[0] ?? null;
  const effectiveThreadId = selectedThread?.id ?? null;

  const messagesQuery = useChatMessagesInfinite(effectiveThreadId);
  const sendMut = useSendMessage(effectiveThreadId);
  const markReadMut = useMarkRead(effectiveThreadId);
  useChatRealtimeBindings(effectiveThreadId);

  const messages = useMemo(
    () =>
      (messagesQuery.data?.pages ?? [])
        .flatMap((p) => p.items)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messagesQuery.data],
  );

  if (threadsQuery.isLoading) {
    return (
      <Screen>
        <Text style={styles.meta}>Cargando conversaciones…</Text>
      </Screen>
    );
  }

  if (threads.length === 0) {
    return (
      <Screen>
        <Text style={styles.meta}>
          Tu chat aparecerá aquí cuando una cita sea aceptada.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Chat</Text>

      <FlatList
        horizontal
        data={threads}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.threadList}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.threadPill,
              item.id === effectiveThreadId && styles.threadPillActive,
            ]}
            onPress={() => setSelectedThreadId(item.id)}
          >
            <Text
              style={[
                styles.threadPillText,
                item.id === effectiveThreadId && styles.threadPillTextActive,
              ]}
            >
              {item.counterpart.fullName?.trim() || 'Contacto'}
            </Text>
          </Pressable>
        )}
      />

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          const mine = item.senderUserId === selectedThread?.me.userId;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={styles.bubbleText}>{item.text}</Text>
              <Text style={styles.bubbleMeta}>{formatTimestamp(item.createdAt)}</Text>
            </View>
          );
        }}
      />

      <View style={styles.composerRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribe un mensaje…"
          onFocus={() => {
            const latest = messages.at(-1);
            if (latest?.id && effectiveThreadId) {
              markReadMut.mutate(latest.id);
            }
          }}
        />
        <Pressable
          style={styles.sendBtn}
          onPress={() => {
            if (!draft.trim() || !effectiveThreadId || sendMut.isPending) return;
            sendMut.mutate(draft.trim());
            setDraft('');
          }}
        >
          <Text style={styles.sendBtnText}>Enviar</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  meta: { marginTop: 16, color: palette.textMuted },
  threadList: { gap: 8, paddingBottom: 8 },
  threadPill: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.surface,
  },
  threadPillActive: {
    borderColor: palette.borderStrong,
    backgroundColor: palette.successSurface,
  },
  threadPillText: { color: palette.textMuted, fontWeight: '600' },
  threadPillTextActive: { color: palette.sky },
  messages: { gap: 10, paddingBottom: 12 },
  bubble: {
    maxWidth: '85%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    borderColor: palette.successBorder,
    backgroundColor: palette.successSurface,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  bubbleText: { color: palette.text, fontSize: 14 },
  bubbleMeta: { marginTop: 4, color: palette.textSubtle, fontSize: 10 },
  composerRow: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: palette.surfaceAlt,
    color: palette.text,
  },
  sendBtn: {
    borderRadius: 12,
    backgroundColor: palette.sky,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
