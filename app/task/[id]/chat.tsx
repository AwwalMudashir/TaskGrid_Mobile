import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/features/auth/AuthContext';
import { chatApi, type ChatMessage } from '@/src/features/chat/chat-api';
import {
  connectChatChannel,
  type ChatRealtimeEvent,
  type ChatSocketState,
} from '@/src/features/chat/chat-socket';
import { taskApi, type TaskDetail } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const closedStatuses = new Set(['PAID', 'REFUNDED', 'CANCELLED']);

export default function TaskChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socketState, setSocketState] = useState<ChatSocketState>('connecting');

  const participantName = useMemo(() => {
    if (!task) return 'Task conversation';
    return task.clientId === user?.id ? (task.assignedRunnerName ?? 'Worker') : task.clientName;
  }, [task, user?.id]);
  const readOnly = Boolean(task && closedStatuses.has(task.status));

  const load = useCallback(
    async (nextPage = 0, quiet = false) => {
      if (!id) return;
      if (!quiet) nextPage === 0 ? setLoading(true) : setLoadingMore(true);
      try {
        const [history, details] = await Promise.all([
          chatApi.messages(id, nextPage),
          nextPage === 0 && !quiet ? taskApi.detail(id) : Promise.resolve(null),
        ]);
        setMessages((current) => {
          const combined =
            nextPage === 0 && !quiet ? history.items : [...current, ...history.items];
          return [...new Map(combined.map((message) => [message.id, message])).values()].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
          );
        });
        if (details) setTask(details);
        setPage((current) => (quiet && nextPage === 0 ? current : history.page));
        setHasNext((current) => (quiet && nextPage === 0 ? current : history.hasNext));
        setError('');
      } catch (cause) {
        if (!quiet) {
          setError(
            cause instanceof ApiError ? cause.message : "We couldn't load this conversation.",
          );
        }
      } finally {
        if (!quiet) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return undefined;
      let disposed = false;
      let disconnect: (() => Promise<void>) | undefined;
      let fallbackTimer: ReturnType<typeof setInterval> | undefined;

      const stopFallback = () => {
        if (fallbackTimer) clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      };
      const socketStatus = (state: ChatSocketState) => {
        if (disposed) return;
        setSocketState(state);
        if (state === 'connected') {
          stopFallback();
        } else if (state === 'disconnected' && !fallbackTimer) {
          fallbackTimer = setInterval(() => void load(0, true), 30_000);
        }
      };
      const receive = (event: ChatRealtimeEvent) => {
        if (disposed || event.taskId !== id) return;
        if (event.type === 'MESSAGE_CREATED' && event.message) {
          setMessages((current) =>
            [...new Map([...current, event.message!].map((item) => [item.id, item])).values()].sort(
              (left, right) =>
                new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
            ),
          );
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
          if (readTimerRef.current) clearTimeout(readTimerRef.current);
          readTimerRef.current = setTimeout(
            () => void chatApi.markRead(id).catch(() => undefined),
            250,
          );
        } else if (event.type === 'MESSAGES_READ' && event.readAt) {
          setMessages((current) =>
            current.map((message) =>
              message.mine ? { ...message, read: true, readAt: event.readAt } : message,
            ),
          );
        }
      };

      void load();
      void connectChatChannel(id, {
        onEvent: receive,
        onStateChange: socketStatus,
        onConnected: () => void load(0, true),
      }).then((cleanup) => {
        if (disposed) void cleanup();
        else disconnect = cleanup;
      });

      return () => {
        disposed = true;
        stopFallback();
        if (readTimerRef.current) clearTimeout(readTimerRef.current);
        readTimerRef.current = null;
        void disconnect?.();
      };
    }, [id, load]),
  );

  async function send() {
    const content = draft.trim();
    if (!id || !content || sending || readOnly) return;
    setSending(true);
    setError('');
    try {
      const sent = await chatApi.send(id, content);
      setMessages((current) => [...current, sent]);
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't send this message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerWrap}>
          <AuthHeader title={participantName} subtitle={task?.title ?? 'Task conversation'} />
          {socketState !== 'connected' ? (
            <AppText variant="caption" color={colors.textMuted} style={styles.connectionText}>
              {socketState === 'connecting'
                ? 'Connecting live chat'
                : 'Reconnecting. Messages can still be sent.'}
            </AppText>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText color={colors.textMuted}>Loading conversation</AppText>
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={38} color={colors.danger} />
            <AppText variant="subtitle">Conversation unavailable</AppText>
            <AppText color={colors.textMuted} style={styles.centerCopy}>
              {error}
            </AppText>
            <Button label="Try again" variant="secondary" onPress={() => void load()} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                showSender={index === 0 || messages[index - 1]?.senderId !== item.senderId}
              />
            )}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              if (page === 0) listRef.current?.scrollToEnd({ animated: false });
            }}
            ListHeaderComponent={
              hasNext ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void load(page + 1)}
                  disabled={loadingMore}
                  style={styles.olderAction}
                >
                  {loadingMore ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <AppText variant="caption" color={colors.primary}>
                      Load earlier messages
                    </AppText>
                  )}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} />
                </View>
                <AppText variant="subtitle">Start the conversation</AppText>
                <AppText color={colors.textMuted} style={styles.centerCopy}>
                  Keep task details and arrival updates here so both parties can refer back to them.
                </AppText>
              </View>
            }
          />
        )}

        {error && messages.length > 0 ? (
          <AppText variant="caption" color={colors.danger} style={styles.inlineError}>
            {error}
          </AppText>
        ) : null}
        {readOnly ? (
          <View style={[styles.readOnly, { borderTopColor: colors.divider }]}>
            <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted} style={styles.readOnlyCopy}>
              This completed conversation is available as read-only history.
            </AppText>
          </View>
        ) : (
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.surface, borderTopColor: colors.divider },
            ]}
          >
            <TextInput
              accessibilityLabel="Message"
              value={draft}
              onChangeText={setDraft}
              placeholder="Message about this task"
              placeholderTextColor={colors.textMuted}
              maxLength={2000}
              multiline
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!draft.trim() || sending}
              onPress={() => void send()}
              style={({ pressed }) => [
                styles.send,
                {
                  backgroundColor: colors.primary,
                  opacity: !draft.trim() || sending ? 0.45 : pressed ? 0.75 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="arrow-up" size={22} color={colors.textOnPrimary} />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message, showSender }: { message: ChatMessage; showSender: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.messageRow, message.mine && styles.mineRow]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: message.mine ? colors.primary : colors.surface,
            borderColor: message.mine ? colors.primary : colors.border,
          },
        ]}
      >
        {showSender && !message.mine ? (
          <AppText variant="caption" color={colors.primary}>
            {message.senderName}
          </AppText>
        ) : null}
        <AppText color={message.mine ? colors.textOnPrimary : colors.text} style={styles.body}>
          {message.content}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="caption" color={message.mine ? '#FFFFFFB8' : colors.textMuted}>
            {new Date(message.createdAt).toLocaleTimeString('en-NG', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </AppText>
          {message.mine ? (
            <Ionicons
              name={message.read ? 'checkmark-done' : 'checkmark'}
              size={15}
              color={message.read ? '#BAF5D1' : '#FFFFFFB8'}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.xl },
  connectionText: { paddingBottom: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centerCopy: { maxWidth: 330, textAlign: 'center', lineHeight: 21 },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  messageRow: { alignItems: 'flex-start' },
  mineRow: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineError: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  olderAction: { alignSelf: 'center', padding: spacing.md },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  readOnlyCopy: { flex: 1 },
});
