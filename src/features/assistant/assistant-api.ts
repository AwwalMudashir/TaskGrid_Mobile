import { apiRequest } from '@/src/lib/api';

export type AssistantAction = {
  id: string;
  label: string;
  route: string;
};

export type AssistantBootstrap = {
  greeting: string;
  safetyNote: string;
  suggestedQuestions: string[];
};

export type AssistantHistoryMessage = {
  role: 'USER' | 'ASSISTANT';
  content: string;
};

export type AssistantReply = {
  message: string;
  actions: AssistantAction[];
  suggestedQuestions: string[];
  source: 'GROQ' | 'LOCAL_GUIDE';
};

export const assistantApi = {
  bootstrap() {
    return apiRequest<AssistantBootstrap>('/assistant/bootstrap', {
      authenticated: true,
    });
  },
  chat(message: string, history: AssistantHistoryMessage[]) {
    return apiRequest<AssistantReply>('/assistant/chat', {
      method: 'POST',
      authenticated: true,
      timeoutMs: 15_000,
      body: { message, history: history.slice(-8) },
    });
  },
};
