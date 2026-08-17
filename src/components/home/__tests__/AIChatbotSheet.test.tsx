import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { AIChatbotSheet } from '../AIChatbotSheet';
import type { ChatSession } from '@/types/ai';

const mockSessions: ChatSession[] = Array.from({ length: 12 }, (_, index) => ({
  sessionId: `session-${index}`,
  customerId: 'customer-1',
  previewText: `Hội thoại ${index + 1}`,
  lastMessageAt: '2026-08-17T11:51:00.000Z',
}));

jest.mock('@/hooks/useReports', () => ({
  useChatSessions: () => ({ data: mockSessions }),
  useChatSessionMessages: () => ({ data: undefined }),
  useCreateChatSession: () => ({ mutateAsync: jest.fn() }),
  useSendChatMessage: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-gesture-handler', () => {
  const pan = {
    activeOffsetY(_offset: number) {
      return this;
    },
    failOffsetY(_offset: number) {
      return this;
    },
    onUpdate(_callback: unknown) {
      return this;
    },
    onEnd(_callback: unknown) {
      return this;
    },
  };

  return {
    Gesture: { Pan: () => pan },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('AIChatbotSheet chat history', () => {
  it('opens history as a bounded overlay with its own scrollable list', () => {
    const screen = render(<AIChatbotSheet visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Mở lịch sử hội thoại'));

    expect(screen.getByTestId('chat-history-drawer')).toHaveStyle({
      position: 'absolute',
      top: 64,
      maxHeight: 280,
    });
    expect(screen.getByTestId('chat-history-list')).toHaveProp('data', mockSessions);
    expect(screen.getByTestId('chat-history-list')).toHaveProp('nestedScrollEnabled', true);
    expect(screen.getByLabelText('Đóng lịch sử hội thoại')).toHaveProp(
      'accessibilityState',
      { expanded: true },
    );
  });
});
