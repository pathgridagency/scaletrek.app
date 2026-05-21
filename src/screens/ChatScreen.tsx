import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Lock, Send, ChevronLeft, Zap } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { Screen } from '../components/ui/Screen';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { ChatMessage, ChatThread, DealStage } from '../data/mockData';

export const ChatScreen: React.FC = () => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const threads = useChatStore((s) => s.threads);
  const encryption = useChatStore((s) => s.encryption);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const setDealStage = useChatStore((s) => s.setDealStage);
  const decryptMessage = useChatStore((s) => s.decryptMessage);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const activeThread = threads.find((t) => t.id === activeId) ?? null;
  const activeEncryption = activeThread ? encryption[activeThread.id] : undefined;
  const s = styles(palette);

  useEffect(() => {
    if (activeThread) markRead(activeThread.id);
  }, [activeThread?.id]);

  const stageColor = (stage: DealStage) =>
    stage === 'closed' ? palette.success : stage === 'negotiating' ? palette.warning : palette.textMuted;

  const cycleStage = (current: DealStage): DealStage =>
    current === 'exploring' ? 'negotiating' : current === 'negotiating' ? 'closed' : 'exploring';

  if (activeThread) {
    const send = () => {
      if (!user || !draft.trim()) return;
      sendMessage(activeThread.id, user.id, user.name, draft.trim());
      setDraft('');
    };

    return (
      <Screen edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.chatHeader}>
            <TouchableOpacity onPress={() => setActiveId(null)} style={s.backBtn}>
              <ChevronLeft size={22} color={palette.textSecondary} />
            </TouchableOpacity>
            <Avatar initials={activeThread.participantAvatar} size={36} accent="reality" />
            <View style={s.chatHeaderInfo}>
              <Text style={s.chatName}>{activeThread.participantName}</Text>
              <TouchableOpacity
                style={s.dealStatusRow}
                onPress={() => setDealStage(activeThread.id, cycleStage(activeThread.dealStatus))}
              >
                <View style={[s.dealDot, { backgroundColor: stageColor(activeThread.dealStatus) }]} />
                <Text style={[s.dealStatus, { color: stageColor(activeThread.dealStatus) }]}>
                  {activeThread.dealStatus[0].toUpperCase() + activeThread.dealStatus.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                s.encryptBadge,
                activeEncryption && { borderColor: palette.realityBorder, backgroundColor: palette.realitySubtle },
              ]}
            >
              <Lock
                size={10}
                color={activeEncryption ? palette.reality : palette.textDim}
                strokeWidth={1.5}
              />
              <Text
                style={[
                  s.encryptText,
                  activeEncryption && { color: palette.reality },
                ]}
              >
                {activeEncryption ? 'E2E ON' : 'E2E'}
              </Text>
            </View>
          </View>

          <View style={s.encryptNotice}>
            <Lock size={10} color={palette.textMuted} strokeWidth={1.5} />
            <Text style={s.encryptNoticeText}>
              {activeEncryption
                ? 'Handshake complete. Messages are encrypted on-device with the peer’s public key.'
                : 'Move the deal to Negotiating to activate end-to-end encryption for new messages.'}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={activeThread.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            renderItem={({ item }: { item: ChatMessage }) => {
              const isMe = item.senderId === user?.id;
              const display = activeThread
                ? decryptMessage(activeThread.id, item)
                : item.content;
              return (
                <View style={[s.messageBubble, isMe ? s.myBubble : s.theirBubble]}>
                  {!isMe && <Text style={s.bubbleSender}>{item.senderName}</Text>}
                  <Text style={[s.bubbleText, isMe && s.myBubbleText]}>{display}</Text>
                  <View style={s.bubbleMeta}>
                    {item.encrypted && <Lock size={9} color={isMe ? palette.accentOn : palette.textMuted} strokeWidth={1.5} />}
                    <Text style={[s.bubbleTime, isMe && { color: palette.accentOn }]}>{item.timestamp}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Send a signal..."
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { opacity: draft.trim() ? 1 : 0.4, backgroundColor: palette.accent }]}
              disabled={!draft.trim()}
              onPress={send}
            >
              <Send size={15} color={palette.accentOn} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <View style={s.encryptBadge}>
          <Lock size={10} color={palette.textDim} strokeWidth={1.5} />
          <Text style={s.encryptText}>E2E</Text>
        </View>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.threadList}
        renderItem={({ item }: { item: ChatThread }) => (
          <TouchableOpacity onPress={() => setActiveId(item.id)} activeOpacity={0.85}>
            <GlassCard accent="reality" style={s.threadCard}>
              <Avatar initials={item.participantAvatar} size={44} accent="reality" />
              <View style={s.threadInfo}>
                <View style={s.threadTop}>
                  <Text style={s.threadName}>{item.participantName}</Text>
                  <Text style={s.threadTime}>{item.lastTime}</Text>
                </View>
                <View style={s.threadBottom}>
                  <Text style={s.threadLast} numberOfLines={1}>
                    {item.lastMessage || 'No messages yet.'}
                  </Text>
                  {item.unread > 0 && (
                    <View style={[s.unreadBadge, { backgroundColor: palette.accent }]}>
                      <Text style={s.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
                <View style={s.dealStatusRow}>
                  <View style={[s.dealDot, { backgroundColor: stageColor(item.dealStatus) }]} />
                  <Text style={[s.dealStatus, { color: stageColor(item.dealStatus) }]}>
                    {item.dealStatus[0].toUpperCase() + item.dealStatus.slice(1)}
                  </Text>
                  <Zap size={10} color={palette.reality} strokeWidth={1.6} style={{ marginLeft: 4 }} />
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <GlassCard style={s.emptyCard}>
            <Zap size={28} color={palette.textMuted} />
            <Text style={s.emptyTitle}>No active signals</Text>
            <Text style={s.emptyDesc}>
              Signal a business from the feed to start a direct connection.
            </Text>
          </GlassCard>
        }
      />
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    encryptBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.border,
    },
    encryptText: {
      color: p.textDim,
      fontSize: 10,
      fontWeight: Typography.fontWeightMedium,
      letterSpacing: 0.3,
    },
    threadList: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
    threadCard: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md, alignItems: 'flex-start' },
    threadInfo: { flex: 1, gap: 4 },
    threadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    threadName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    threadTime: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    threadBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    threadLast: { color: p.textSecondary, fontSize: Typography.fontSizeSM, flex: 1 },
    unreadBadge: {
      borderRadius: Radii.full,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    unreadText: { color: p.white, fontSize: 10, fontWeight: Typography.fontWeightBold },
    dealStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dealDot: { width: 6, height: 6, borderRadius: Radii.full },
    dealStatus: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    backBtn: { padding: 2 },
    chatHeaderInfo: { flex: 1, gap: 2 },
    chatName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    encryptNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
      backgroundColor: p.surface,
    },
    encryptNoticeText: { color: p.textMuted, fontSize: 11, flex: 1, lineHeight: 15 },
    messageList: { padding: Spacing.lg, gap: Spacing.sm },
    messageBubble: { maxWidth: '78%', padding: Spacing.md, borderRadius: Radii.lg, gap: 4 },
    myBubble: {
      alignSelf: 'flex-end',
      backgroundColor: p.accent,
      borderBottomRightRadius: Radii.sm,
    },
    theirBubble: {
      alignSelf: 'flex-start',
      backgroundColor: p.card,
      borderWidth: 0.5,
      borderColor: p.border,
      borderBottomLeftRadius: Radii.sm,
    },
    bubbleSender: {
      color: p.textMuted,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
    },
    bubbleText: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 18 },
    myBubbleText: { color: p.accentOn },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end' },
    bubbleTime: { color: p.textMuted, fontSize: 10 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: p.border,
      backgroundColor: p.card,
    },
    input: {
      flex: 1,
      backgroundColor: p.surface,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      borderColor: p.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      maxHeight: 100,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: Radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm, margin: Spacing.lg },
    emptyTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    emptyDesc: {
      color: p.textMuted,
      fontSize: Typography.fontSizeSM,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
