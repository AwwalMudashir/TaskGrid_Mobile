import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';

import { type ChatMessage } from '@/src/features/chat/chat-api';
import { API_BASE_URL } from '@/src/lib/api';
import { getSessionTokens } from '@/src/lib/token-storage';

export type ChatRealtimeEvent = {
  type: 'MESSAGE_CREATED' | 'MESSAGES_READ';
  taskId: string;
  message: ChatMessage | null;
  readerId: string | null;
  readAt: string | null;
};

export type ChatSocketState = 'connecting' | 'connected' | 'disconnected';

type ChatSocketHandlers = {
  onEvent(event: ChatRealtimeEvent): void;
  onStateChange?(state: ChatSocketState): void;
  onConnected?(): void;
};

const socketUrl = `${String(API_BASE_URL).replace(/^http/, 'ws').replace(/\/$/, '')}/ws`;

export async function connectChatChannel(
  channel: string,
  handlers: ChatSocketHandlers,
): Promise<() => Promise<void>> {
  let active = true;
  let subscription: StompSubscription | null = null;

  const client = new Client({
    brokerURL: socketUrl,
    reconnectDelay: 4_000,
    connectionTimeout: 8_000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    debug: __DEV__ ? (message) => console.debug(`[TaskGrid chat] ${message}`) : () => undefined,
    beforeConnect: async () => {
      const tokens = await getSessionTokens();
      if (!tokens?.accessToken) throw new Error('No authenticated chat session');
      client.connectHeaders = { Authorization: `Bearer ${tokens.accessToken}` };
      if (active) handlers.onStateChange?.('connecting');
    },
    onConnect: () => {
      if (!active) return;
      subscription?.unsubscribe();
      subscription = client.subscribe(`/user/queue/chat/${channel}`, (frame) =>
        receive(frame, handlers.onEvent),
      );
      handlers.onStateChange?.('connected');
      handlers.onConnected?.();
    },
    onStompError: () => {
      if (active) handlers.onStateChange?.('disconnected');
    },
    onWebSocketError: () => {
      if (active) handlers.onStateChange?.('disconnected');
    },
    onWebSocketClose: () => {
      if (active) handlers.onStateChange?.('disconnected');
    },
  });

  handlers.onStateChange?.('connecting');
  client.activate();

  return async () => {
    active = false;
    subscription?.unsubscribe();
    await client.deactivate();
  };
}

function receive(frame: IMessage, onEvent: (event: ChatRealtimeEvent) => void) {
  try {
    onEvent(JSON.parse(frame.body) as ChatRealtimeEvent);
  } catch (cause) {
    if (__DEV__) console.warn('TaskGrid ignored an invalid live chat event', cause);
  }
}
