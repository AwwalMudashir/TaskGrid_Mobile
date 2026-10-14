import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  type ChatChannelConnection,
  type ChatRealtimeEvent,
  type ChatSocketState,
} from '@/src/features/chat/chat-socket';
import { taskApi, type TaskDetail } from '@/src/features/tasks/task-api';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const closedStatuses = new Set(['PAID', 'REFUNDED', 'CANCELLED']);

export default function TaskChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRef = useRef<ChatChannelConnection | null>(null);
  const typingActiveRef = useRef(false);
  const draftRef = useRef('');
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
  const [deletePromptVisible, setDeletePromptVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [participantTyping, setParticipantTyping] = useState(false);

  const participantName = useMemo(() => {
    if (!task) return 'Task conversation';
    return task.clientId === user?.id ? (task.assignedRunnerName ?? 'Worker') : task.clientName;
  }, [task, user?.id]);
  const readOnly = Boolean(task && closedStatuses.has(task.status));

  const stopTyping = useCallback(() => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = null;
    if (!id || !typingActiveRef.current) return;
    connectionRef.current?.setTyping(id, false);
    typingActiveRef.current = false;
  }, [id]);

  const updateDraft = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraft(value);
      if (!id || readOnly) return;

      if (!value.trim()) {
        stopTyping();
        return;
      }
      if (!typingActiveRef.current) {
        typingActiveRef.current = Boolean(connectionRef.current?.setTyping(id, true));
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(stopTyping, 1_600);
    },
    [id, readOnly, stopTyping],
  );

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
      let connection: ChatChannelConnection | undefined;
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
          const readAtTime = Date.parse(event.readAt);
          if (Number.isNaN(readAtTime)) return;
          setMessages((current) =>
            current.map((message) =>
              message.mine && Date.parse(message.createdAt) <= readAtTime
                ? { ...message, read: true, readAt: event.readAt }
                : message,
            ),
          );
        } else if (event.type === 'MESSAGE_DELETED' && event.messageId) {
          setMessages((current) => current.filter((message) => message.id !== event.messageId));
        } else if (event.type === 'TYPING_CHANGED') {
          if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
          setParticipantTyping(Boolean(event.typing));
          remoteTypingTimerRef.current = event.typing
            ? setTimeout(() => setParticipantTyping(false), 3_500)
            : null;
        }
      };

      void load();
      void connectChatChannel(id, {
        onEvent: receive,
        onStateChange: socketStatus,
        onConnected: () => void load(0, true),
      }).then((connected) => {
        if (disposed) {
          void connected.disconnect();
        } else {
          connection = connected;
          connectionRef.current = connected;
          if (draftRef.current.trim()) {
            typingActiveRef.current = connected.setTyping(id, true);
          }
        }
      });

      return () => {
        disposed = true;
        stopFallback();
        stopTyping();
        if (readTimerRef.current) clearTimeout(readTimerRef.current);
        readTimerRef.current = null;
        if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
        remoteTypingTimerRef.current = null;
        setParticipantTyping(false);
        connectionRef.current = null;
        void connection?.disconnect();
      };
    }, [id, load, stopTyping]),
  );

  async function send() {
    const content = draft.trim();
    if (!id || !content || sending || readOnly) return;
    setSending(true);
    setError('');
    stopTyping();
    try {
      const sent = await chatApi.send(id, content);
      setMessages((current) => [...current, sent]);
      draftRef.current = '';
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "We couldn't send this message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteSelectedMessage() {
    if (!id || !selectedMessage || deletingMessage) return;
    const messageId = selectedMessage.id;
    setDeletingMessage(true);
    setError('');
    try {
      await chatApi.deleteMessage(id, messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      setSelectedMessage(null);
    } catch (cause) {
      setSelectedMessage(null);
      setError(cause instanceof ApiError ? cause.message : "We couldn't delete this message.");
    } finally {
      setDeletingMessage(false);
    }
  }

  async function deleteConversation() {
    if (!id || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await chatApi.deleteForMe(id);
      setDeletePromptVisible(false);
      router.back();
    } catch (cause) {
      setDeletePromptVisible(false);
      setError(cause instanceof ApiError ? cause.message : "We couldn't delete this conversation.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerWrap}>
          <AuthHeader
            title={participantName}
            subtitle={task?.title ?? 'Task conversation'}
            rightAction={{
              icon: 'trash-outline',
              accessibilityLabel: 'Delete this conversation',
              color: colors.danger,
              onPress: () => setDeletePromptVisible(true),
            }}
          />
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
                showDate={
                  index === 0 ||
                  new Date(messages[index - 1]!.createdAt).toDateString() !==
                    new Date(item.createdAt).toDateString()
                }
                onLongPress={item.mine ? () => setSelectedMessage(item) : undefined}
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
          <View style={{ backgroundColor: colors.surface }}>
            {participantTyping ? <TypingIndicator name={participantName} /> : null}
            <View style={[styles.composer, { borderTopColor: colors.divider }]}>
              <TextInput
                accessibilityLabel="Message"
                value={draft}
                onChangeText={updateDraft}
                onBlur={stopTyping}
                placeholder="Write a message"
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
          </View>
        )}

        <Modal
          visible={Boolean(selectedMessage)}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => !deletingMessage && setSelectedMessage(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Cancel deleting message"
              onPress={() => !deletingMessage && setSelectedMessage(null)}
            />
            <View style={[styles.messageDeletePrompt, { backgroundColor: colors.surface }]}>
              <AppText variant="subtitle">Delete this message?</AppText>
              <AppText color={colors.textSecondary} style={styles.promptCopy}>
                It will be removed from both sides of the conversation.
              </AppText>
              <View style={styles.promptActions}>
                <View style={styles.promptButton}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    disabled={deletingMessage}
                    onPress={() => setSelectedMessage(null)}
                  />
                </View>
                <View style={styles.promptButton}>
                  <Button
                    label="Delete message"
                    variant="danger"
                    loading={deletingMessage}
                    onPress={() => void deleteSelectedMessage()}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deletePromptVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => !deleting && setDeletePromptVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Cancel deleting conversation"
              onPress={() => !deleting && setDeletePromptVisible(false)}
            />
            <View style={[styles.deletePrompt, { backgroundColor: colors.surface }]}>
              <View style={[styles.warningMark, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="trash-outline" size={27} color={colors.danger} />
              </View>
              <AppText variant="title" style={styles.promptTitle}>
                Delete conversation?
              </AppText>
              <AppText color={colors.textSecondary} style={styles.promptCopy}>
                Your existing messages with {participantName} will disappear from your inbox. The
                other participant keeps their copy, and a future message can reopen the
                conversation.
              </AppText>
              <View style={styles.promptActions}>
                <View style={styles.promptButton}>
                  <Button
                    label="Keep conversation"
                    variant="ghost"
                    disabled={deleting}
                    onPress={() => setDeletePromptVisible(false)}
                  />
                </View>
                <View style={styles.promptButton}>
                  <Button
                    label="Delete"
                    variant="danger"
                    loading={deleting}
                    onPress={() => void deleteConversation()}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  showSender,
  showDate,
  onLongPress,
}: {
  message: ChatMessage;
  showSender: boolean;
  showDate: boolean;
  onLongPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.messageItem}>
      {showDate ? <DateDivider value={message.createdAt} /> : null}
      <View style={[styles.messageRow, message.mine && styles.mineRow]}>
        <Pressable
          disabled={!onLongPress}
          onLongPress={onLongPress}
          delayLongPress={350}
          accessibilityRole={onLongPress ? 'button' : undefined}
          accessibilityHint={onLongPress ? 'Hold to delete this message' : undefined}
          style={[
            styles.bubble,
            message.mine ? styles.mineBubble : styles.receivedBubble,
            {
              backgroundColor: message.mine ? colors.primarySoft : colors.surfaceSecondary,
            },
          ]}
        >
          {showSender && !message.mine ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {message.senderName}
            </AppText>
          ) : null}
          <AppText color={colors.text} style={styles.body}>
            {message.content}
          </AppText>
          <View style={styles.meta}>
            <AppText variant="caption" color={colors.textMuted}>
              {new Date(message.createdAt).toLocaleTimeString('en-NG', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </AppText>
            {message.mine ? (
              <Ionicons
                name={message.read ? 'checkmark-done' : 'checkmark'}
                size={15}
                color={message.read ? colors.primary : colors.textMuted}
              />
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function DateDivider({ value }: { value: string }) {
  const { colors } = useAppTheme();
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const label =
    date.toDateString() === today.toDateString()
      ? 'Today'
      : date.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={styles.dateDivider}>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function TypingIndicator({ name }: { name: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.typingIndicator} accessibilityLiveRegion="polite">
      <View style={styles.typingDots}>
        {[0, 1, 2].map((dot) => (
          <View key={dot} style={[styles.typingDot, { backgroundColor: colors.primary }]} />
        ))}
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {name} is typing
      </AppText>
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
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  messageRow: { alignItems: 'flex-start' },
  mineRow: { alignItems: 'flex-end' },
  messageItem: { gap: spacing.sm },
  bubble: {
    maxWidth: '82%',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  mineBubble: { borderBottomRightRadius: 5 },
  receivedBubble: { borderBottomLeftRadius: 5 },
  body: { lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  dateDivider: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: { width: 4, height: 4, borderRadius: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    textAlignVertical: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(4, 11, 24, 0.66)',
  },
  deletePrompt: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  messageDeletePrompt: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  warningMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: { marginTop: spacing.xs },
  promptCopy: { lineHeight: 22 },
  promptActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  promptButton: { flex: 1 },
});
