import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import {
  assistantApi,
  type AssistantHistoryMessage,
} from '@/src/features/assistant/assistant-api';
import {
  ASSISTANT_CHAT_MESSAGE_LIMIT,
  loadAssistantConversation,
  saveAssistantConversation,
  type StoredAssistantMessage,
} from '@/src/features/assistant/assistant-chat-storage';
import { useAuth } from '@/src/features/auth/AuthContext';
import { fonts, radius, spacing, useAppTheme } from '@/src/theme';

type ChatMessage = StoredAssistantMessage;

let messageSequence = 0;
function messageId() {
  messageSequence += 1;
  return `${Date.now()}-${messageSequence}`;
}

export default function AssistantScreen({ showBackButton = true }: { showBackButton?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const loadedUserId = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [starterQuestions, setStarterQuestions] = useState<string[]>([]);
  const [safetyNote, setSafetyNote] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    loadedUserId.current = null;
    setLoading(true);

    async function initialiseConversation() {
      const worker = user?.role === 'RUNNER';
      const fallback = {
        greeting: worker
          ? 'I can help you find work and manage each job safely.'
          : 'I can guide you through posting and managing a task.',
        suggestedQuestions: worker
          ? ['How do I find nearby tasks?', 'How do payouts work?']
          : ['How do I create a task?', 'How does protected payment work?'],
        safetyNote: '',
      };

      const [bootstrapResult, savedResult] = await Promise.allSettled([
        assistantApi.bootstrap(),
        user?.id ? loadAssistantConversation(user.id) : Promise.resolve([]),
      ]);
      if (!active) return;

      const bootstrap = bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : fallback;
      const saved = savedResult.status === 'fulfilled' ? savedResult.value : [];
      setMessages(
        saved.length
          ? saved
          : [
              {
                id: messageId(),
                role: 'ASSISTANT',
                content: bootstrap.greeting,
                createdAt: Date.now(),
              },
            ],
      );
      setStarterQuestions(saved.length ? [] : bootstrap.suggestedQuestions);
      setSafetyNote(bootstrap.safetyNote);
      loadedUserId.current = user?.id ?? null;
      setLoading(false);
    }

    void initialiseConversation();
    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const conversationMessages = messages.filter((message) => !message.isHistoryNotice);
    if (conversationMessages.length <= ASSISTANT_CHAT_MESSAGE_LIMIT) return;

    const latestExchange = conversationMessages.slice(-2);
    setMessages([
      {
        id: messageId(),
        role: 'ASSISTANT',
        content: 'Older messages were cleared after this chat reached 50 messages.',
        createdAt: Date.now(),
        isHistoryNotice: true,
      },
      ...latestExchange,
    ]);
    Alert.alert(
      'Chat history refreshed',
      'This conversation reached 50 messages, so the older messages were cleared from this device.',
    );
  }, [messages]);

  useEffect(() => {
    if (!user?.id || loadedUserId.current !== user.id || loading) return;
    if (
      messages.filter((message) => !message.isHistoryNotice).length > ASSISTANT_CHAT_MESSAGE_LIMIT
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void saveAssistantConversation(user.id, messages).catch(() => undefined);
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, messages, user?.id]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, sending]);

  async function send(value = input) {
    const question = value.trim();
    if (!question || sending) return;
    const history: AssistantHistoryMessage[] = messages
      .filter((message) => !message.isHistoryNotice)
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    const userMessage: ChatMessage = {
      id: messageId(),
      role: 'USER',
      content: question,
      createdAt: Date.now(),
    };
    setMessages((current) => [...current, userMessage]);
    setStarterQuestions([]);
    setInput('');
    setSending(true);
    try {
      const reply = await assistantApi.chat(question, history);
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: 'ASSISTANT',
          content: reply.message,
          createdAt: Date.now(),
          actions: reply.actions,
          suggestions: reply.suggestedQuestions,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: 'ASSISTANT',
          createdAt: Date.now(),
          content:
            "I couldn't reach the guide just now. Your message was not lost. Tap retry when you're ready.",
          suggestions: [question],
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={showBackButton ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          {showBackButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.headerAction, { opacity: pressed ? 0.45 : 1 }]}
            >
              <Ionicons name="arrow-back" size={25} color={colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.headerIdentity}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="sparkles" size={17} color={colors.primary} />
            </View>
            <AppText variant="bodyMedium">TaskGrid Guide</AppText>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.conversation}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <AppText color={colors.textMuted}>Preparing your guide...</AppText>
            </View>
          ) : (
            <>
              {messages.map((message, index) => {
                const latestAssistant =
                  message.role === 'ASSISTANT' && index === messages.length - 1;
                const showTimestamp =
                  index === 0 || message.createdAt - messages[index - 1].createdAt > 5 * 60_000;
                return (
                  <View key={message.id} style={styles.messageBlock}>
                    {message.isHistoryNotice ? (
                      <View style={[styles.historyNotice, { borderColor: colors.divider }]}>
                        <AppText
                          variant="caption"
                          color={colors.textMuted}
                          style={styles.noticeText}
                        >
                          {message.content}
                        </AppText>
                      </View>
                    ) : (
                      <>
                        {showTimestamp ? (
                          <AppText
                            variant="caption"
                            color={colors.textMuted}
                            style={styles.timestamp}
                          >
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </AppText>
                        ) : null}
                        <View
                          style={[
                            styles.messageRow,
                            message.role === 'USER' ? styles.userRow : styles.assistantRow,
                          ]}
                        >
                          {message.role === 'ASSISTANT' ? (
                            <View
                              style={[
                                styles.messageAvatar,
                                { backgroundColor: colors.primarySoft },
                              ]}
                            >
                              <Ionicons name="sparkles" size={14} color={colors.primary} />
                            </View>
                          ) : null}
                          <View style={styles.messageContent}>
                            <View
                              style={[
                                styles.bubble,
                                message.role === 'USER'
                                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                                  : [
                                      styles.assistantBubble,
                                      { backgroundColor: colors.surfaceSecondary },
                                    ],
                              ]}
                            >
                              <AppText
                                color={message.role === 'USER' ? colors.textOnPrimary : colors.text}
                              >
                                {message.content}
                              </AppText>
                            </View>
                            {message.actions?.length ? (
                              <View style={styles.actions}>
                                {message.actions.map((action) => (
                                  <Pressable
                                    key={action.id}
                                    accessibilityRole="link"
                                    onPress={() => router.push(action.route as Href)}
                                    style={({ pressed }) => [
                                      styles.action,
                                      {
                                        backgroundColor: colors.primarySoft,
                                        opacity: pressed ? 0.58 : 1,
                                      },
                                    ]}
                                  >
                                    <AppText variant="button" color={colors.primary}>
                                      {action.label}
                                    </AppText>
                                    <Ionicons
                                      name="chevron-forward"
                                      size={16}
                                      color={colors.primary}
                                    />
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        </View>
                        {latestAssistant && message.suggestions?.length ? (
                          <QuestionChips
                            questions={message.suggestions}
                            disabled={sending}
                            onSelect={send}
                          />
                        ) : null}
                      </>
                    )}
                  </View>
                );
              })}
              {starterQuestions.length ? (
                <View style={styles.starters}>
                  <AppText variant="caption" color={colors.textMuted}>
                    Try asking
                  </AppText>
                  <QuestionChips questions={starterQuestions} disabled={sending} onSelect={send} />
                </View>
              ) : null}
              {safetyNote && messages.length === 1 ? (
                <AppText variant="caption" color={colors.textMuted} style={styles.safetyNote}>
                  {safetyNote}
                </AppText>
              ) : null}
              {sending ? (
                <View style={[styles.messageRow, styles.assistantRow]}>
                  <View style={[styles.messageAvatar, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                  <View style={[styles.typingBubble, { backgroundColor: colors.surfaceSecondary }]}>
                    <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
                    <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
                    <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
                    <AppText variant="caption" color={colors.textMuted}>
                      Thinking
                    </AppText>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <View
          style={[
            styles.composerWrap,
            { borderTopColor: colors.divider, backgroundColor: colors.background },
          ]}
        >
          <View style={[styles.composer, { backgroundColor: colors.surfaceSecondary }]}>
            <TextInput
              accessibilityLabel="Ask TaskGrid Guide"
              value={input}
              onChangeText={setInput}
              placeholder="Message TaskGrid Guide"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              editable={!sending}
              style={[styles.input, { color: colors.text }]}
              onSubmitEditing={() => void send()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!input.trim() || sending}
              onPress={() => void send()}
              style={({ pressed }) => [
                styles.send,
                {
                  opacity: !input.trim() || sending ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name="send"
                size={23}
                color={input.trim() && !sending ? colors.primary : colors.textMuted}
              />
            </Pressable>
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.disclaimer}>
            Guidance may be imperfect. Check important task and payment details.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function QuestionChips({
  questions,
  disabled,
  onSelect,
}: {
  questions: string[];
  disabled: boolean;
  onSelect(question: string): void;
}) {
  const { colors } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.questions}
    >
      {questions.slice(0, 4).map((question) => (
        <Pressable
          key={question}
          disabled={disabled}
          onPress={() => onSelect(question)}
          style={({ pressed }) => [
            styles.question,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
            },
          ]}
        >
          <AppText variant="caption" color={colors.textSecondary}>
            {question}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 66,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerAction: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  conversation: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  loadingState: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  messageBlock: { gap: spacing.sm },
  historyNotice: {
    alignSelf: 'center',
    maxWidth: 310,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: { textAlign: 'center' },
  timestamp: { alignSelf: 'center', marginVertical: spacing.xs },
  messageRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  assistantRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageContent: { maxWidth: '82%', gap: spacing.sm },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderRadius: 18,
    borderBottomRightRadius: 6,
  },
  actions: { gap: 6 },
  action: {
    minHeight: 42,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  starters: { gap: spacing.sm, marginTop: spacing.sm },
  questions: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  question: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  safetyNote: { alignSelf: 'center', textAlign: 'center', marginTop: spacing.sm, maxWidth: 340 },
  typingBubble: {
    minHeight: 42,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
  },
  typingDot: { width: 5, height: 5, borderRadius: 3 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  composer: {
    minHeight: 54,
    maxHeight: 132,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: 5,
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 112,
    paddingTop: 9,
    paddingBottom: 8,
    paddingRight: spacing.sm,
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'center',
  },
  send: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: { textAlign: 'center' },
});
