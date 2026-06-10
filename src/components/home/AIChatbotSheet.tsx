import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
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
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

// ─── Strings ──────────────────────────────────────────────────────────────────

const S = {
  title: 'Trợ lý FinViet',
  placeholder: 'Hỏi về chi tiêu của bạn...',
  listening: 'Đang lắng nghe...',
  tapToStop: 'Chạm để dừng',
  greeting: 'Xin chào! Tôi có thể giúp gì cho bạn về quản lý tài chính hôm nay?',
  chips: ['Phân tích chi tiêu', 'Ngân sách tháng này', 'Mục tiêu tiết kiệm', 'Giao dịch gần đây'],
};

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
          <MaterialIcon name="mic" size={32} color={COLORS.onPrimary} filled />
        </TouchableOpacity>
      </View>
      <Text style={styles.voiceTapToStop}>{S.tapToStop}</Text>
    </View>
  );
}

// ─── Message bubbles ──────────────────────────────────────────────────────────

function UserBubble({ message }: { message: Message }) {
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
  return (
    <View style={styles.aiBubbleRow}>
      <View style={styles.aiAvatar}>
        <MaterialIcon name="auto_awesome" size={16} color={COLORS.primary} filled />
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AIChatbotSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const listRef = useRef<FlatList>(null);

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

  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: genId(), role: 'user', text: trimmed, timestamp: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    // Simulate AI response after delay
    setTimeout(() => {
      const aiMsg: Message = {
        id: genId(),
        role: 'ai',
        text: 'Tôi đang phân tích dữ liệu tài chính của bạn... Tính năng AI Advisor sẽ được kết nối với backend trong phiên tiếp theo.',
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      scrollToBottom();
    }, 1500);
  }, [scrollToBottom]);

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
              <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn}>
                <MaterialIcon name="drag_handle" size={22} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
              <View style={styles.headerTitle}>
                <MaterialIcon name="auto_awesome" size={18} color={COLORS.primary} filled />
                <Text style={styles.headerTitleText}>{S.title}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} style={styles.headerBtn} onPress={onClose}>
                <MaterialIcon name="close" size={22} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </GestureDetector>

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
                <MaterialIcon name="mic" size={22} color={isListening ? COLORS.primary : COLORS.onSurfaceVariant} />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={S.placeholder}
                placeholderTextColor={COLORS.onSurfaceVariant}
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
                <MaterialIcon name="send" size={18} color={COLORS.onPrimary} filled />
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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${COLORS.black}80`,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS['2xl'],
    borderTopRightRadius: BORDER_RADIUS['2xl'],
    height: '90%',
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}33`,
    overflow: 'hidden',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    height: 64,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.surfaceVariant}80`,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  headerTitleText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
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
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  userBubbleText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onPrimaryContainer,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
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
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}50`,
    flexShrink: 0,
    marginTop: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}30`,
    overflow: 'hidden',
  },
  aiBubbleAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `${COLORS.primary}40`,
  },
  aiBubbleText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.onSurface,
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
    backgroundColor: COLORS.onSurfaceVariant,
  },
  // Voice overlay
  voiceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.surfaceVariant}80`,
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
    color: COLORS.onSurfaceVariant,
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
    borderColor: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
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
    color: COLORS.outline,
  },
  // Input area
  inputArea: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    paddingBottom: SPACING[3],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}50`,
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
    color: COLORS.onSurface,
    paddingHorizontal: SPACING[2],
    paddingVertical: 0,
    height: 40,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: `${COLORS.outlineVariant}30`,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
});
