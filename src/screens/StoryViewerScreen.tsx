import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Trash2, Eye, Heart, MessageCircle, Send } from 'lucide-react-native';
import { Spacing, Typography, Radii } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Avatar } from '../components/ui/Avatar';
import { useStoriesStore } from '../store/useStoriesStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  deleteStory,
  markStorySeen,
  groupStoriesByAuthor,
  toggleStoryLike,
  fetchStoryComments,
  addStoryComment,
  deleteStoryComment,
  StoryComment,
} from '../lib/sync/stories';

const IMAGE_DURATION_MS = 5000;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  initialAuthorIndex: number;
  onClose: () => void;
}

export const StoryViewerScreen: React.FC<Props> = ({ initialAuthorIndex, onClose }) => {
  const { palette } = useTheme();
  // Select the raw array (stable ref) and derive groups via useMemo. Calling
  // s.groupedByAuthor() inside the selector returns a fresh array every render,
  // which trips zustand v5's snapshot guard → infinite re-render → crash.
  const stories = useStoriesStore((s) => s.stories);
  const groups = useMemo(() => groupStoriesByAuthor(stories), [stories]);
  const markSeenLocal = useStoriesStore((s) => s.markSeenLocal);
  const removeOne = useStoriesStore((s) => s.removeOne);
  const toggleLikeLocal = useStoriesStore((s) => s.toggleLikeLocal);
  const applyCommentDelta = useStoriesStore((s) => s.applyCommentDelta);
  const me = useAuthStore((s) => s.user);

  const [authorIdx, setAuthorIdx] = useState(Math.max(0, Math.min(initialAuthorIndex, groups.length - 1)));
  const [storyIdx, setStoryIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Comments panel state.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const author = groups[authorIdx];
  const story = author?.stories[storyIdx];

  const player = useVideoPlayer(story?.type === 'video' ? story.url : null, (p) => {
    p.muted = false;
    p.loop = false;
    p.play();
  });

  // Mark seen when story changes
  useEffect(() => {
    if (!story) return;
    markStorySeen(story.id).catch(() => undefined);
    markSeenLocal(story.id);
  }, [story?.id]);

  // Pause/resume the video when the comments panel opens or closes.
  useEffect(() => {
    if (story?.type !== 'video') return;
    try {
      if (commentsOpen) player.pause();
      else player.play();
    } catch {
      /* player may be released mid-transition */
    }
  }, [commentsOpen, story?.id]);

  // Drive progress bar. Held while paused (long-press) or while the comments
  // panel is open, so a story never auto-advances behind an open panel.
  useEffect(() => {
    if (!story) return;
    if (paused || commentsOpen) {
      animRef.current?.stop();
      return;
    }
    progress.setValue(0);
    setLoading(true);
    const dur = story.type === 'video' ? story.durationMs ?? 8000 : IMAGE_DURATION_MS;
    animRef.current?.stop();
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: dur,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) advance(1);
    });
    return () => {
      animRef.current?.stop();
    };
  }, [story?.id, paused, commentsOpen]);

  if (!author || !story) {
    return (
      <View style={styles.full}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const advance = (dir: 1 | -1) => {
    const nextStory = storyIdx + dir;
    if (nextStory >= 0 && nextStory < author.stories.length) {
      setStoryIdx(nextStory);
      return;
    }
    const nextAuthor = authorIdx + dir;
    if (nextAuthor >= 0 && nextAuthor < groups.length) {
      setAuthorIdx(nextAuthor);
      setStoryIdx(dir === 1 ? 0 : groups[nextAuthor].stories.length - 1);
      return;
    }
    onClose();
  };

  const onLongPressIn = () => {
    setPaused(true);
    animRef.current?.stop();
  };
  const onLongPressOut = () => {
    setPaused(false);
  };

  const isMine = me?.id === author.userId;

  const handleDelete = () => {
    Alert.alert('Delete story?', 'This will remove it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStory(story.id, story.storagePath);
            removeOne(story.id);
            if (author.stories.length === 1) onClose();
            else advance(1);
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Try again.');
          }
        },
      },
    ]);
  };

  const handleLike = () => {
    const wasLiked = story.likedByMe;
    toggleLikeLocal(story.id); // optimistic
    toggleStoryLike(story.id, wasLiked).catch(() => {
      toggleLikeLocal(story.id); // revert on failure
    });
  };

  const openComments = async () => {
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      setComments(await fetchStoryComments(story.id));
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const closeComments = () => {
    setCommentsOpen(false);
    setCommentText('');
  };

  const handleSendComment = async () => {
    const body = commentText.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const created = await addStoryComment(story.id, body);
      setComments((prev) => [...prev, created]);
      setCommentText('');
      applyCommentDelta(story.id, 1);
    } catch (e: any) {
      Alert.alert('Could not post comment', e?.message ?? 'Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (c: StoryComment) => {
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStoryComment(c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
            applyCommentDelta(story.id, -1);
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.full}>
      <StatusBar barStyle="light-content" />
      <View style={styles.media}>
        {story.type === 'video' ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: story.url }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
          />
        )}
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Top gradient + progress bars + header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <View style={styles.progressRow}>
        {author.stories.map((_, i) => {
          let widthPct: Animated.AnimatedInterpolation<string> | string = '0%';
          if (i < storyIdx) widthPct = '100%';
          else if (i === storyIdx)
            widthPct = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
          return (
            <View key={i} style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: widthPct as any }]} />
            </View>
          );
        })}
      </View>

      <View style={styles.header}>
        <Avatar
          initials={author.userAvatar}
          imageUrl={author.userAvatarUrl}
          size={36}
          accent={author.userRole === 'investor' ? 'reality' : author.userRole === 'admin' ? 'admin' : 'dreamer'}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{author.userName}</Text>
          <Text style={styles.timeText}>{relativeTime(story.createdAt)}</Text>
        </View>
        {isMine && (
          <Pressable onPress={handleDelete} style={styles.headerBtn} hitSlop={8}>
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        )}
        <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
          <X size={20} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {!!story.caption && (
        <View style={styles.captionBox}>
          <Text style={styles.captionText}>{story.caption}</Text>
        </View>
      )}

      {/* Tap-zones */}
      <Pressable
        style={styles.leftZone}
        onPress={() => advance(-1)}
        onLongPress={onLongPressIn}
        onPressOut={onLongPressOut}
        delayLongPress={180}
      />
      <Pressable
        style={styles.rightZone}
        onPress={() => advance(1)}
        onLongPress={onLongPressIn}
        onPressOut={onLongPressOut}
        delayLongPress={180}
      />

      {/* Bottom gradient + engagement bar (rendered after tap-zones so the
          buttons receive touches). */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      <View style={styles.bottomBar}>
        <Pressable style={styles.commentPill} onPress={openComments}>
          <MessageCircle size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          <Text style={styles.commentPillText} numberOfLines={1}>
            {story.commentCount > 0
              ? `View ${story.commentCount} ${story.commentCount === 1 ? 'comment' : 'comments'}`
              : 'Add a comment…'}
          </Text>
        </Pressable>
        {isMine && (
          <View style={styles.ownerStat}>
            <Eye size={15} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.statText}>{story.viewCount}</Text>
          </View>
        )}
        <Pressable style={styles.likeBtn} onPress={handleLike} hitSlop={8}>
          <Heart
            size={22}
            color={story.likedByMe ? '#FF3B5C' : '#FFFFFF'}
            fill={story.likedByMe ? '#FF3B5C' : 'transparent'}
            strokeWidth={2}
          />
          {story.likeCount > 0 && <Text style={styles.statText}>{story.likeCount}</Text>}
        </Pressable>
      </View>

      {/* Comments panel */}
      <Modal
        visible={commentsOpen}
        transparent
        animationType="slide"
        onRequestClose={closeComments}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={closeComments} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.panelWrap}
        >
          <View style={[styles.commentsPanel, { backgroundColor: palette.background }]}>
            <View style={styles.panelGrabber} />
            <View style={styles.commentsHeader}>
              <Text style={[styles.commentsTitle, { color: palette.textPrimary }]}>
                Comments{story.commentCount > 0 ? ` · ${story.commentCount}` : ''}
              </Text>
              <Pressable onPress={closeComments} hitSlop={8}>
                <X size={20} color={palette.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            {loadingComments ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator color={palette.accent} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={styles.commentsList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={[styles.emptyComments, { color: palette.textMuted }]}>
                    No comments yet. Be the first to reply.
                  </Text>
                }
                renderItem={({ item }) => {
                  const canDelete = item.userId === me?.id || isMine;
                  return (
                    <Pressable
                      style={styles.commentRow}
                      onLongPress={canDelete ? () => handleDeleteComment(item) : undefined}
                      delayLongPress={350}
                    >
                      <Avatar initials={item.authorAvatar} imageUrl={item.authorAvatarUrl} size={32} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentMeta}>
                          <Text style={[styles.commentAuthor, { color: palette.textPrimary }]}>
                            {item.authorName}
                          </Text>
                          <Text style={[styles.commentTime, { color: palette.textMuted }]}>
                            {relativeTime(item.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.commentBody, { color: palette.textSecondary }]}>
                          {item.body}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={[styles.commentInputRow, { borderTopColor: palette.border }]}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment…"
                placeholderTextColor={palette.textMuted}
                style={[styles.commentInput, { color: palette.textPrimary, backgroundColor: palette.card }]}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  { backgroundColor: commentText.trim() ? palette.accent : palette.card },
                ]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={palette.accentOn} />
                ) : (
                  <Send
                    size={17}
                    color={commentText.trim() ? palette.accentOn : palette.textMuted}
                    strokeWidth={2}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000000' },
  media: { ...StyleSheet.absoluteFillObject },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  topGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  progressRow: {
    position: 'absolute',
    top: 44,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 2 },
  header: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightBold,
    letterSpacing: 0.2,
  },
  timeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: Typography.fontWeightMedium,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  captionBox: {
    position: 'absolute',
    bottom: 96,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSizeMD,
    fontWeight: Typography.fontWeightSemiBold,
    textAlign: 'center',
  },
  leftZone: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '33%' },
  rightZone: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '67%' },
  bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
  bottomBar: {
    position: 'absolute',
    bottom: 26,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  commentPillText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightMedium,
  },
  ownerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  statText: { color: '#FFFFFF', fontSize: 12, fontWeight: Typography.fontWeightSemiBold },
  // ── comments modal ──
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  panelWrap: { flex: 1, justifyContent: 'flex-end' },
  commentsPanel: {
    height: SCREEN_H * 0.66,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingTop: Spacing.sm,
  },
  panelGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  commentsTitle: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold },
  commentsLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  commentsList: { padding: Spacing.lg, gap: Spacing.lg, flexGrow: 1 },
  emptyComments: {
    textAlign: 'center',
    fontSize: Typography.fontSizeSM,
    marginTop: Spacing.xxl,
  },
  commentRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  commentAuthor: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: Typography.fontSizeSM, lineHeight: 19 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizeSM,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
