import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Zap, TrendingUp, Briefcase } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { RealityBadge } from '../components/ui/RealityBadge';
import { Screen } from '../components/ui/Screen';
import { InvestorControlPanel } from '../components/investor';
import { useFeedStore } from '../store/useFeedStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDealsStore } from '../store/useDealsStore';
import { useFollowsStore } from '../store/useFollowsStore';

interface Props {
  onOpenPipeline: () => void;
  onOpenProfile: (userId: string) => void;
}

export const InvestorScreen: React.FC<Props> = ({ onOpenPipeline, onOpenProfile }) => {
  const { palette } = useTheme();
  const riskFilter = useFeedStore((s) => s.riskFilter);
  const rewardFilter = useFeedStore((s) => s.rewardFilter);
  const posts = useFeedStore((s) => s.posts);
  const activeFeed = useFeedStore((s) => s.activeFeed);
  const user = useAuthStore((s) => s.user);
  const allUsers = useAuthStore((s) => s.users);
  const deals = useDealsStore((s) => s.items);
  const addDeal = useDealsStore((s) => s.add);
  const followEdges = useFollowsStore((s) => s.edges);
  const follow = useFollowsStore((s) => s.follow);
  const unfollow = useFollowsStore((s) => s.unfollow);
  const isFollowing = (followerId: string, followeeId: string) =>
    (followEdges[followerId] ?? []).includes(followeeId);

  const filteredDeals = posts
    .filter((p) => !p.removed)
    .filter((p) => p.type === activeFeed)
    .filter((p) => p.riskScore <= riskFilter && p.rewardScore >= rewardFilter);

  const myDeals = user ? deals.filter((d) => d.investorId === user.id) : [];
  const s = styles(palette);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{user?.role === 'investor' ? 'Control Room' : 'Investors'}</Text>
          {user?.role === 'investor' && (
            <TouchableOpacity style={s.pipelineBtn} onPress={onOpenPipeline}>
              <Briefcase size={14} color={palette.reality} strokeWidth={1.6} />
              <Text style={[s.pipelineText, { color: palette.reality }]}>Pipeline · {myDeals.length}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsContent}>
          {[
            { label: 'Active Deals', value: filteredDeals.length.toString(), color: palette.reality },
            {
              label: 'Avg Risk',
              value: (
                filteredDeals.reduce((a, b) => a + b.riskScore, 0) / (filteredDeals.length || 1)
              ).toFixed(1),
              color: palette.textSecondary,
            },
            {
              label: 'Avg Reward',
              value: (
                filteredDeals.reduce((a, b) => a + b.rewardScore, 0) / (filteredDeals.length || 1)
              ).toFixed(1),
              color: palette.textSecondary,
            },
            { label: 'Pipeline', value: myDeals.length.toString(), color: palette.accent },
          ].map(({ label, value, color }) => (
            <GlassCard key={label} style={s.statCard}>
              <Text style={[s.statValue, { color }]}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </GlassCard>
          ))}
        </ScrollView>

        <View style={s.controlWrap}>
          <InvestorControlPanel />
        </View>

        <View style={s.dealsSection}>
          <Text style={s.sectionTitle}>Matching Opportunities</Text>

          {filteredDeals.map((deal) => (
            <GlassCard key={deal.id} accent="reality" style={s.dealCard}>
              <View style={s.dealHeader}>
                <TouchableOpacity onPress={() => onOpenProfile(deal.userId)}>
                  <Avatar initials={deal.userAvatar} size={38} accent="reality" />
                </TouchableOpacity>
                <View style={s.dealInfo}>
                  <Text style={s.dealName}>{deal.userName}</Text>
                  <Text style={s.dealIndustry}>
                    {deal.industry} · {deal.createdAt}
                  </Text>
                </View>
                <RealityBadge level={deal.verificationLevel} size={36} />
              </View>

              <Text style={s.dealTitle}>{deal.milestoneTitle}</Text>

              <View style={s.rrSection}>
                <View style={s.rrRow}>
                  <Text style={s.rrLabel}>Risk</Text>
                  <View style={s.rrBar}>
                    <View
                      style={[
                        s.rrFill,
                        { width: `${deal.riskScore * 10}%`, backgroundColor: palette.warning },
                      ]}
                    />
                  </View>
                  <Text style={[s.rrVal, { color: palette.warning }]}>{deal.riskScore}</Text>
                </View>
                <View style={s.rrRow}>
                  <Text style={s.rrLabel}>Reward</Text>
                  <View style={s.rrBar}>
                    <View
                      style={[
                        s.rrFill,
                        { width: `${deal.rewardScore * 10}%`, backgroundColor: palette.success },
                      ]}
                    />
                  </View>
                  <Text style={[s.rrVal, { color: palette.success }]}>{deal.rewardScore}</Text>
                </View>
              </View>

              {deal.fundingGoal && (
                <Text style={s.fundingLabel}>
                  {deal.currentFunding} raised of {deal.fundingGoal}
                </Text>
              )}

              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={[s.quickConnect, { borderColor: palette.realityBorder }]}
                  onPress={() => {
                    if (!user) return;
                    addDeal({
                      investorId: user.id,
                      dreamerId: deal.userId,
                      postId: deal.id,
                      stage: 'exploring',
                      notes: `Tracked from feed · ${deal.milestoneTitle}`,
                    });
                  }}
                >
                  <Zap size={13} color={palette.reality} strokeWidth={1.6} />
                  <Text style={[s.quickConnectText, { color: palette.reality }]}>Add to pipeline</Text>
                </TouchableOpacity>
                {user && (
                  <TouchableOpacity
                    style={[
                      s.followBtn,
                      isFollowing(user.id, deal.userId) && { backgroundColor: palette.accentSubtle },
                    ]}
                    onPress={() =>
                      isFollowing(user.id, deal.userId)
                        ? unfollow(user.id, deal.userId)
                        : follow(user.id, deal.userId)
                    }
                  >
                    <Text style={[s.followText, { color: palette.accent }]}>
                      {isFollowing(user.id, deal.userId) ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          ))}

          {filteredDeals.length === 0 && (
            <GlassCard style={s.emptyCard}>
              <TrendingUp size={28} color={palette.textMuted} />
              <Text style={s.emptyText}>No deals match your current filter.</Text>
              <Text style={s.emptyHint}>Adjust the Risk/Reward sliders above.</Text>
            </GlassCard>
          )}
        </View>

        <View style={s.watchSection}>
          <Text style={s.sectionTitle}>On Your Radar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.watchContent}>
            {allUsers
              .filter((u) => u.role === 'dreamer' && !u.suspended)
              .map((u) => (
                <TouchableOpacity key={u.id} onPress={() => onOpenProfile(u.id)}>
                  <GlassCard style={s.watchCard}>
                    <Avatar initials={u.avatar} size={36} accent="dreamer" />
                    <Text style={s.watchName}>{u.name.split(' ')[0]}</Text>
                    <View
                      style={[
                        s.pulseDot,
                        { backgroundColor: u.momentumScore > 85 ? palette.accent : palette.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        s.pulseScore,
                        { color: u.momentumScore > 85 ? palette.accent : palette.textMuted },
                      ]}
                    >
                      {u.momentumScore}
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              ))}
          </ScrollView>
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
      paddingBottom: Spacing.sm,
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    pipelineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.realityBorder,
      backgroundColor: p.realitySubtle,
    },
    pipelineText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    statsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: { padding: Spacing.md, alignItems: 'center', minWidth: 90, gap: 4 },
    statValue: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold },
    statLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    controlWrap: { marginHorizontal: Spacing.lg, marginVertical: Spacing.md },
    dealsSection: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      marginBottom: Spacing.xs,
    },
    dealCard: { padding: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
    dealHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dealInfo: { flex: 1 },
    dealName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    dealIndustry: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    dealTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightMedium,
    },
    rrSection: { gap: Spacing.xs },
    rrRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    rrLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS, width: 50 },
    rrBar: {
      flex: 1,
      height: 4,
      backgroundColor: p.surface,
      borderRadius: Radii.full,
      overflow: 'hidden',
    },
    rrFill: { height: '100%', borderRadius: Radii.full },
    rrVal: {
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightBold,
      width: 26,
      textAlign: 'right',
    },
    fundingLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm },
    quickConnect: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
    },
    quickConnectText: {
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    followBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
    },
    followText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    emptyCard: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
    emptyText: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    emptyHint: { color: p.textMuted, fontSize: Typography.fontSizeSM },
    watchSection: { marginBottom: Spacing.xxl, gap: Spacing.sm, paddingLeft: Spacing.lg },
    watchContent: { gap: Spacing.sm, paddingRight: Spacing.lg },
    watchCard: { padding: Spacing.md, alignItems: 'center', gap: 5, minWidth: 80 },
    watchName: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightMedium,
    },
    pulseDot: { width: 6, height: 6, borderRadius: Radii.full },
    pulseScore: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold },
  });
