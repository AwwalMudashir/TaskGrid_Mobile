import { apiRequest } from '@/src/lib/api';

export type Conversation = {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  participantId: string;
  participantName: string;
  participantPictureUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type ConversationPage = {
  items: Conversation[];
  page: number;
  hasNext: boolean;
};

export type ChatMessage = {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderRole: 'CLIENT' | 'RUNNER';
  content: string;
  mine: boolean;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type ChatMessagePage = {
  items: ChatMessage[];
  page: number;
  hasNext: boolean;
};

export type ChatReadResult = {
  updatedMessages: number;
  readAt: string;
};

export const chatApi = {
  conversations(page = 0) {
    return apiRequest<ConversationPage>(`/chat/conversations?page=${page}`, {
      authenticated: true,
    });
  },
  messages(taskId: string, page = 0) {
    return apiRequest<ChatMessagePage>(`/chat/tasks/${taskId}/messages?page=${page}`, {
      authenticated: true,
    });
  },
  send(taskId: string, content: string) {
    return apiRequest<ChatMessage>(`/chat/tasks/${taskId}/messages`, {
      method: 'POST',
      body: { content: content.trim() },
      authenticated: true,
    });
  },
  markRead(taskId: string) {
    return apiRequest<ChatReadResult>(`/chat/tasks/${taskId}/read`, {
      method: 'POST',
      authenticated: true,
    });
  },
};
