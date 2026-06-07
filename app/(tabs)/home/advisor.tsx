import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';
import { useChatHistory } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SUGGESTED_PROMPTS_VI } from '@/types/ai';
import type { ChatMessage } from '@/types/ai';

export default function AIAdvisorChat() {
  const router = useRouter();
  const { data: history, isLoading } = useChatHistory();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, thinking]);

  if (isLoading) return <LoadingSpinner />;

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `msg_local_${Date.now()}`,
      userId: 'local',
      role: 'user',
      content: trimmed,
      sessionId: 'session_local',
      createdAt: now,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: `msg_local_${Date.now() + 1}`,
        userId: 'local',
        role: 'assistant',
        content:
          'Đây là phản hồi mô phỏng. Khi backend AI sẵn sàng, câu trả lời thực tế dựa trên dữ liệu chi tiêu của bạn sẽ xuất hiện ở đây.',
        sessionId: 'session_local',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
      setThinking(false);
    }, 900);
  };

  const showSuggestions = messages.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Text style={styles.headerIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Cố vấn</Text>
          <Text style={styles.headerSubtitle}>Phản hồi dựa trên dữ liệu của bạn</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {showSuggestions ? (
            <View style={styles.intro}>
              <Text style={styles.introIcon}>🤖</Text>
              <Text style={styles.introTitle}>Xin chào!</Text>
              <Text style={styles.introBody}>
                Hỏi tôi bất cứ điều gì về chi tiêu, ngân sách, hay mục tiêu tiết kiệm của bạn.
              </Text>
            </View>
          ) : null}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                m.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    m.role === 'user'
                      ? styles.bubbleTextUser
                      : styles.bubbleTextAi,
                  ]}
                >
                  {m.content}
                </Text>
              </View>
            </View>
          ))}

          {thinking ? (
            <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
              <View style={[styles.bubble, styles.bubbleAi, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color={COLORS.brand[500]} />
                <Text style={styles.thinkingText}>Đang suy nghĩ...</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {showSuggestions ? (
          <View style={styles.suggestRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestScroll}
            >
              {SUGGESTED_PROMPTS_VI.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.suggestChip}
                  onPress={() => handleSend(prompt)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <RNTextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hỏi gì đó..."
            placeholderTextColor={COLORS.gray[400]}
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => handleSend(input)}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              input.trim().length === 0 && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend(input)}
            disabled={input.trim().length === 0 || thinking}
            activeOpacity={0.75}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[100] },
  kav: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 28, color: COLORS.gray[700] },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
  },
  headerSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.gray[500] },

  messages: { padding: SPACING[4], paddingBottom: SPACING[6] },

  intro: {
    alignItems: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[6],
  },
  introIcon: { fontSize: 56, marginBottom: SPACING[3] },
  introTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.gray[900],
    marginBottom: SPACING[2],
  },
  introBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },

  bubbleRow: { flexDirection: 'row', marginBottom: SPACING[2] },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
  },
  bubbleUser: {
    backgroundColor: COLORS.brand[500],
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...SHADOW.sm,
  },
  bubbleText: { fontSize: FONT_SIZE.sm, lineHeight: 22 },
  bubbleTextUser: { color: COLORS.white },
  bubbleTextAi: { color: COLORS.gray[800] },

  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  thinkingText: { fontSize: FONT_SIZE.sm, color: COLORS.gray[500] },

  suggestRow: {
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  suggestScroll: { paddingHorizontal: SPACING[4], gap: SPACING[2] },
  suggestChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.brand[50],
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.brand[200],
  },
  suggestChipText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.brand[700],
    fontWeight: FONT_WEIGHT.medium,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: SPACING[2],
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray[900],
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray[300] },
  sendIcon: { fontSize: FONT_SIZE.xl, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
});
