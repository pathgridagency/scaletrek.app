import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Plus, TrendingUp, Award, Calendar } from 'lucide-react-native';
import { Radii, Spacing, Typography, accentFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { RealityBadge } from '../components/ui/RealityBadge';
import { MomentumPill } from '../components/ui/MomentumPill';
import { Screen } from '../components/ui/Screen';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';

interface Props {
  onCreatePost: () => void;
  onEditProfile: () => void;
}

export const ShowcaseScreen: React.FC<Props> = ({ onCreatePost, onEditProfile }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const posts = useFeedStore((s) => s.posts);

  if (!user) return null;

  const userPosts = posts.filter((p) => p.userId === user.id && !p.removed);
  const isDreamer = user.role === 'dreamer';
  const accentKind = user.role === 'admin' ? 'admin' : isDreamer ? 'dreamer' : 'reality';
  const a = accentFor(palette, accentKind);
  const s = styles(palette);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Showcase</Text>
          <TouchableOpacity style={s.addBtn} onPress={onCreatePost}>
            <Plus size={14} color={a.primary} strokeWidth={1.8} />
            <Text style={[s.addText, { color: a.primary }]}>New Milestone</Text>
          </TouchableOpacity>
        </View>

        <GlassCard accent={accentKind} style={s.profileCard}>
          <View style={s.profileRow}>
            <Avatar initials={user.avatar} size={56} accent={accentKind} />
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{user.name}</Text>
              <Text style={s.profileUsername}>{user.username}</Text>
              <Text style={s.profileBio} numberOfLines={2}>
                {user.bio || 'Add a short bio to tell investors what you are building.'}
              </Text>
            </View>
            <RealityBadge level={user.verificationLevel} size={52} />
          </View>

          <View style={s.statsRow}>
            {[
              { label: 'Showcases', value: userPosts.length },
              { label: 'Followers', value: user.followers.toLocaleString() },
              { label: 'Following', value: user.following },
            ].map(({ label, value }) => (
              <View key={label} style={s.stat}>
                <Text style={[s.statValue, { color: a.primary }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={s.momentumRow}>
            <TrendingUp size={13} color={palette.textMuted} />
            <Text style={s.momentumLabel}>Momentum Score</Text>
            <MomentumPill score={user.momentumScore} />
            <TouchableOpacity onPress={onEditProfile} style={s.editBtn}>
              <Text style={[s.editText, { color: a.primary }]}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <View style={s.timelineSection}>
          <Text style={s.sectionTitle}>Proof-of-Work Timeline</Text>

          {userPosts.length === 0 ? (
            <GlassCard style={s.emptyCard}>
              <Award size={28} color={palette.textMuted} />
              <Text style={s.emptyTitle}>No milestones yet</Text>
              <Text style={s.emptyDesc}>
                Post your first milestone to build your proof-of-work track record.
              </Text>
              <TouchableOpacity onPress={onCreatePost} style={[s.cta, { borderColor: a.primary }]}>
                <Plus size={14} color={a.primary} strokeWidth={1.8} />
                <Text style={[s.ctaText, { color: a.primary }]}>Post first milestone</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            userPosts.map((post, index) => (
              <View key={post.id} style={s.timelineItem}>
                {index < userPosts.length - 1 && (
                  <View style={[s.timelineLine, { backgroundColor: a.primary + '40' }]} />
                )}
                <View
                  style={[
                    s.timelineDot,
                    { backgroundColor: a.primary, borderColor: palette.background },
                  ]}
                />
                <GlassCard accent={accentKind} style={s.timelineCard}>
                  <View style={s.timelineHeader}>
                    <Calendar size={12} color={palette.textMuted} />
                    <Text style={s.timelineDate}>{post.createdAt}</Text>
                    <MomentumPill score={post.momentumScore} />
                  </View>
                  <Text style={s.timelineTitle}>{post.milestoneTitle}</Text>
                  <Text style={s.timelineDesc} numberOfLines={2}>
                    {post.description}
                  </Text>
                  {post.metric && (
                    <View style={[s.metricRow, { borderLeftColor: a.primary }]}>
                      <Text style={[s.metricVal, { color: a.primary }]}>{post.metric.value}</Text>
                      <Text style={s.metricLbl}>{post.metric.label}</Text>
                    </View>
                  )}
                  <View style={s.timelineStats}>
                    <Text style={s.timelineStat}>{post.likes} likes</Text>
                    <Text style={s.timelineStat}>{post.comments} comments</Text>
                    <Text style={s.timelineStat}>{post.signals} signals</Text>
                  </View>
                </GlassCard>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.5,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
      backgroundColor: p.accentSubtle,
    },
    addText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    profileCard: {
      margin: Spacing.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    profileRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    profileInfo: { flex: 1, gap: 3 },
    profileName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeLG,
      fontWeight: Typography.fontWeightBold,
    },
    profileUsername: { color: p.textMuted, fontSize: Typography.fontSizeSM },
    profileBio: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      lineHeight: 16,
      marginTop: 4,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: Spacing.md,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: p.border,
    },
    stat: { alignItems: 'center', gap: 2 },
    statValue: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
    statLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    momentumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    momentumLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS, flex: 1 },
    editBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
    editText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    timelineSection: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.sm,
    },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
    },
    timelineItem: {
      position: 'relative',
      paddingLeft: Spacing.xl,
      marginBottom: Spacing.md,
    },
    timelineLine: {
      position: 'absolute',
      left: 7,
      top: 20,
      bottom: -Spacing.md,
      width: 1,
    },
    timelineDot: {
      position: 'absolute',
      left: 2,
      top: 14,
      width: 12,
      height: 12,
      borderRadius: Radii.full,
      borderWidth: 2,
    },
    timelineCard: { padding: Spacing.md, gap: Spacing.sm },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    timelineDate: { color: p.textMuted, fontSize: Typography.fontSizeXS, flex: 1 },
    timelineTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightBold,
    },
    timelineDesc: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      lineHeight: 16,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.sm,
      paddingLeft: Spacing.sm,
      borderLeftWidth: 2,
      marginVertical: 2,
    },
    metricVal: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold },
    metricLbl: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    timelineStats: { flexDirection: 'row', gap: Spacing.md },
    timelineStat: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    emptyCard: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
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
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      marginTop: Spacing.sm,
    },
    ctaText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
  });
