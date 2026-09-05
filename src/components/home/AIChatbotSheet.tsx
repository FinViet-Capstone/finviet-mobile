import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcon } from '@/components/common/MaterialIcon';
import { TextInput } from '@/components/common/TextInput';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, withAlpha } from '@/theme';
import { useThemeColors, type ThemeColors } from '@/providers/ThemeProvider';
import {
  useChatSessions,
  useChatSessionMessages,
  useCreateChatSession,
  useSendChatMessage,
} from '@/hooks/useReports';
import type { ChatSession } from '@/types/ai';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Trợ lý FinViet',
  placeholder: 'Hỏi về chi tiêu của bạn...',
  listening: 'Đang lắng nghe...',
  tapToStop: 'Chạm để dừng',
  greeting: 'Xin chào! Tôi có thể giúp gì cho bạn về quản lý tài chính hôm nay?',
  chips: ['Phân tích chi tiêu', 'Ngân sách tháng này', 'Mục tiêu tiết kiệm', 'Giao dịch gần đây'],
  historyTitle: 'Lịch sử hội thoại',
  historyEmpty: 'Chưa có hội thoại nào.',
  openHistory: 'Mở lịch sử hội thoại',
  closeHistory: 'Đóng lịch sử hội thoại',
  messages: (n: number) => `${n} tin nhắn`,
};

const CHAT_HEADER_HEIGHT = 64;
const HISTORY_DRAWER_MAX_HEIGHT = 280;

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'user' | 'ai';

interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ChatHistoryDrawerProps {
  sessions: ChatSession[];
  onSelectSession: (sessionId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowTime(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function genId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_greeting',
    role: 'ai',
    text: S.greeting,
    timestamp: nowTime(),
  },
];

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.delay(300),
        ]),
      ),
    );
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingDots}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

// ─── Voice listening overlay ──────────────────────────────────────────────────

function VoiceOverlay({ onStop }: { onStop: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(ring2, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] }),
  });

  return (
    <View style={styles.voiceOverlay}>
      <Text style={styles.voiceListeningLabel}>{S.listening}</Text>
      <View style={styles.voiceRingsWrap}>
        <Animated.View style={[styles.voiceRing, ringStyle(ring1)]} />
        <Animated.View style={[styles.voiceRing, styles.voiceRing2, ringStyle(ring2)]} />
        <TouchableOpacity activeOpacity={0.85} style={styles.voiceMicBtn} onPress={onStop}>
          <MaterialIcon name="mic" size={32} color={colors.onPrimary} filled />
        </TouchableOpacity>
      </View>
      <Text style={styles.voiceTapToStop}>{S.tapToStop}</Text>
    </View>
  );
}

// ─── Message bubbles ──────────────────────────────────────────────────────────

function UserBubble({ message }: { message: Message }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.userBubbleRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{message.text}</Text>
      </View>
      <Text style={styles.bubbleTime}>{message.timestamp}</Text>
    </View>
  );
}

function AIBubble({ message, isTyping = false }: { message?: Message; isTyping?: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.aiBubbleRow}>
      <View style={styles.aiAvatar}>
        <MaterialIcon name="auto_awesome" size={16} color={colors.primary} filled />
      </View>
      <View style={styles.aiBubble}>
        <View style={styles.aiBubbleAccent} />
        {isTyping ? (
          <TypingDots />
        ) : (
          <Text style={styles.aiBubbleText}>{message?.text}</Text>
        )}
      </View>
    </View>
  );
}

