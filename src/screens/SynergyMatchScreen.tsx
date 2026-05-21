import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  X,
  Handshake,
  Target,
  Rocket,
  Clock,
  PieChart,
  MessageCircle,
  Users,
  RefreshCw,
} from 'lucide-react-native';
import { Radii, Spacing, Typography, elevationFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { useSynergyStore } from '../store/useSynergyStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { SynergyCandidate, SynergyMatch } from '../lib/sync/synergy';

interface Props {
  onClose: () => void;
  onEditProfile: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenChat: () => void;
}

// A user must opt in and bring real signal before they can match — the
// "skin in the game" guardrail from the spec.
const MIN_STRENGTHS = 3;
const MIN_BOTTLENECKS = 1;

const scoreTone = (score: number) => (score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low');

export const SynergyMatchScreen: React.FC<Props> = ({
  onClose,
  onEditProfile,
  onOpenProfile,
  onOpenChat,
}) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const candidates = useSynergyStore((s) => s.candidates);
  const matches = useSynergyStore((s) => s.matches);
  const loadingCandidates = useSynergyStore((s) => s.loadingCandidates);
  const loadingMatches = useSynergyStore((s) => s.loadingMatches);
  const loaded = useSynergyStore((s) => s.loaded);
  const loadCandidates = useSynergyStore((s) => s.loadCandidates);
  const loadMatches = useSynergyStore((s) => s.loadMatches);
  const swipe = useSynergyStore((s) => s.swipe);
  const startThread = useChatStore((s) => s.startThread);

  const [tab, setTab] = useState<'discover' | 'matches'>('discover');
  const [celebration, setCelebration] = useState<SynergyCandidate | null>(null);
  const [busy, setBusy] = useState(false);

  const ready =
    !!user &&
    user.openToSynergy === true &&
    (user.strengths?.length ?? 0) >= MIN_STRENGTHS &&
    (user.bottlenecks?.length ?? 0) >= MIN_BOTTLENECKS;

  useEffect(() => {
    if (ready) {
      loadCandidates();
      loadMatches();
    }
  }, [ready, loadCandidates, loadMatches]);

  const top = candidates[0];
  const next = candidates[1];

  // ── card animation ──────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!top) return;
    enter.setValue(0);
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();
  }, [top?.id, enter]);

  const act = async (direction: 'interested' | 'pass') => {
    if (!top || busy) return;
    setBusy(true);
    const target = top;
    Animated.timing(swipeX, {
      toValue: direction === 'interested' ? 520 : -520,
      duration: 240,
      useNativeDriver: true,
    }).start(async () => {
      swipeX.setValue(0);
      try {
        const { matched } = await swipe(target, direction);
        if (matched) setCelebration(target);
      } catch {
        /* store rolls the candidate back */
      } finally {
        setBusy(false);
      }
    });
  };

  const messagePartner = (m: SynergyMatch) => {
    startThread({
      participantId: m.partnerId,
      participantName: m.partnerName,
      participantAvatar: m.partnerAvatar,
    });
    onOpenChat();
  };

  const s = styles(palette);

  // ── header ──────────────────────────────────────────────────────
  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={onClose} style={s.iconBtn} activeOpacity={0.7}>
        <ArrowLeft size={20} color={palette.textPrimary} strokeWidth={2} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Synergy Match</Text>
        <Text style={s.subtitle}>Find the founder who completes your build</Text>
      </View>
      <Sparkles size={20} color={palette.accent} strokeWidth={2} />
    </View>
  );

  // ── gate ────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <Screen>
        {header}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<Handshake size={30} color={palette.accent} strokeWidth={1.8} />}
            title="Set up your Synergy profile"
            description={`Synergy Match connects you with complementary founders. Add at least ${MIN_STRENGTHS} strengths and ${MIN_BOTTLENECKS} bottleneck, then switch on "Open to Synergy" — this keeps matching high-signal.`}
            cta={{ label: 'Complete my profile', onPress: onEditProfile }}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}

      <View style={s.tabs}>
        {(['discover', 'matches'] as const).map((tk) => {
          const active = tab === tk;
          const count = tk === 'matches' ? matches.length : candidates.length;
          return (
            <TouchableOpacity
              key={tk}
              style={[s.tab, active && { borderBottomColor: palette.accent }]}
              onPress={() => setTab(tk)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabLabel, active && { color: palette.accent }]}>
                {tk === 'discover' ? 'Discover' : 'Matches'}
                {count > 0 ? `  ${count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'discover' ? (
        <View style={s.deck}>
          {loadingCandidates && candidates.length === 0 ? (
            <ActivityIndicator color={palette.accent} style={{ marginTop: Spacing.huge }} />
          ) : !top ? (
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
              refreshControl={
                <RefreshControl
                  refreshing={loadingCandidates}
                  onRefresh={loadCandidates}
                  tintColor={palette.accent}
                />
              }
            >
              <EmptyState
                icon={<Rocket size={30} color={palette.accent} strokeWidth={1.8} />}
                title="You're all caught up"
                description="No new complementary founders right now. Check back soon — or refine your strengths and bottlenecks to widen the net."
                cta={{ label: 'Refresh', onPress: loadCandidates }}
              />
            </ScrollView>
          ) : (
            <>
              {next && (
                <View style={[s.cardWrap, s.cardBehind]} pointerEvents="none">
                  <DiscoveryCard candidate={next} palette={palette} peek />
                </View>
              )}
              <Animated.View
                style={[
                  s.cardWrap,
                  {
                    opacity: enter,
                    transform: [
                      { translateX: swipeX },
                      {
                        rotate: swipeX.interpolate({
                          inputRange: [-520, 0, 520],
                          outputRange: ['-12deg', '0deg', '12deg'],
                        }),
                      },
                      {
                        scale: enter.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.94, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <DiscoveryCard
                  candidate={top}
                  palette={palette}
                  onOpenProfile={() => onOpenProfile(top.id)}
                />
              </Animated.View>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.circleBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                  onPress={() => act('pass')}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  <X size={26} color={palette.textSecondary} strokeWidth={2.4} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => act('interested')}
                  disabled={busy}
                  activeOpacity={0.85}
                  style={s.connectBtn}
                >
                  <LinearGradient
                    colors={palette.accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.connectGrad}
                  >
                    <Handshake size={22} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={s.connectLabel}>Connect</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.matchList}
          refreshControl={
            <RefreshControl
              refreshing={loadingMatches}
              onRefresh={loadMatches}
              tintColor={palette.accent}
            />
          }
        >
          {matches.length === 0 ? (
            <EmptyState
              icon={<Users size={30} color={palette.accent} strokeWidth={1.8} />}
              title="No matches yet"
              description="When you and another founder both connect, your Synergy Match appears here — ready to start building."
            />
          ) : (
            matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                palette={palette}
                onOpenProfile={() => onOpenProfile(m.partnerId)}
                onMessage={() => messagePartner(m)}
              />
            ))
          )}
        </ScrollView>
      )}

      {celebration && (
        <MatchCelebration
          candidate={celebration}
          meAvatar={user?.avatar ?? '?'}
          meAvatarUrl={user?.avatarUrl}
          palette={palette}
          onMessage={() => {
            startThread({
              participantId: celebration.id,
              participantName: celebration.name,
              participantAvatar: celebration.avatar,
            });
            setCelebration(null);
            onOpenChat();
          }}
          onKeepBrowsing={() => setCelebration(null)}
        />
      )}
    </Screen>
  );
};

// ───────────────────────── discovery card ─────────────────────────
const TagRow: React.FC<{
  label: string;
  icon: React.ReactNode;
  tags: string[];
  color: string;
  bg: string;
  palette: ReturnType<typeof useTheme>['palette'];
}> = ({ label, icon, tags, color, bg, palette }) => (
  <View style={{ gap: Spacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text
        style={{
          color: palette.textSecondary,
          fontSize: Typography.fontSizeXS,
          fontWeight: Typography.fontWeightBold,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tags.length === 0 ? (
        <Text style={{ color: palette.textMuted, fontSize: Typography.fontSizeSM }}>—</Text>
      ) : (
        tags.map((t) => (
          <View
            key={t}
            style={{
              backgroundColor: bg,
              borderRadius: Radii.full,
              paddingHorizontal: Spacing.md,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color, fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold }}>
              {t}
            </Text>
          </View>
        ))
      )}
    </View>
  </View>
);

const DiscoveryCard: React.FC<{
  candidate: SynergyCandidate;
  palette: ReturnType<typeof useTheme>['palette'];
  peek?: boolean;
  onOpenProfile?: () => void;
}> = ({ candidate: c, palette, peek, onOpenProfile }) => {
  const tone = scoreTone(c.synergyScore);
  const scoreColor =
    tone === 'high' ? palette.success : tone === 'mid' ? palette.accent : palette.textMuted;

  return (
    <GlassCard accent="accent" elevation={peek ? 'none' : 'xl'} radius={Radii.xxl} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!peek}>
        <LinearGradient
          colors={[palette.accentSubtle, 'transparent']}
          style={{ padding: Spacing.xl, gap: Spacing.lg }}
        >
          {/* identity */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
            activeOpacity={onOpenProfile ? 0.8 : 1}
            onPress={onOpenProfile}
          >
            <Avatar
              initials={c.avatar}
              imageUrl={c.avatarUrl}
              size={58}
              accent="accent"
              ring="verified"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: palette.textPrimary,
                  fontSize: Typography.fontSizeXL,
                  fontWeight: Typography.fontWeightBold,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {c.name}
              </Text>
              <Text style={{ color: palette.textMuted, fontSize: Typography.fontSizeSM }} numberOfLines={1}>
                {c.headline || c.companyName || c.industry || 'Founder'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* synergy score */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
              backgroundColor: palette.surface,
              borderRadius: Radii.lg,
              padding: Spacing.md,
            }}
          >
            <View style={{ alignItems: 'center', minWidth: 64 }}>
              <Text
                style={{
                  color: scoreColor,
                  fontSize: Typography.fontSize3XL,
                  fontWeight: Typography.fontWeightBlack,
                  letterSpacing: -1,
                }}
              >
                {c.synergyScore}
              </Text>
              <Text
                style={{
                  color: palette.textMuted,
                  fontSize: 9,
                  fontWeight: Typography.fontWeightBold,
                  letterSpacing: 1,
                }}
              >
                SYNERGY
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM }}>
                Solves <Text style={{ color: palette.success, fontWeight: '700' }}>{c.mineSolved}</Text> of
                your bottlenecks
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM }}>
                You solve <Text style={{ color: palette.accent, fontWeight: '700' }}>{c.theirsSolved}</Text> of
                theirs
              </Text>
            </View>
          </View>

          {c.bio ? (
            <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 20 }} numberOfLines={3}>
              {c.bio}
            </Text>
          ) : null}

          <TagRow
            label="Superpower"
            icon={<Zap size={13} color={palette.success} strokeWidth={2.4} />}
            tags={c.strengths}
            color={palette.success}
            bg={palette.realitySubtle}
            palette={palette}
          />
          <TagRow
            label="Missing piece"
            icon={<Target size={13} color={palette.warning} strokeWidth={2.4} />}
            tags={c.bottlenecks}
            color={palette.warning}
            bg={palette.eliteSubtle}
            palette={palette}
          />

          {(c.hoursPerWeek || c.equityExpectation) && (
            <View style={{ flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' }}>
              {c.hoursPerWeek ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} color={palette.textMuted} strokeWidth={2} />
                  <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeXS }}>
                    {c.hoursPerWeek} hrs/week
                  </Text>
                </View>
              ) : null}
              {c.equityExpectation ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <PieChart size={13} color={palette.textMuted} strokeWidth={2} />
                  <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeXS }}>
                    {c.equityExpectation}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </LinearGradient>
      </ScrollView>
    </GlassCard>
  );
};

// ───────────────────────── match row ──────────────────────────────
const MatchRow: React.FC<{
  match: SynergyMatch;
  palette: ReturnType<typeof useTheme>['palette'];
  onOpenProfile: () => void;
  onMessage: () => void;
}> = ({ match: m, palette, onOpenProfile, onMessage }) => (
  <GlassCard elevation="md" style={{ padding: Spacing.lg, gap: Spacing.md }}>
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
      activeOpacity={0.8}
      onPress={onOpenProfile}
    >
      <Avatar initials={m.partnerAvatar} imageUrl={m.partnerAvatarUrl} size={48} accent="accent" />
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: palette.textPrimary, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold }}
          numberOfLines={1}
        >
          {m.partnerName}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: Typography.fontSizeXS }} numberOfLines={1}>
          {m.partnerHeadline || m.partnerCompany || m.partnerIndustry || 'Founder'}
        </Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: palette.success,
            fontSize: Typography.fontSizeXL,
            fontWeight: Typography.fontWeightBlack,
          }}
        >
          {m.synergyScore}
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>
          SYNERGY
        </Text>
      </View>
    </TouchableOpacity>
    {m.partnerStrengths.length > 0 && (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {m.partnerStrengths.slice(0, 3).map((t) => (
          <View
            key={t}
            style={{
              backgroundColor: palette.realitySubtle,
              borderRadius: Radii.full,
              paddingHorizontal: Spacing.sm + 2,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: palette.success, fontSize: 10, fontWeight: Typography.fontWeightSemiBold }}>
              {t}
            </Text>
          </View>
        ))}
      </View>
    )}
    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
      <Button label="View profile" variant="secondary" size="sm" onPress={onOpenProfile} style={{ flex: 1 }} />
      <Button
        label="Message"
        variant="gradient"
        size="sm"
        onPress={onMessage}
        icon={<MessageCircle size={14} color="#FFFFFF" strokeWidth={2.2} />}
        style={{ flex: 1 }}
      />
    </View>
  </GlassCard>
);

// ───────────────────────── celebration ────────────────────────────
const MatchCelebration: React.FC<{
  candidate: SynergyCandidate;
  meAvatar: string;
  meAvatarUrl?: string;
  palette: ReturnType<typeof useTheme>['palette'];
  onMessage: () => void;
  onKeepBrowsing: () => void;
}> = ({ candidate, meAvatar, meAvatarUrl, palette, onMessage, onKeepBrowsing }) => {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 9 }).start();
  }, [pop]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlayStrong }]}>
      <View style={{ flex: 1, justifyContent: 'center', padding: Spacing.xl }}>
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          }}
        >
          <GlassCard accent="accent" elevation="xl" radius={Radii.xxl} style={{ padding: Spacing.xxl, gap: Spacing.lg }}>
            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              <Sparkles size={28} color={palette.accent} strokeWidth={2} />
              <Text
                style={{
                  color: palette.textPrimary,
                  fontSize: Typography.fontSize2XL,
                  fontWeight: Typography.fontWeightBlack,
                  letterSpacing: -0.5,
                  textAlign: 'center',
                }}
              >
                It's a Synergy!
              </Text>
              <Text
                style={{
                  color: palette.textSecondary,
                  fontSize: Typography.fontSizeSM,
                  textAlign: 'center',
                }}
              >
                You and {candidate.name} both want to build together.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: -10 }}>
              <Avatar initials={meAvatar} imageUrl={meAvatarUrl} size={68} accent="accent" ring="verified" />
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: -8,
                  zIndex: 2,
                  ...elevationFor(palette, 'md'),
                }}
              >
                <Handshake size={18} color="#FFFFFF" strokeWidth={2.4} />
              </View>
              <Avatar
                initials={candidate.avatar}
                imageUrl={candidate.avatarUrl}
                size={68}
                accent="accent"
                ring="verified"
              />
            </View>
            <Button
              label={`Message ${candidate.name.split(' ')[0]}`}
              variant="gradient"
              fullWidth
              onPress={onMessage}
              icon={<MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />}
            />
            <Button label="Keep browsing" variant="ghost" fullWidth onPress={onKeepBrowsing} />
          </GlassCard>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
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
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: -0.5,
    },
    subtitle: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.xl,
      gap: Spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.border,
    },
    tab: { paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabLabel: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightBold,
    },
    deck: { flex: 1, padding: Spacing.lg },
    cardWrap: { flex: 1 },
    cardBehind: { ...StyleSheet.absoluteFillObject, margin: Spacing.lg, opacity: 0.5 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
      paddingTop: Spacing.lg,
    },
    circleBtn: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectBtn: { borderRadius: Radii.full, overflow: 'hidden' },
    connectGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.lg,
    },
    connectLabel: {
      color: '#FFFFFF',
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: 0.2,
    },
    matchList: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  });
