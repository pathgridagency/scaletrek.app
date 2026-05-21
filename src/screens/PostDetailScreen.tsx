import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Heart, CornerUpLeft, Send, MoreHorizontal, X } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { FeedCard } from '../components/feed/FeedCard';
import { useFeedStore } from '../store/useFeedStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCommentsStore } from '../store/useCommentsStore';
import { Comment } from '../lib/sync/comments';
import { MessageCircle } from 'lucide-react-native';

interface Props {
  postId: string;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

const ago = (iso: string): string => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export const PostDetailScreen: React.FC<Props> = ({ postId, onClose, onOpenProfile }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const post = useFeedStore((s) => s.posts.find((p) => p.id === postId));
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const toggleSignal = useFeedStore((s) => s.toggleSignal);

  const comments = useCommentsStore((s) => s.byPost[postId]);
  const loading = useCommentsStore((s) => s.loading[postId]);
  const load = useCommentsStore((s) => s.load);
  const addComment = useCommentsStore((s) => s.add);
  const editComment = useCommentsStore((s) => s.edit);
  const removeComment = useCommentsStore((s) => s.remove);
  const toggleCommentLike = useCommentsStore((s) => s.toggleLike);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load(postId);
  }, [postId, load]);

  // Top-level comments, each with its replies, removed ones dropped.
  const thread = useMemo(() => {
    const list = (comments ?? []).filter((c) => !c.removed);
    const roots = list.filter((c) => !c.parentId);
    return roots.map((root) => ({
      root,
      replies: list.filter((c) => c.parentId === root.id),
    }));
  }, [comments]);

  const s = styles(palette);

  const submit = async () => {
    const text = draft.trim();
    if (!text || !user || busy) return;
    setBusy(true);
    try {
      if (editing) {
        await editComment(postId, editing, text);
      } else {
        await addComment(postId, user.id, text, replyTo?.id ?? null);
      }
      setDraft('');
      setReplyTo(null);
      setEditing(null);
    } catch {
      Alert.alert('Could not post', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onLongPressOwn = (c: Comment) => {
    if (!user || c.userId !== user.id) return;
    Alert.alert('Comment', undefined, [
      { text: 'Edit', onPress: () => { setEditing(c.id); setReplyTo(null); setDraft(c.content); } },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeComment(postId, c.id).catch(() => {}),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderComment = (c: Comment, isReply: boolean) => {
    const mine = user?.id === c.userId;
    return (
      <View key={c.id} style={[s.comment, isReply && s.reply]}>
        <TouchableOpacity onPress={() => onOpenProfile(c.userId)}>
          <Avatar initials={c.userAvatar} imageUrl={c.userAvatarUrl} size={isReply ? 28 : 34} accent="dreamer" />
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={s.commentTop}>
            <Text style={s.commentName} numberOfLines={1}>{c.userName}</Text>
            <Text style={s.commentTime}>{ago(c.createdAt)}{c.editedAt ? ' · edited' : ''}</Text>
            {mine && (
              <TouchableOpacity onPress={() => onLongPressOwn(c)} hitSlop={8}>
                <MoreHorizontal size={15} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.commentBody}>{c.content}</Text>
          <View style={s.commentActions}>
            <TouchableOpacity
              style={s.commentAction}
              onPress={() => user && toggleCommentLike(postId, c.id, user.id)}
            >
              <Heart
                size={13}
                color={c.likedByMe ? palette.error : palette.textMuted}
                fill={c.likedByMe ? palette.error : 'transparent'}
                strokeWidth={1.8}
              />
              {c.likeCount > 0 && <Text style={s.commentActionText}>{c.likeCount}</Text>}
            </TouchableOpacity>
            {!isReply && (
              <TouchableOpacity
                style={s.commentAction}
                onPress={() => { setReplyTo({ id: c.id, name: c.userName }); setEditing(null); }}
              >
                <CornerUpLeft size={13} color={palette.textMuted} strokeWidth={1.8} />
                <Text style={s.commentActionText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.iconBtn} activeOpacity={0.7}>
          <ArrowLeft size={20} color={palette.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Post</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }} keyboardShouldPersistTaps="handled">
          {post ? (
            <FeedCard
              post={post}
              liked={user ? post.likedBy?.includes(user.id) : false}
              signaled={user ? post.signaledBy?.includes(user.id) : false}
              onLike={(id) => user && toggleLike(id, user.id)}
              onSignal={(id) => user && toggleSignal(id, user.id)}
              onAuthorPress={onOpenProfile}
            />
          ) : (
            <EmptyState title="Post unavailable" description="This post could not be loaded." />
          )}

          <Text style={s.sectionLabel}>
            Comments{comments?.length ? ` · ${thread.reduce((n, t) => n + 1 + t.replies.length, 0)}` : ''}
          </Text>

          {loading && !comments ? (
            <ActivityIndicator color={palette.accent} style={{ marginTop: Spacing.lg }} />
          ) : thread.length === 0 ? (
            <View style={{ paddingVertical: Spacing.xl }}>
              <EmptyState
                icon={<MessageCircle size={26} color={palette.accent} strokeWidth={1.8} />}
                title="No comments yet"
                description="Be the first to weigh in."
              />
            </View>
          ) : (
            thread.map(({ root, replies }) => (
              <View key={root.id}>
                {renderComment(root, false)}
                {replies.map((r) => renderComment(r, true))}
              </View>
            ))
          )}
        </ScrollView>

        {user && (
          <View style={s.composerWrap}>
            {(replyTo || editing) && (
              <View style={s.composerHint}>
                <Text style={s.composerHintText} numberOfLines={1}>
                  {editing ? 'Editing comment' : `Replying to ${replyTo?.name}`}
                </Text>
                <TouchableOpacity
                  onPress={() => { setReplyTo(null); setEditing(null); setDraft(''); }}
                  hitSlop={8}
                >
                  <X size={14} color={palette.textMuted} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.composer}>
              <TextInput
                style={s.input}
                placeholder="Add a comment…"
                placeholderTextColor={palette.textDim}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <TouchableOpacity
                onPress={submit}
                disabled={!draft.trim() || busy}
                style={[s.sendBtn, { opacity: !draft.trim() || busy ? 0.4 : 1 }]}
                activeOpacity={0.8}
              >
                <Send size={16} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.border,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: p.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightBold,
    },
    sectionLabel: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      paddingHorizontal: Spacing.xl,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    comment: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
    },
    reply: { paddingLeft: Spacing.xl + Spacing.xxl },
    commentTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    commentName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
      flexShrink: 1,
    },
    commentTime: { color: p.textMuted, fontSize: 11, flex: 1 },
    commentBody: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 19 },
    commentActions: { flexDirection: 'row', gap: Spacing.lg, marginTop: 2 },
    commentAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    commentActionText: { color: p.textMuted, fontSize: 11, fontWeight: Typography.fontWeightSemiBold },
    composerWrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
      backgroundColor: p.card,
    },
    composerHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
    },
    composerHintText: { color: p.textMuted, fontSize: Typography.fontSizeXS, flex: 1 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
      padding: Spacing.md,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      minHeight: 40,
      backgroundColor: p.surface,
      borderRadius: Radii.lg,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