function ChatHistoryDrawer({ sessions, onSelectSession }: ChatHistoryDrawerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const renderSession = useCallback(({ item: session }: { item: ChatSession }) => {
    const date = new Date(session.lastMessageAt);
    const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.sessionRow}
        onPress={() => onSelectSession(session.sessionId)}
      >
        <View style={styles.sessionIcon}>
          <MaterialIcon name="chat" size={16} color={colors.primary} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionPreview} numberOfLines={1}>{session.previewText}</Text>
          <Text style={styles.sessionMeta}>
            {session.messageCount === undefined
              ? dateStr
              : `${dateStr} · ${S.messages(session.messageCount)}`}
          </Text>
        </View>
        <MaterialIcon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
      </TouchableOpacity>
    );
  }, [onSelectSession, colors, styles]);

  return (
    <View style={styles.historyDrawer} testID="chat-history-drawer">
      <Text style={styles.historyTitle}>{S.historyTitle}</Text>
      <FlatList
        testID="chat-history-list"
        style={styles.historyList}
        data={sessions}
        keyExtractor={(session) => session.sessionId}
        renderItem={renderSession}
        ListEmptyComponent={<Text style={styles.historyEmpty}>{S.historyEmpty}</Text>}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIChatbotSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  // The conversation being written to. Null = nothing opened yet, so the next
  // message starts a new session rather than falling into the default one.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const { data: sessions = [] } = useChatSessions();
  const { data: sessionMessages } = useChatSessionMessages(loadingSessionId);
  const createSession = useCreateChatSession();
  const sendChat = useSendChatMessage();

  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-5)
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120) {
        translateY.value = withTiming(800, { duration: 250 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Load session messages when a session is selected
  useEffect(() => {
    if (!sessionMessages || !loadingSessionId) return;
    const converted: Message[] = sessionMessages.map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'user' : 'ai',
      text: m.content,
      timestamp: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }));
    setMessages(converted);
    setActiveSessionId(loadingSessionId);
    setLoadingSessionId(null);
    setHistoryOpen(false);
  }, [sessionMessages, loadingSessionId]);

  const handleLoadSession = useCallback((sessionId: string) => {
    setLoadingSessionId(sessionId);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setActiveSessionId(null);
    setHistoryOpen(false);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: genId(), role: 'user', text: trimmed, timestamp: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    try {
      // A conversation that hasn't been opened yet gets a real session titled with
      // the question starting it — that title is what the history drawer previews.
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = (await createSession.mutateAsync(trimmed)).sessionId;
        setActiveSessionId(sessionId);
      }

      const reply = await sendChat.mutateAsync({ question: trimmed, sessionId });
      const aiMsg: Message = {
        id: reply.id || genId(),
        role: 'ai',
        text: reply.content,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'ai',
          text: 'Xin lỗi, đã có lỗi khi kết nối trợ lý. Vui lòng thử lại.',
          timestamp: nowTime(),
        },
      ]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }, [scrollToBottom, sendChat, createSession, activeSessionId, isTyping]);

  const handleChip = useCallback((chip: string) => {
    handleSend(chip);
  }, [handleSend]);

  const handleMic = useCallback(() => {
    setIsListening(true);
  }, []);

  const handleStopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    if (item.role === 'user') return <UserBubble message={item} />;
    return <AIBubble message={item} />;
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Reanimated.View style={[styles.sheet, { paddingBottom: insets.bottom }, sheetStyle]}>
          {/* Header — drag target */}
          <GestureDetector gesture={pan}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.headerBtn}
                  onPress={() => setHistoryOpen((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={historyOpen ? S.closeHistory : S.openHistory}
                  accessibilityState={{ expanded: historyOpen }}
                >
                  <MaterialIcon name="history" size={22} color={historyOpen ? colors.primary : colors.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={handleNewChat}>
                  <MaterialIcon name="add" size={22} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <View style={styles.headerTitle}>
                <MaterialIcon name="auto_awesome" size={18} color={colors.primary} filled />
                <Text style={styles.headerTitleText}>{S.title}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={onClose}
                accessibilityRole="button" accessibilityLabel="Đóng">
                <MaterialIcon name="close" size={22} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </GestureDetector>

          {/* History drawer */}
          {historyOpen && (
            <ChatHistoryDrawer sessions={sessions} onSelectSession={handleLoadSession} />
          )}

          {/* Chat list */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={isTyping ? <AIBubble isTyping /> : null}
            style={styles.chatList}
          />

          {/* Voice overlay */}
          {isListening && <VoiceOverlay onStop={handleStopListening} />}

          {/* Input area */}
          <View style={styles.inputArea}>
            <View style={styles.inputRow}>
              <TouchableOpacity activeOpacity={0.7} style={styles.inputIconBtn} onPress={handleMic}>
                <MaterialIcon name="mic" size={22} color={isListening ? colors.primary : colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TextInput
                variant="bare"
                inputStyle={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={S.placeholder}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={() => handleSend(input)}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                onPress={() => handleSend(input)}
                disabled={!input.trim()}
              >
                <MaterialIcon name="send" size={18} color={colors.onPrimary} filled />
              </TouchableOpacity>
            </View>

            {/* Suggestion chips */}
            <FlatList
              data={S.chips}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.chip}
                  onPress={() => handleChip(item)}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContent}
              style={styles.chipsList}
            />
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(colors.black, 0.5),
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    height: '90%',
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.2),
    overflow: 'hidden',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    height: CHAT_HEADER_HEIGHT,
    backgroundColor: colors.surfaceContainerHighest,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.surfaceVariant, 0.5),
    zIndex: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDrawer: {
    position: 'absolute',
    top: CHAT_HEADER_HEIGHT,
    left: 0,
    right: 0,
    maxHeight: HISTORY_DRAWER_MAX_HEIGHT,
    backgroundColor: colors.surfaceContainerHighest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    zIndex: 3,
    elevation: 4,
  },
  historyList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  historyTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[2],
  },
  historyEmpty: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: SPACING[3],
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: withAlpha(colors.primary, 0.13),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionPreview: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: colors.onSurface,
  },
  sessionMeta: {
    fontSize: FONT_SIZE.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  headerTitleText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.primary,
  },
  // Chat
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: SPACING[4],
    gap: SPACING[4],
    paddingBottom: SPACING[6],
  },
  // User bubble
  userBubbleRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.13),
  },
  userBubbleText: {
    fontSize: FONT_SIZE.sm,
    color: colors.onPrimaryContainer,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    marginRight: SPACING[1],
  },
  // AI bubble
  aiBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.31),
    flexShrink: 0,
    marginTop: 4,
  },
  aiBubble: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.19),
    overflow: 'hidden',
  },
  aiBubbleAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: withAlpha(colors.primary, 0.25),
  },
  aiBubbleText: {
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    lineHeight: 20,
  },
  // Typing dots
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurfaceVariant,
  },
  // Voice overlay
  voiceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: colors.surfaceContainerHighest,
    borderTopWidth: 1,
    borderTopColor: withAlpha(colors.surfaceVariant, 0.5),
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  voiceListeningLabel: {
    position: 'absolute',
    top: SPACING[4],
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  voiceRingsWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  voiceRing2: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  voiceMicBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  voiceTapToStop: {
    position: 'absolute',
    bottom: SPACING[4],
    fontSize: FONT_SIZE.xs,
    color: colors.outline,
  },
  // Input area
  inputArea: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHighest,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[3],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.31),
    gap: SPACING[1],
  },
  inputIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: colors.onSurface,
    paddingHorizontal: SPACING[2],
    paddingVertical: 0,
    height: 40,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  chipsList: {
    marginTop: SPACING[3],
  },
  chipsContent: {
    gap: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  chip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: withAlpha(colors.outlineVariant, 0.19),
  },
  chipText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  });
}
