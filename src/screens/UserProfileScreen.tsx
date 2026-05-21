import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  EyeOff,
  FileText,
  Flag,
  MessageCircle,
  Shield,
  ShieldOff,
  Zap,
  MapPin,
  Link as LinkIcon,
  Briefcase,
} from 'lucide-react-native';
import { Radii, Spacing, Typography, accentFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useFollowsStore } from '../store/useFollowsStore';
import { useFeedStore } from '../store/useFeedStore';
import { useChatStore } from '../store/useChatStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useModerationStore } from '../store/useModerationStore';
import { Avatar } from '../components/ui/Avatar';
import { GlassCard } from '../components/ui/GlassCard';
import { RealityBadge } from '../components/ui/RealityBadge';
import { MomentumPill } from '../components/ui/MomentumPill';
import { Screen } from '../components/ui/Screen';
import { grantReveal, listMyReveals, revokeReveal } from '../lib/sync/reveals';

interface Props {
  userId: string;
  onClose: () => void;
  onOpenChat: () => void;
  onShareDeck?: (investorId: string) => void;
}

export const UserProfileScreen: React.FC<Props> = ({ userId, onClose, onOpenChat, onShareDeck }) => {
  const { palette } = useTheme();
  const me = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const target = users.find((u) => u.id === userId);
  const posts = useFeedStore((s) => s.posts);
  const followEdges = useFollowsStore((s) => s.edges);
  const follow = useFollowsStore((s) => s.follow);
  const unfollow = useFollowsStore((s) => s.unfollow);
  const startThread = useChatStore((s) => s.startThread);
  const pushNotification = useNotificationsStore((s) => s.push);
  const blockUser = useModerationStore((s) => s.blockUser);
  const unblockUserAction = useModerationStore((s) => s.unblockUser);
  const isBlocked = useModerationStore((s) => s.isBlocked(userId));

  if (!target) {
    return (
      <Screen>
        <Text style={{ padding: Spacing.lg, color: palette.textPrimary }}>User not found.</Text>
      </Screen>
    );
  }

  const isMe = me?.id === target.id;
  const following = me ? (followEdges[me.id] ?? []).includes(target.id) : false;
  const accentKind =
    target.role === 'admin' ? 'admin' : target.role === 'investor' ? 'reality' : 'dreamer';
  const a = accentFor(palette, accentKind);
  const userPosts = posts.filter((p) => p.userId === target.id && !p.removed);
  const s = styles(palette);

  const identityHidden =
    target.role === 'investor' && target.identityRevealed === false;
  const meIsInvestor = me?.role === 'investor';
  const canOfferReveal = meIsInvestor && !isMe && target.role !== 'investor';
  const [revealedToTarget, setRevealedToTarget] = useState(false);

  useEffect(() => {
    if (!canOfferReveal) return;
    let live = true;
    listMyReveals()
      .then((ids) => {
        if (live) setRevealedToTarget(ids.includes(target.id));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [canOfferReveal, target.id]);

  const onBlockToggle = () => {
    if (!me) return;
    const verb = isBlocked ? 'Unblock' : 'Block';
    Alert.alert(
      `${verb} ${target.name}?`,
      isBlocked
        ? 'You will see their posts again.'
        : 'You won’t see their posts or be contacted by them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: verb,
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) await unblockUserAction(target.id);
              else await blockUser(target.id);
            } catch (err) {
              Alert.alert(
                `${verb} failed`,
                err instanceof Error ? err.message : String(err),
              );
            }
          },
        },
      ],
    );
  };

  const onReport = () => {
    if (!me) return;
    Alert.alert(
      'Report user?',
      'Pick a reason. ScaleTrek moderators will review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () =>
            useNotificationsStore
              .getState()
              .push({
                type: 'system',
                recipientId: me.id,
                message: `You reported ${target.name} for spam.`,
              }),
        },
        {
          text: 'Harassment',
          onPress: () =>
            useNotificationsStore
              .getState()
              .push({
                type: 'system',
                recipientId: me.id,
                message: `You reported ${target.name} for harassment.`,
              }),
        },
      ],
    );
  };

  const toggleRevealToTarget = async () => {
    try {
      if (revealedToTarget) {
        await revokeReveal(target.id);
        setRevealedToTarget(false);
      } else {
        await grantReveal(target.id);
        setRevealedToTarget(true);
      }
    } catch (err) {
      Alert.alert(
        'Could not update reveal',
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const toggleFollow = () => {
    if (!me) return;
    if (following) {
      unfollow(me.id, target.id);
    } else {
      follow(me.id, target.id);
      pushNotification({
        type: 'follow',
        recipientId: target.id,
        actorId: me.id,
        actorName: me.name,
        actorAvatar: me.avatar,
        message: 'started following you',
      });
    }
  };

  const message = () => {
    startThread({
      participantId: target.id,
      participantName: target.name,
      participantAvatar: target.avatar,
    });
    onOpenChat();
  };

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>{target.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {target.coverUrl && !identityHidden ? (
          <Image source={{ uri: target.coverUrl }} style={s.cover} contentFit="cover" />
        ) : null}

        <GlassCard accent={accentKind} style={s.card}>
          <View style={s.row}>
            <Avatar
              initials={target.avatar}
              size={64}
              accent={accentKind}
              imageUrl={identityHidden ? undefined : target.avatarUrl}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{target.name}</Text>
              <Text style={s.username}>{target.username}</Text>
              <View style={[s.roleBadge, { backgroundColor: a.subtle, borderColor: a.border }]}>
                {target.role === 'investor' ? (
                  <Shield size={11} color={a.primary} strokeWidth={1.6} />
                ) : (
                  <Zap size={11} color={a.primary} strokeWidth={1.6} />
                )}
                <Text style={[s.roleText, { color: a.primary }]}>
                  {target.role === 'investor' ? 'Investor' : target.role === 'admin' ? 'Admin' : 'Dreamer'}
                </Text>
              </View>
            </View>
            <RealityBadge level={target.verificationLevel} size={56} />
          </View>

          {identityHidden && (
            <View style={s.hiddenBanner}>
              <EyeOff size={12} color={palette.textSecondary} strokeWidth={1.6} />
              <Text style={s.hiddenText}>
                This investor stays anonymous until they engage with you.
              </Text>
            </View>
          )}

          {target.headline && !identityHidden ? <Text style={s.headline}>{target.headline}</Text> : null}
          {target.bio ? <Text style={s.bio}>{target.bio}</Text> : null}

          {!identityHidden && (target.location || target.website || target.companyName) && (
            <View style={s.detailsList}>
              {target.location && (
                <View style={s.detailRow}>
                  <MapPin size={12} color={palette.textSecondary} strokeWidth={1.8} />
                  <Text style={s.detailText}>{target.location}</Text>
                </View>
              )}
              {target.website && (
                <TouchableOpacity style={s.detailRow} onPress={() => Linking.openURL(target.website!).catch(() => {})}>
                  <LinkIcon size={12} color={palette.accent} strokeWidth={1.8} />
                  <Text style={[s.detailText, { color: palette.accent }]} numberOfLines={1}>
                    {target.website.replace(/^https?:\/\//, '')}
                  </Text>
                </TouchableOpacity>
              )}
              {target.companyName && (
                <View style={s.detailRow}>
                  <Briefcase size={12} color={palette.textSecondary} strokeWidth={1.8} />
                  <Text style={s.detailText}>
                    {target.companyName}
                    {target.sector ? ` · ${target.sector}` : ''}
                    {target.foundedYear ? ` · ${target.foundedYear}` : ''}
                    {target.teamSize ? ` · ${target.teamSize}` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!identityHidden &&
            (target.linkedinUrl || target.twitterUrl || target.instagramUrl || target.githubUrl || target.facebookUrl) && (
              <View style={s.socialsRow}>
                {[
                  { url: target.linkedinUrl, label: 'in' },
                  { url: target.twitterUrl, label: '𝕏' },
                  { url: target.instagramUrl, label: 'IG' },
                  { url: target.githubUrl, label: 'GH' },
                  { url: target.facebookUrl, label: 'f' },
                ]
                  .filter((sx) => !!sx.url)
                  .map(({ url, label }) => (
                    <TouchableOpacity
                      key={label}
                      style={[s.socialBtn, { borderColor: palette.border }]}
                      onPress={() => Linking.openURL(url as string).catch(() => {})}
                    >
                      <Text style={[s.socialLabel, { color: palette.textSecondary }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

          <View style={s.stats}>
            {[
              { label: 'Posts', value: userPosts.length },
              { label: 'Followers', value: target.followers.toLocaleString() },
              { label: 'Following', value: target.following },
            ].map(({ label, value }) => (
              <View key={label} style={s.stat}>
                <Text style={[s.statVal, { color: a.primary }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={s.momentumRow}>
            <Text style={s.momentumLabel}>Momentum</Text>
            <MomentumPill score={target.momentumScore} />
          </View>

          {!isMe && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[
                  s.followBtn,
                  following
                    ? { borderColor: palette.border, backgroundColor: palette.card }
                    : { borderColor: palette.accent, backgroundColor: palette.accent },
                ]}
                onPress={toggleFollow}
              >
                <Text
                  style={[
                    s.followText,
                    { color: following ? palette.textPrimary : palette.accentOn },
                  ]}
                >
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.msgBtn} onPress={message}>
                <MessageCircle size={14} color={palette.accent} strokeWidth={1.6} />
                <Text style={[s.msgText, { color: palette.accent }]}>Message</Text>
              </TouchableOpacity>
            </View>
          )}

          {canOfferReveal && (
            <TouchableOpacity
              onPress={toggleRevealToTarget}
              style={[
                s.revealBtn,
                {
                  borderColor: revealedToTarget ? palette.success : palette.border,
                  backgroundColor: revealedToTarget ? palette.success + '22' : palette.card,
                },
              ]}
            >
              <Text
                style={[
                  s.revealText,
                  { color: revealedToTarget ? palette.success : palette.textSecondary },
                ]}
              >
                {revealedToTarget
                  ? 'Identity revealed to this founder'
                  : 'Reveal my identity to this founder'}
              </Text>
            </TouchableOpacity>
          )}

          {!isMe && me?.role === 'dreamer' && target.role === 'investor' && onShareDeck && (
            <TouchableOpacity
              onPress={() => onShareDeck(target.id)}
              style={[s.revealBtn, { borderColor: palette.accent }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={12} color={palette.accent} strokeWidth={1.6} />
                <Text style={[s.revealText, { color: palette.accent }]}>
                  Share a pitch deck (NDA-gated)
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {!isMe && (
            <View style={s.modRow}>
              <TouchableOpacity style={s.modBtn} onPress={onReport}>
                <Flag size={12} color={palette.warning} strokeWidth={1.6} />
                <Text style={[s.modText, { color: palette.warning }]}>Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modBtn} onPress={onBlockToggle}>
                {isBlocked ? (
                  <ShieldOff size={12} color={palette.error} strokeWidth={1.6} />
                ) : (
                  <Shield size={12} color={palette.error} strokeWidth={1.6} />
                )}
                <Text style={[s.modText, { color: palette.error }]}>
                  {isBlocked ? 'Unblock' : 'Block'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassCard>

        <Text style={s.sectionTitle}>Milestones</Text>
        {userPosts.length === 0 ? (
          <GlassCard style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Text style={{ color: palette.textMuted }}>No posts yet.</Text>
          </GlassCard>
        ) : (
          userPosts.map((p) => (
            <GlassCard key={p.id} style={s.postCard}>
              <Text style={s.postTitle}>{p.milestoneTitle}</Text>
              <Text style={s.postMeta}>
                {p.industry} · {p.createdAt}
              </Text>
              <Text style={s.postDesc} numberOfLines={3}>
                {p.description}
              </Text>
            </GlassCard>
          ))
        )}
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
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    back: { padding: 4 },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
    card: { padding: Spacing.lg, gap: Spacing.md },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    name: { color: p.textPrimary, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
    username: { color: p.textMuted, fontSize: Typography.fontSizeSM },
    roleBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      marginTop: 4,
    },
    roleText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    bio: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 19 },
    cover: { width: '100%', height: 140, backgroundColor: p.surface, marginBottom: Spacing.sm },
    headline: { color: p.textPrimary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold, marginTop: 2 },
    detailsList: { gap: 4, marginTop: 2 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { color: p.textSecondary, fontSize: Typography.fontSizeXS, flexShrink: 1 },
    socialsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    socialBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.surface,
    },
    socialLabel: { fontSize: 12, fontWeight: Typography.fontWeightBold, letterSpacing: 0.3 },
    stats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: Spacing.md,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: p.border,
    },
    stat: { alignItems: 'center', gap: 2 },
    statVal: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
    statLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    momentumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    momentumLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS, flex: 1 },
    actionRow: { flexDirection: 'row', gap: Spacing.sm },
    followBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      alignItems: 'center',
    },
    followText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    msgBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
      backgroundColor: p.accentSubtle,
    },
    msgText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    hiddenBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    hiddenText: {
      flex: 1,
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      lineHeight: 16,
    },
    revealBtn: {
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      alignItems: 'center',
    },
    revealText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    modRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
    modBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: Spacing.sm,
    },
    modText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: Spacing.sm,
    },
    postCard: { padding: Spacing.md, gap: 4 },
    postTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    postMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    postDesc: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 18 },
  });
