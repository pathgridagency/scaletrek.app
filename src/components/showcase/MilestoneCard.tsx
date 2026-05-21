import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Heart, MessageCircle, Bookmark, Sparkles } from 'lucide-react-native';
import { Radii, Spacing, Typography, accentFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ShowcasePost } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';
import { RealityBadge } from '../ui/RealityBadge';
import { MomentumPill } from '../ui/MomentumPill';
import { MetricTicker } from './MetricTicker';

interface Props {
  post: ShowcasePost;
  liked?: boolean;
  signaled?: boolean;
  onPress?: (post: ShowcasePost) => void;
  onLike?: (id: string) => void;
  onSignal?: (id: string) => void;
  onComment?: (id: string) => void;
  onAuthorPress?: (userId: string) => void;
}

const HERO_HEIGHT = Math.min(260, Math.round(Dimensions.get('window').width * 0.56));

const parseAmount = (s?: string) => parseFloat((s ?? '0').replace(/[^0-9.]/g, '')) || 0;

export const MilestoneCard: React.FC<Props> = ({
  post,
  liked,
  signaled,
  onPress,
  onLike,
  onSignal,
  onComment,
  onAuthorPress,
}) => {
  const { palette } = useTheme();
  const isDreamer = post.type === 'dreamer';
  const accentKind = isDreamer ? 'dreamer' : 'reality';
  const a = accentFor(palette, accentKind);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const fundingPct = post.fundingGoal
    ? Math.min(100, (parseAmount(post.currentFunding) / parseAmount(post.fundingGoal)) * 100)
    : 0;

  const verifiedMetric = post.verificationLevel === 'verified' || post.verificationLevel === 'elite';

  const s = styles(palette);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress?.(post)}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <View style={[s.card, { borderColor: a.border }]}>
          <View style={[s.hero, { backgroundColor: a.subtle }]}>
            {post.mediaType === 'image' && post.mediaUrl ? (
              <Image
                source={{ uri: post.mediaUrl }}
                style={s.heroImage}
                contentFit="cover"
                transition={250}
              />
            ) : (
              <LinearGradient
                colors={[a.primary + '33', a.primary + '08', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroFallback}
              >
                <Sparkles size={32} color={a.primary} strokeWidth={1.4} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={s.heroScrim}
              pointerEvents="none"
            />
            <View style={s.heroBadgeRow}>
              <View style={[s.typePill, { backgroundColor: a.primary }]}>
                <Text style={s.typePillText}>
                  {isDreamer ? 'DREAMER' : 'REALITY CHECK'}
                </Text>
              </View>
              <View style={s.heroDate}>
                <Calendar size={11} color="#fff" strokeWidth={1.6} />
                <Text style={s.heroDateText}>{post.createdAt}</Text>
              </View>
            </View>
          </View>

          <View style={s.body}>
            <View style={s.authorRow}>
              <TouchableOpacity onPress={() => onAuthorPress?.(post.userId)}>
                <Avatar initials={post.userAvatar} size={40} accent={accentKind} />
              </TouchableOpacity>
              <View style={s.authorMeta}>
                <TouchableOpacity onPress={() => onAuthorPress?.(post.userId)}>
                  <Text style={s.authorName}>{post.userName}</Text>
                </TouchableOpacity>
                <Text style={s.authorIndustry}>{post.industry}</Text>
              </View>
              <View style={s.authorRight}>
                <RealityBadge level={post.verificationLevel} size={34} />
                <MomentumPill score={post.momentumScore} accentColor={a.primary} />
              </View>
            </View>

            <Text style={s.title}>{post.milestoneTitle}</Text>
            <Text style={s.description} numberOfLines={4}>
              {post.description}
            </Text>

            {post.metric ? (
              <MetricTicker
                value={post.metric.value}
                label={post.metric.label}
                unit={post.metric.unit}
                verified={verifiedMetric}
                accent={accentKind}
              />
            ) : null}

            {post.fundingGoal ? (
              <View style={s.funding}>
                <View style={s.fundingHead}>
                  <Text style={s.fundingLabel}>Funding</Text>
                  <Text style={[s.fundingPct, { color: a.primary }]}>
                    {Math.round(fundingPct)}%
                  </Text>
                </View>
                <View style={s.fundingTrack}>
                  <View
                    style={[
                      s.fundingFill,
                      { width: `${fundingPct}%`, backgroundColor: a.primary },
                    ]}
                  />
                </View>
                <Text style={s.fundingValues}>
                  {post.currentFunding} of {post.fundingGoal}
                </Text>
              </View>
            ) : null}

            {post.tags.length > 0 ? (
              <View style={s.tags}>
                {post.tags.slice(0, 5).map((tag) => (
                  <View key={tag} style={[s.tag, { borderColor: a.border }]}>
                    <Text style={[s.tagText, { color: a.primary }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => onLike?.(post.id)}>
                <Heart
                  size={15}
                  color={liked ? palette.error : palette.textSecondary}
                  fill={liked ? palette.error : 'transparent'}
                  strokeWidth={1.6}
                />
                <Text style={s.actionCount}>{post.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => onComment?.(post.id)}>
                <MessageCircle size={15} color={palette.textSecondary} strokeWidth={1.6} />
                <Text style={s.actionCount}>{post.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.signalBtn,
                  {
                    borderColor: a.border,
                    backgroundColor: signaled ? a.primary : 'transparent',
                  },
                ]}
                onPress={() => onSignal?.(post.id)}
              >
                <Bookmark
                  size={13}
                  color={signaled ? palette.accentOn : a.primary}
                  fill={signaled ? palette.accentOn : 'transparent'}
                  strokeWidth={1.6}
                />
                <Text
                  style={[s.signalText, { color: signaled ? palette.accentOn : a.primary }]}
                >
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
      marginHorizontal: Spacing.lg,
      marginVertical: Spacing.sm,
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      overflow: 'hidden',
    },
    hero: { height: HERO_HEIGHT, width: '100%', position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    heroScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
    },
    heroBadgeRow: {
      position: 'absolute',
      bottom: Spacing.md,
      left: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    typePill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radii.full,
    },
    typePillText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: 0.8,
    },
    heroDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroDateText: {
      color: '#fff',
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
    },
    body: { padding: Spacing.lg, gap: Spacing.sm },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    authorMeta: { flex: 1, gap: 2 },
    authorName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    authorIndustry: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    authorRight: { alignItems: 'center', gap: 4 },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeLG,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
      lineHeight: 22,
    },
    description: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      lineHeight: 20,
    },
    funding: { gap: 4 },
    fundingHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    fundingLabel: {
      color: p.textMuted,
      fontSize: 10,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
    },
    fundingPct: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold },
    fundingTrack: {
      height: 5,
      backgroundColor: p.surface,
      borderRadius: Radii.full,
      overflow: 'hidden',
    },
    fundingFill: { height: '100%', borderRadius: Radii.full },
    fundingValues: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: 0.5,
    },
    tagText: { fontSize: 11, fontWeight: Typography.fontWeightMedium },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      paddingTop: Spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: p.borderSubtle,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionCount: { color: p.textSecondary, fontSize: Typography.fontSizeXS },
    signalBtn: {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
      borderRadius: Radii.full,
      borderWidth: 0.5,
    },
    signalText: {
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.3,
    },
  });
