import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { AssistantAction } from '@/src/features/assistant/assistant-api';

export const ASSISTANT_CHAT_MESSAGE_LIMIT = 50;

export type StoredAssistantMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: number;
  actions?: AssistantAction[];
  suggestions?: string[];
  isHistoryNotice?: boolean;
};

type StoredAssistantConversation = {
  version: 1;
  messages: StoredAssistantMessage[];
};

const WEB_KEY_PREFIX = 'taskgrid.assistant.chat.';

function safeUserKey(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function storageFile(userId: string) {
  return new File(Paths.document, `taskgrid-assistant-${safeUserKey(userId)}.json`);
}

function isStoredMessage(value: unknown): value is StoredAssistantMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<StoredAssistantMessage>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'USER' || message.role === 'ASSISTANT') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'number'
  );
}

function parseConversation(raw: string | null): StoredAssistantMessage[] {
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as Partial<StoredAssistantConversation>;
    if (saved.version !== 1 || !Array.isArray(saved.messages)) return [];
    return saved.messages.filter(isStoredMessage).slice(-ASSISTANT_CHAT_MESSAGE_LIMIT);
  } catch {
    return [];
  }
}

export async function loadAssistantConversation(userId: string) {
  if (Platform.OS === 'web') {
    return parseConversation(globalThis.localStorage?.getItem(`${WEB_KEY_PREFIX}${userId}`) ?? null);
  }

  const file = storageFile(userId);
  if (!file.exists) return [];
  return parseConversation(await file.text());
}

export async function saveAssistantConversation(
  userId: string,
  messages: StoredAssistantMessage[],
) {
  const payload: StoredAssistantConversation = {
    version: 1,
    messages: messages.slice(-ASSISTANT_CHAT_MESSAGE_LIMIT),
  };
  const value = JSON.stringify(payload);

  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(`${WEB_KEY_PREFIX}${userId}`, value);
    return;
  }

  const file = storageFile(userId);
  file.create({ intermediates: true, overwrite: true });
  file.write(value);
}
