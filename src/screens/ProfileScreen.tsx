import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import {
  LogOut,
  Shield,
  TrendingUp,
  Award,
  ChevronRight,
  Settings,
  Zap,
  Users as UsersIcon,
  Edit3,
  Crown,
  MapPin,
  Link as LinkIcon,
  Briefcase,
} from 'lucide-react-native';
import { useTranslation } from '../i18n';
import { Radii, Spacing, Typography, accentFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { MomentumPill } from '../components/ui/MomentumPill';
import { Screen } from '../components/ui/Screen';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';
import { useModerationStore } from '../store/useModerationStore';

interface Props {
  onLogout: () => void;
  onOpenSettings: () => void;
  onEditProfile: () => void;
  onRequestVerification: () => void;
}

export const ProfileScreen: React.FC<Props> = ({
  onLogout,
  onOpenSettings,
  onEditProfile,
  onRequestVerification,
}) => {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const posts = useFeedStore((s) => s.posts);
  const pendingVerifications = useModerationStore((s) => s.verificationRequests);

  if (!user) return null;

  const accentKind = user.role === 'admin' ? 'admin' : user.role === 'investor' ? 'reality' : 'dreamer';
  const a = accentFor(palette, accentKind);
  const userPosts = posts.filter((p) => p.userId === user.id && !p.removed);
  const totalSignals = userPosts.reduce((acc, p) => acc + p.signals, 0);
  const pendingForMe = pendingVerifications.some((r) => r.userId === user.id && r.status === 'pending');

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const s = styles(palette);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{t('profile.title')}</Text>
          <TouchableOpacity style={s.settingsBtn} onPress={onOpenSettings}>
            <Settings size={20} color={palette.textSecondary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {user.coverUrl ? (
          <Image source={{ uri: user.coverUrl }} style={s.cover} contentFit="cover" />
        ) : null}

        <GlassCard accent={accentKind} elevation="md" style={s.identityCard}>
          <View style={s.identityTop}>
            <Avatar
              initials={user.avatar}
              size={72}
              accent={accentKind}
              imageUrl={user.avatarUrl}
              verification={
                user.role === 'admin'
                  ? 'admin'
                  : user.verificationLevel === 'elite'
                    ? 'elite'
                    : user.verificationLevel === 'verified'
                      ? 'verified'
                      : 'none'
              }
            />
            <View style={s.identityInfo}>
              <Text style={s.identityName} numberOfLines={1}>{user.name}</Text>
              <Text style={s.identityUsername}>{user.username}</Text>
              <View style={s.badgeRow}>
                <View style={[s.roleBadge, { backgroundColor: a.subtle, borderColor: a.border }]}>
                  {user.role === 'admin' ? (
                    <Shield size={11} color={a.primary} strokeWidth={2} />
                  ) : user.role === 'investor' ? (
                    <Shield size={11} color={a.primary} strokeWidth={2} />
                  ) : (
                    <Zap size={11} color={a.primary} strokeWidth={2} />
                  )}
                  <Text style={[s.roleText, { color: a.primary }]}>
                    {user.role === 'admin' ? 'Admin' : user.role === 'investor' ? 'Investor' : 'Dreamer'}
                  </Text>
                </View>
                {user.isPro && (
                  <View style={[s.proBadge, { backgroundColor: palette.pro + '14', borderColor: palette.pro + '55' }]}>
                    <Crown size={10} color={palette.pro} strokeWidth={2.5} />
                    <Text style={[s.proBadgeText, { color: palette.pro }]}>PRO</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {user.headline ? <Text style={s.headline}>{user.headline}</Text> : null}
          {user.bio ? <Text style={s.bio}>{user.bio}</Text> : null}

          {(user.location || user.website || user.companyName) && (
            <View style={s.detailsList}>
              {user.location && (
                <View style={s.detailRow}>
                  <MapPin size={12} color={palette.textSecondary} strokeWidth={1.8} />
                  <Text style={s.detailText}>{user.location}</Text>
                </View>
              )}
              {user.website && (
                <TouchableOpacity style={s.detailRow} onPress={() => Linking.openURL(user.website!).catch(() => {})}>
                  <LinkIcon size={12} color={palette.accent} strokeWidth={1.8} />
                  <Text style={[s.detailText, { color: palette.accent }]} numberOfLines={1}>
                    {user.website.replace(/^https?:\/\//, '')}
                  </Text>
                </TouchableOpacity>
              )}
              {user.companyName && (
                <View style={s.detailRow}>
                  <Briefcase size={12} color={palette.textSecondary} strokeWidth={1.8} />
                  <Text style={s.detailText}>
                    {user.companyName}
                    {user.sector ? ` · ${user.sector}` : ''}
                    {user.foundedYear ? ` · ${user.foundedYear}` : ''}
                    {user.teamSize ? ` · ${user.teamSize}` : ''}
                  </Text>
                </View>
              )}
            </View>
          )}

          {(user.linkedinUrl || user.twitterUrl || user.instagramUrl || user.githubUrl || user.facebookUrl) && (
            <View style={s.socialsRow}>
              {[
                { url: user.linkedinUrl, label: 'in' },
                { url: user.twitterUrl, label: '𝕏' },
                { url: user.instagramUrl, label: 'IG' },
                { url: user.githubUrl, label: 'GH' },
                { url: user.facebookUrl, label: 'f' },
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

          <View style={s.identityBottom}>
            <MomentumPill score={user.momentumScore} />
            <TouchableOpacity style={s.editBtn} onPress={onEditProfile}>
              <Edit3 size={12} color={a.primary} strokeWidth={1.6} />
              <Text style={[s.editText, { color: a.primary }]}>{t('profile.edit')}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard style={s.statsCard}>
          <Text style={s.statsTitle}>Your Numbers</Text>
          <View style={s.statsGrid}>
            {[
              { label: 'Showcases', value: userPosts.length, icon: Award, color: a.primary },
              {
                label: 'Followers',
                value: user.followers.toLocaleString(),
                icon: UsersIcon,
                color: palette.textSecondary,
              },
              { label: 'Signals', value: totalSignals, icon: Zap, color: palette.accent },
              {
                label: 'Momentum',
                value: user.momentumScore,
                icon: TrendingUp,
                color: palette.success,
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <View key={label} style={s.statItem}>
                <Icon size={14} color={color} />
                <Text style={[s.statValue, { color }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard accent={accentKind} style={s.verifyCard}>
          <View style={s.verifyHeader}>
            <Shield size={16} color={a.primary} />
            <Text style={s.verifyTitle}>Reality Score Progress</Text>
          </View>
          {[
            { level: 'Basic', done: user.verificationLevel !== 'none', desc: 'Email verified + phone linked' },
            {
              level: 'Verified',
              done: user.verificationLevel === 'verified' || user.verificationLevel === 'elite',
              desc: '3+ showcases + Revenue evidence',
            },
            { level: 'Elite', done: user.verificationLevel === 'elite', desc: 'On-site audit + Legal verification' },
          ].map(({ level, done, desc }) => (
            <View key={level} style={s.verifyStep}>
              <View
                style={[
                  s.verifyDot,
                  {
                    backgroundColor: done ? a.primary : palette.surface,
                    borderColor: done ? a.primary : palette.textMuted,
                  },
                ]}
              />
              <View style={s.verifyInfo}>
                <Text style={[s.verifyLevel, { color: done ? a.primary : palette.textMuted }]}>{level}</Text>
                <Text style={s.verifyDesc}>{desc}</Text>
              </View>
              {done && <Shield size={13} color={a.primary} />}
            </View>
          ))}
          <TouchableOpacity onPress={onRequestVerification} style={[s.verifyCta, { borderColor: a.primary }]}>
            <Text style={[s.verifyCtaText, { color: a.primary }]}>
              {pendingForMe ? 'Verification pending' : 'Request next level'}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <TouchableOpacity style={s.settingsRow} onPress={onOpenSettings}>
          <Settings size={16} color={palette.textSecondary} />
          <Text style={s.settingsRowText}>App settings & theme</Text>
          <ChevronRight size={16} color={palette.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={16} color={palette.error} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Scaletrek v1.0.0</Text>
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
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    settingsBtn: { padding: 4 },
    identityCard: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    identityTop: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    identityInfo: { flex: 1, gap: 4 },
    identityName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    identityUsername: { color: p.textMuted, fontSize: Typography.fontSizeSM },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: 0.5,
    },
    roleText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    cover: { width: '100%', height: 140, backgroundColor: p.surface },
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
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: 0.5,
    },
    proBadgeText: {
      fontSize: 10,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: 0.6,
    },
    bio: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 18 },
    identityBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    editText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    statsCard: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    statsTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
    },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', gap: 4 },
    statValue: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
    statLabel: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    verifyCard: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    verifyHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    verifyTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    verifyStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    verifyDot: {
      width: 14,
      height: 14,
      borderRadius: Radii.full,
      borderWidth: 1.5,
      marginTop: 2,
    },
    verifyInfo: { flex: 1, gap: 2 },
    verifyLevel: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    verifyDesc: { color: p.textMuted, fontSize: Typography.fontSizeXS, lineHeight: 15 },
    verifyCta: {
      marginTop: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      alignItems: 'center',
    },
    verifyCtaText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      borderColor: p.border,
    },
    settingsRowText: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      flex: 1,
      fontWeight: Typography.fontWeightMedium,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      paddingVertical: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.error + '40',
      backgroundColor: p.error + '12',
    },
    logoutText: {
      color: p.error,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    version: {
      color: p.textMuted,
      fontSize: 10,
      textAlign: 'center',
      marginBottom: Spacing.xxl,
      letterSpacing: 0.5,
    },
  });
