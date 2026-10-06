import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { SkeletonBlock } from '@/src/components/ui/SkeletonLoader';
import { chatApi, type Conversation, type ConversationPage } from '@/src/features/chat/chat-api';
import { connectChatChannel, type ChatSocketState } from '@/src/features/chat/chat-socket';
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

      void load();
      void connectChatChannel('inbox', {
        onEvent: () => void load(0, true),
        onStateChange: socketStatus,
        onConnected: () => void load(0, true),
      }).then((cleanup) => {
        if (disposed) void cleanup();
        else disconnect = cleanup;
      });

      return () => {
        disposed = true;
        if (fallbackTimer) clearInterval(fallbackTimer);
        void disconnect?.();
      };
    }, [load]),
  );

  return (
    <Screen contentStyle={styles.screen}>
      <AnimatedEntrance style={styles.header}>
        <AppText variant="title">Messages</AppText>
        <AppText color={colors.textSecondary}>
          Private conversations linked to accepted tasks.
        </AppText>
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
              bordered={index > 0}
              onPress={() =>
                router.push({
                  pathname: '/task/[id]/chat',
                  params: { id: conversation.taskId },
                } as never)
              }
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
    </Screen>
  );
}

function ConversationRow({
  conversation,
  bordered,
  onPress,
}: {
  conversation: Conversation;
  bordered: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${conversation.participantName}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        bordered && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
        { opacity: pressed ? 0.62 : 1 },
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
          <AppText color={colors.textSecondary} numberOfLines={1} style={styles.preview}>
            {conversation.lastMessage ?? 'Start the conversation'}
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
    </Pressable>
  );
}

function shortTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
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
  header: { gap: spacing.xs },
  list: { gap: 0 },
  row: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
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
