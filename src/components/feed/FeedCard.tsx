import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Heart, MessageCircle, Bookmark, Flag, Clock, AlertCircle } from 'lucide-react-native';
import { ShowcasePost } from '../../data/mockData';
import { Radii, Spacing, Typography, accentFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { RealityBadge } from '../ui/RealityBadge';
import { MediaCarousel } from './MediaCarousel';

interface Props {
  post: ShowcasePost;
  liked?: boolean;
  signaled?: boolean;
  onLike?: (id: string) => void;
  onSignal?: (id: string) => void;
  onComment?: (id: string) => void;
  onReport?: (id: string) => void;
  onPress?: (post: ShowcasePost) => void;
  onAuthorPress?: (userId: string) => void;
}

export const FeedCard: React.FC<Props> = ({
  post,
  liked,
  signaled,
  onLike,
  onSignal,
  onComment,
  onReport,
  onPress,
  onAuthorPress,
}) => {
  const { palette } = useTheme();
  const isDreamer = post.type === 'dreamer';
  const a = accentFor(palette, isDreamer ? 'dreamer' : 'reality');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.99, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const parseAmount = (s?: string) => parseFloat((s ?? '0').replace(/[^0-9.]/g, '')) || 0;
  const fundingPct = post.fundingGoal
    ? Math.min(100, (parseAmount(post.currentFunding) / parseAmount(post.fundingGoal)) * 100)
    : 0;

  const s = styles(palette);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress?.(post)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={s.card}>
          <View style={[s.accentLine, { backgroundColor: a.primary }]} />

          <View style={s.body}>
            {post.status === 'pending' && (
              <View
                style={[
                  s.statusBanner,
                  { backgroundColor: palette.warning + '18', borderColor: palette.warning + '55' },
                ]}
              >
                <Clock size={13} color={palette.warning} strokeWidth={2.2} />
                <Text style={[s.statusText, { color: palette.warning }]}>
                  Pending review — only you can see this until an admin approves it.
                </Text>
              </View>
            )}
            {post.status === 'rejected' && (
              <View
                style={[
                  s.statusBanner,
                  { backgroundColor: palette.error + '18', borderColor: palette.error + '55' },
                ]}
              >
                <AlertCircle size={13} color={palette.error} strokeWidth={2.2} />
                <Text style={[s.statusText, { color: palette.error }]} numberOfLines={2}>
                  {post.moderationReason
                    ? `Not approved: ${post.moderationReason}`
                    : 'Not approved by moderators.'}
                </Text>
              </View>
            )}

            <View style={s.header}>
              <TouchableOpacity onPress={() => onAuthorPress?.(post.userId)}>
                <Avatar initials={post.userAvatar} size={36} accent={isDreamer ? 'dreamer' : 'reality'} />
              </TouchableOpacity>
              <View style={s.headerMeta}>
                <TouchableOpacity onPress={() => onAuthorPress?.(post.userId)}>
                  <Text style={s.userName}>{post.userName}</Text>
                </TouchableOpacity>
                <Text style={s.subMeta}>
                  {post.industry} · {post.createdAt}
                </Text>
              </View>
              <View style={s.headerRight}>
                <RealityBadge level={post.verificationLevel} size={32} />
                <Text style={[s.score, { color: a.primary }]}>{post.momentumScore}</Text>
              </View>
            </View>

            <Text style={s.milestone}>{post.milestoneTitle}</Text>
            <Text style={s.description} numberOfLines={3}>
              {post.description}
            </Text>

            {post.media && post.media.length > 0 && <MediaCarousel media={post.media} />}

            {post.metric && (
              <View style={[s.metric, { borderLeftColor: a.primary }]}>
                <Text style={[s.metricValue, { color: a.primary }]}>{post.metric.value}</Text>
                <Text style={s.metricLabel}>
                  {post.metric.label}
                  {post.metric.unit ? ` · ${post.metric.unit}` : ''}
                </Text>
              </View>
            )}

            {post.fundingGoal && (
              <View style={s.fundingSection}>
                <View style={s.fundingBar}>
                  <View
                    style={[
                      s.fundingFill,
                      { width: `${fundingPct}%`, backgroundColor: a.primary },
                    ]}
                  />
                </View>
                <Text style={s.fundingText}>
                  {post.currentFunding} of {post.fundingGoal}
                </Text>
              </View>
            )}

            <View style={s.tags}>
              {post.tags.slice(0, 4).map((tag) => (
                <Text key={tag} style={s.tag}>
                  #{tag}
                </Text>
              ))}
            </View>

            <View style={s.actions}>
              <TouchableOpacity style={s.action} onPress={() => onLike?.(post.id)}>
                <Heart
                  size={14}
                  color={liked ? palette.error : palette.textSecondary}
                  fill={liked ? palette.error : 'transparent'}
                  strokeWidth={1.6}
                />
                <Text style={s.actionCount}>{post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.action} onPress={() => onComment?.(post.id)}>
                <MessageCircle size={14} color={palette.textSecondary} strokeWidth={1.6} />
                <Text style={s.actionCount}>{post.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.action} onPress={() => onReport?.(post.id)}>
                <Flag size={14} color={palette.textMuted} strokeWidth={1.5} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.signalBtn, { borderColor: a.primary + '50', backgroundColor: signaled ? a.primary : 'transparent' }]}
                onPress={() => onSignal?.(post.id)}
              >
                <Bookmark
                  size={12}
                  color={signaled ? palette.accentOn : a.primary}
                  fill={signaled ? palette.accentOn : 'transparent'}
                  strokeWidth={1.6}
                />
                <Text style={[s.signalText, { color: signaled ? palette.accentOn : a.primary }]}>
                  Signal · {post.signals}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      marginHorizontal: Spacing.lg,
      marginVertical: 6,
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      borderColor: p.border,
      overflow: 'hidden',
    },
    accentLine: { width: 2 },
    body: { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
    },
    statusText: { flex: 1, fontSize: 11, fontWeight: Typography.fontWeightSemiBold, lineHeight: 15 },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    headerMeta: { flex: 1, gap: 2 },
    userName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    subMeta: { color: p.textSecondary, fontSize: 11 },
    headerRight: { alignItems: 'center', gap: 3 },
    score: {
      fontSize: 11,
      fontWeight: Typography.fontWeightSemiBold,
    },
    milestone: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    description: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      lineHeight: 19,
    },
    metric: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.sm,
      borderLeftWidth: 2,
      paddingLeft: Spacing.sm,
      marginVertical: 2,
    },
    metricValue: {
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.5,
    },
    metricLabel: { color: p.textSecondary, fontSize: Typography.fontSizeXS },
    fundingSection: { gap: 5 },
    fundingBar: {
      height: 4,
      backgroundColor: p.surface,
      borderRadius: 999,
      overflow: 'hidden',
    },
    fundingFill: { height: '100%', borderRadius: 999 },
    fundingText: { color: p.textSecondary, fontSize: 11 },
    tags: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    tag: { color: p.accent, fontSize: 11, fontWeight: Typography.fontWeightMedium },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingTop: Spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: p.borderSubtle,
    },
    action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount: { color: p.textSecondary, fontSize: 11 },
    signalBtn: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: Spacing.sm,
      borderRadius: 999,
      borderWidth: 0.5,
    },
    signalText: { fontSize: 11, fontWeight: Typography.fontWeightSemiBold, letterSpacing: 0.2 },
  });
