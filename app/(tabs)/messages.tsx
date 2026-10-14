import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SkeletonBlock } from '@/src/components/ui/SkeletonLoader';
import { chatApi, type Conversation, type ConversationPage } from '@/src/features/chat/chat-api';
import {
  connectChatChannel,
  type ChatRealtimeEvent,
  type ChatSocketState,
} from '@/src/features/chat/chat-socket';
import { ApiError } from '@/src/lib/api';
import { radius, spacing, useAppTheme } from '@/src/theme';

const emptyPage: ConversationPage = { items: [], page: 0, hasNext: false };

export default function MessagesScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [result, setResult] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [deletePromptVisible, setDeletePromptVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typingTasks, setTypingTasks] = useState<Record<string, string>>({});
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async (page = 0, quiet = false) => {
    if (!quiet) page === 0 ? setLoading(true) : setLoadingMore(true);
    try {
      const next = await chatApi.conversations(page);
      setResult((current) => ({
        ...next,
        items:
          page === 0
            ? next.items
            : [
                ...current.items,
                ...next.items.filter(
                  (item) =>
                    !current.items.some((currentItem) => currentItem.taskId === item.taskId),
                ),
              ],
      }));
      setError('');
    } catch (cause) {
      if (!quiet) {
        setError(cause instanceof ApiError ? cause.message : "We couldn't load your messages.");
      }
    } finally {
      if (!quiet) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  async function deleteSelectedConversation() {
    if (!selected || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await chatApi.deleteForMe(selected.taskId);
      setResult((current) => ({
        ...current,
        items: current.items.filter((item) => item.taskId !== selected.taskId),
      }));
      setDeletePromptVisible(false);
      setSelected(null);
    } catch (cause) {
      setDeletePromptVisible(false);
      setError(cause instanceof ApiError ? cause.message : "We couldn't delete this conversation.");
    } finally {
      setDeleting(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let disconnect: (() => Promise<void>) | undefined;
      let fallbackTimer: ReturnType<typeof setInterval> | undefined;

      const socketStatus = (state: ChatSocketState) => {
        if (disposed) return;
        if (state === 'connected') {
          if (fallbackTimer) clearInterval(fallbackTimer);
          fallbackTimer = undefined;
        } else if (state === 'disconnected' && !fallbackTimer) {
          fallbackTimer = setInterval(() => void load(0, true), 30_000);
        }
      };

      const receive = (event: ChatRealtimeEvent) => {
        if (disposed) return;
        if (event.type !== 'TYPING_CHANGED') {
          void load(0, true);
          return;
        }

        const existingTimer = typingTimersRef.current[event.taskId];
        if (existingTimer) clearTimeout(existingTimer);
        if (!event.typing) {
          setTypingTasks((current) => {
            const next = { ...current };
            delete next[event.taskId];
            return next;
          });
          delete typingTimersRef.current[event.taskId];
          return;
        }

        setTypingTasks((current) => ({
          ...current,
          [event.taskId]: event.userName ?? 'Someone',
        }));
        typingTimersRef.current[event.taskId] = setTimeout(() => {
          setTypingTasks((current) => {
            const next = { ...current };
            delete next[event.taskId];
            return next;
          });
          delete typingTimersRef.current[event.taskId];
        }, 3_500);
      };

      void load();
      void connectChatChannel('inbox', {
        onEvent: receive,
        onStateChange: socketStatus,
        onConnected: () => void load(0, true),
      }).then((connection) => {
        if (disposed) void connection.disconnect();
        else disconnect = () => connection.disconnect();
      });

      return () => {
        disposed = true;
        if (fallbackTimer) clearInterval(fallbackTimer);
        Object.values(typingTimersRef.current).forEach(clearTimeout);
        typingTimersRef.current = {};
        setTypingTasks({});
        void disconnect?.();
      };
    }, [load]),
  );

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        {selected ? (
          <View style={styles.selectionHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear conversation selection"
              onPress={() => setSelected(null)}
              style={({ pressed }) => [styles.selectionClose, { opacity: pressed ? 0.55 : 1 }]}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.selectionCopy}>
              <AppText variant="subtitle">1 selected</AppText>
              <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                {selected.participantName}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete selected conversation"
              onPress={() => setDeletePromptVisible(true)}
              style={({ pressed }) => [
                styles.deleteAction,
                {
                  backgroundColor: colors.dangerSoft,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ) : (
          <>
            <AppText variant="title">Messages</AppText>
            <AppText color={colors.textSecondary}>
              Conversations for tasks that are still in progress.
            </AppText>
          </>
        )}
      </AnimatedEntrance>

      {loading ? (
        <ConversationSkeleton />
      ) : error ? (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={38} color={colors.danger} />
          <AppText variant="subtitle">Messages unavailable</AppText>
          <AppText color={colors.textMuted} style={styles.stateCopy}>
            {error}
          </AppText>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </View>
      ) : result.items.length === 0 ? (
        <AnimatedEntrance delay={100} style={styles.state}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="chatbubbles-outline" size={34} color={colors.accent} />
          </View>
          <AppText variant="subtitle">No conversations yet</AppText>
          <AppText color={colors.textSecondary} style={styles.stateCopy}>
            A private conversation appears here after a client accepts a worker for a task.
          </AppText>
        </AnimatedEntrance>
      ) : (
        <AnimatedEntrance delay={80} style={styles.list}>
          {result.items.map((conversation, index) => (
            <ConversationRow
              key={conversation.taskId}
              conversation={conversation}
              typingName={typingTasks[conversation.taskId]}
              bordered={index > 0}
              selected={selected?.taskId === conversation.taskId}
              onLongPress={() => setSelected(conversation)}
              onPress={() => {
                if (selected) {
                  setSelected(selected.taskId === conversation.taskId ? null : conversation);
                  return;
                }
                router.push({
                  pathname: '/task/[id]/chat',
                  params: { id: conversation.taskId },
                } as never);
              }}
            />
          ))}
          {result.hasNext ? (
            <Button
              label="Load older conversations"
              variant="secondary"
              loading={loadingMore}
              onPress={() => void load(result.page + 1)}
            />
          ) : null}
        </AnimatedEntrance>
      )}

      <Modal
        visible={deletePromptVisible && Boolean(selected)}
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
              This removes your existing conversation with {selected?.participantName} from this
              device and your TaskGrid inbox. It does not remove their copy. A new message will make
              the conversation appear again.
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
                  onPress={() => void deleteSelectedConversation()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ConversationRow({
  conversation,
  typingName,
  bordered,
  selected,
  onPress,
  onLongPress,
}: {
  conversation: Conversation;
  typingName?: string;
  bordered: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${conversation.participantName}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      style={({ pressed }) => [
        styles.row,
        bordered && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.divider,
        },
        selected && { backgroundColor: colors.primarySoft },
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        {conversation.participantPictureUrl ? (
          <Image source={{ uri: conversation.participantPictureUrl }} style={styles.avatarImage} />
        ) : (
          <AppText variant="subtitle" color={colors.primary}>
            {conversation.participantName.charAt(0).toUpperCase()}
          </AppText>
        )}
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.name}>
            {conversation.participantName}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {conversation.lastMessageAt ? shortTime(conversation.lastMessageAt) : ''}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.primary} numberOfLines={1}>
          {conversation.taskTitle}
        </AppText>
        <View style={styles.previewRow}>
          <AppText
            color={typingName ? colors.primary : colors.textSecondary}
            variant={typingName ? 'bodyMedium' : undefined}
            numberOfLines={1}
            style={styles.preview}
          >
            {typingName
              ? `${typingName} is typing...`
              : (conversation.lastMessage ?? 'Start the conversation')}
          </AppText>
          {conversation.unreadCount > 0 ? (
            <View style={[styles.unread, { backgroundColor: colors.primary }]}>
              <AppText variant="caption" color={colors.textOnPrimary}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      {selected ? (
        <View style={[styles.selectedMark, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={15} color={colors.textOnPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

function shortTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function ConversationSkeleton() {
  return (
    <View style={styles.list}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.row}>
          <SkeletonBlock width={56} height={56} borderRadius={28} />
          <View style={styles.rowCopy}>
            <SkeletonBlock width="44%" height={16} />
            <SkeletonBlock width="62%" height={12} />
            <SkeletonBlock width="88%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.xl },
  header: { minHeight: 62, justifyContent: 'center', gap: spacing.xs },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectionClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCopy: { flex: 1 },
  deleteAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 0 },
  row: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  rowCopy: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { flex: 1 },
  unread: {
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(4, 11, 24, 0.66)',
  },
  deletePrompt: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  warningMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: { marginTop: spacing.xs },
  promptCopy: { lineHeight: 22 },
  promptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  promptButton: { flex: 1 },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  stateCopy: { maxWidth: 330, textAlign: 'center', lineHeight: 22 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
