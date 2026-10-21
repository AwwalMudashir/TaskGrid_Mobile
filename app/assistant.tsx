import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import {
  assistantApi,
  type AssistantAction,
  type AssistantHistoryMessage,
} from '@/src/features/assistant/assistant-api';
import { useAuth } from '@/src/features/auth/AuthContext';
import { fonts, radius, spacing, useAppTheme } from '@/src/theme';

type ChatMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  actions?: AssistantAction[];
  suggestions?: string[];
};

let messageSequence = 0;
function messageId() {
  messageSequence += 1;
  return `${Date.now()}-${messageSequence}`;
}

export default function AssistantScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [starterQuestions, setStarterQuestions] = useState<string[]>([]);
  const [safetyNote, setSafetyNote] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    assistantApi
      .bootstrap()
      .then((data) => {
        if (!active) return;
        setMessages([{ id: messageId(), role: 'ASSISTANT', content: data.greeting }]);
        setStarterQuestions(data.suggestedQuestions);
        setSafetyNote(data.safetyNote);
      })
      .catch(() => {
        if (!active) return;
        const worker = user?.role === 'RUNNER';
        setMessages([
          {
            id: messageId(),
            role: 'ASSISTANT',
            content: worker
              ? 'I can help you find work and manage each job safely.'
              : 'I can guide you through posting and managing a task.',
          },
        ]);
        setStarterQuestions(
          worker
            ? ['How do I find nearby tasks?', 'How do payouts work?']
            : ['How do I create a task?', 'How does protected payment work?'],
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, sending]);

  async function send(value = input) {
    const question = value.trim();
    if (!question || sending) return;
    const history: AssistantHistoryMessage[] = messages
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    const userMessage: ChatMessage = { id: messageId(), role: 'USER', content: question };
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
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerWrap}>
          <AuthHeader
            title="TaskGrid Guide"
            subtitle={user?.role === 'RUNNER' ? 'Worker help' : 'Client help'}
          />
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
              <View style={[styles.guideMark, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="sparkles" size={25} color={colors.primary} />
              </View>
              {messages.map((message, index) => {
                const latestAssistant =
                  message.role === 'ASSISTANT' && index === messages.length - 1;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.message,
                      message.role === 'USER' && [
                        styles.userMessage,
                        { backgroundColor: colors.primarySoft },
                      ],
                    ]}
                  >
                    {message.role === 'ASSISTANT' ? (
                      <AppText variant="eyebrow" color={colors.primary}>
                        TASKGRID
                      </AppText>
                    ) : null}
                    <AppText>{message.content}</AppText>
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
                                borderBottomColor: colors.divider,
                                opacity: pressed ? 0.58 : 1,
                              },
                            ]}
                          >
                            <AppText variant="button" color={colors.primary}>
                              {action.label}
                            </AppText>
                            <Ionicons name="arrow-forward" size={17} color={colors.primary} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {latestAssistant && message.suggestions?.length ? (
                      <QuestionChips
                        questions={message.suggestions}
                        disabled={sending}
                        onSelect={send}
                      />
                    ) : null}
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
                <View style={styles.thinking}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <AppText variant="caption" color={colors.textMuted}>
                    Thinking...
                  </AppText>
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
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TextInput
              accessibilityLabel="Ask TaskGrid Guide"
              value={input}
              onChangeText={setInput}
              placeholder="Ask how TaskGrid works"
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
                  backgroundColor: colors.primary,
                  opacity: !input.trim() || sending ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
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
    <View style={styles.questions}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.xl },
  scroll: { flex: 1 },
  conversation: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  loadingState: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl },
  guideMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  message: { maxWidth: '90%', gap: spacing.sm },
  userMessage: {
    alignSelf: 'flex-end',
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actions: { paddingTop: spacing.xs },
  action: {
    minHeight: 43,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starters: { gap: spacing.sm, marginTop: spacing.xs },
  questions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  question: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  safetyNote: { marginTop: spacing.sm, maxWidth: 340 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  composerWrap: {
    borderTopWidth: 1,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  composer: {
    minHeight: 54,
    maxHeight: 132,
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: { textAlign: 'center' },
});
