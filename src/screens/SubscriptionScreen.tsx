import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Check,
  Crown,
  Sparkles,
  Clock,
  Zap,
} from 'lucide-react-native';
import { Radii, Spacing, Typography, elevationFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSubscriptionStore, SubscriptionInterval } from '../store/useSubscriptionStore';
import { fetchMyProInterest, registerProInterest } from '../lib/sync/subscriptions';

interface Props {
  onClose: () => void;
}

type Tier = 'free' | 'pro' | 'elite';

interface TierMeta {
  key: Tier;
  name: string;
  tagline: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthly: string;
  features: string[];
  gradient: [string, string] | null;
  accentKey: 'dreamer' | 'pro' | 'elite';
  cta: string;
}

const TIERS: TierMeta[] = [
  {
    key: 'free',
    name: 'Starter',
    tagline: 'Get going',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    yearlyMonthly: 'Always',
    features: [
      'Feed access (Explore, Dreamer, Reality Check)',
      'Post text + 1 photo or video',
      '24h stories — view only',
      'Direct messages',
      'Basic profile',
    ],
    gradient: null,
    accentKey: 'dreamer',
    cta: 'Current plan',
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For builders',
    monthlyPrice: '$9.99',
    yearlyPrice: '$79',
    yearlyMonthly: '$6.58/mo',
    features: [
      'Everything in Starter',
      'Unlimited media per post (up to 6 items)',
      'Post 24h stories',
      'Saved posts & collections',
      'Custom @handle',
      'NDA-gated pitch decks',
      'Advanced search & filters',
      'Pro badge',
    ],
    gradient: null, // overridden via palette.proGradient at runtime
    accentKey: 'pro',
    cta: 'Choose Pro',
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'Top tier',
    monthlyPrice: '$24.99',
    yearlyPrice: '$199',
    yearlyMonthly: '$16.58/mo',
    features: [
      'Everything in Pro',
      'AI Pitch Coach',
      'Verified checkmark',
      'Scheduled posts',
      'Deal-flow analytics (for investors)',
      'Profile themes',
      'Priority support',
      'Early access to new features',
    ],
    gradient: null,
    accentKey: 'elite',
    cta: 'Choose Elite',
  },
];

export const SubscriptionScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isElite = useSubscriptionStore((s) => s.isElite);

  const [interval, setInterval] = useState<SubscriptionInterval>('yearly');
  const [selectedTier, setSelectedTier] = useState<Tier>('pro');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState<{ tier: Tier; interval: SubscriptionInterval } | null>(null);

  useEffect(() => {
    fetchMyProInterest()
      .then((row) => {
        if (row) {
          setRegistered({ tier: row.tier, interval: row.interval });
          setSelectedTier(row.tier);
          setInterval(row.interval);
        }
      })
      .catch(() => undefined);
  }, []);

  const currentTier: Tier = isElite ? 'elite' : isPro ? 'pro' : 'free';

  const tiers = useMemo(
    () =>
      TIERS.map((t) =>
        t.key === 'pro'
          ? { ...t, gradient: palette.proGradient }
          : t.key === 'elite'
            ? { ...t, gradient: palette.eliteGradient }
            : t,
      ),
    [palette],
  );

  const onConfirm = async () => {
    if (selectedTier === 'free') return;
    setBusy(true);
    try {
      await registerProInterest(selectedTier, interval);
      setRegistered({ tier: selectedTier, interval });
      Alert.alert(
        'You\'re on the list',
        'Payments aren\'t live in your region yet. We\'ll email you the moment they are — your selection is saved.',
      );
    } catch (err: any) {
      Alert.alert('Couldn\'t save', err?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const s = styles(palette);
  const isRegisteredHere =
    registered?.tier === selectedTier && registered?.interval === interval;

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
          <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Plans</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: palette.accentSubtle, borderColor: palette.accentBorder }]}>
            <Sparkles size={22} color={palette.accent} strokeWidth={2} />
          </View>
          <Text style={s.heroTitle}>Unlock your full potential</Text>
          <Text style={s.heroBody}>
            Pick a plan that matches how serious you are about your journey.
            Cancel anytime once payments go live.
          </Text>
          {currentTier !== 'free' && (
            <View style={{ marginTop: Spacing.sm }}>
              <Badge kind={currentTier === 'elite' ? 'elite' : 'pro'} size="md" />
            </View>
          )}
        </View>

        {/* Interval toggle */}
        <View style={[s.intervalRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {(['monthly', 'yearly'] as const).map((iv) => {
            const active = interval === iv;
            return (
              <Pressable
                key={iv}
                onPress={() => setInterval(iv)}
                style={[
                  s.intervalBtn,
                  active && { backgroundColor: palette.card, borderColor: palette.borderStrong, ...elevationFor(palette, 'sm') },
                ]}
              >
                <Text
                  style={{
                    color: active ? palette.textPrimary : palette.textSecondary,
                    fontSize: Typography.fontSizeSM,
                    fontWeight: Typography.fontWeightBold,
                    letterSpacing: 0.3,
                  }}
                >
                  {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {iv === 'yearly' && (
                  <View style={[s.saveTag, { backgroundColor: palette.success + '22', borderColor: palette.success }]}>
                    <Text style={{ color: palette.success, fontSize: 9, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 }}>
                      SAVE 30%
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Tier cards */}
        <View style={s.tiersWrap}>
          {tiers.map((t) => {
            const selected = selectedTier === t.key;
            const isCurrent = currentTier === t.key;
            const price = t.key === 'free' ? t.monthlyPrice : interval === 'monthly' ? t.monthlyPrice : t.yearlyPrice;
            const subprice =
              t.key === 'free'
                ? 'No payment required'
                : interval === 'monthly'
                  ? 'per month'
                  : `per year · ${t.yearlyMonthly}`;
            const accent =
              t.accentKey === 'pro' ? palette.pro : t.accentKey === 'elite' ? palette.elite : palette.dreamer;

            return (
              <Pressable
                key={t.key}
                onPress={() => setSelectedTier(t.key)}
                style={({ pressed }) => [
                  s.tierCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: selected ? accent : palette.border,
                    borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                    ...(selected ? elevationFor(palette, 'md') : {}),
                  },
                ]}
              >
                {t.key === 'pro' && (
                  <View style={s.popular}>
                    <Badge kind="pro" label="MOST POPULAR" size="xs" />
                  </View>
                )}

                <View style={s.tierHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tierName, { color: palette.textPrimary }]}>{t.name}</Text>
                    <Text style={[s.tierTagline, { color: palette.textSecondary }]}>{t.tagline}</Text>
                  </View>
                  {t.key !== 'free' && (
                    <View
                      style={[
                        s.tierIcon,
                        {
                          backgroundColor: t.key === 'elite' ? palette.eliteSubtle : palette.proSubtle,
                          borderColor: t.key === 'elite' ? palette.eliteBorder : palette.proBorder,
                        },
                      ]}
                    >
                      {t.key === 'elite' ? (
                        <Crown size={16} color={palette.elite} strokeWidth={2} />
                      ) : (
                        <Sparkles size={16} color={palette.pro} strokeWidth={2} />
                      )}
                    </View>
                  )}
                </View>

                <View style={s.priceRow}>
                  <Text style={[s.priceLarge, { color: palette.textPrimary }]}>{price}</Text>
                  <Text style={[s.priceSub, { color: palette.textMuted }]}>{subprice}</Text>
                </View>

                <View style={[s.divider, { backgroundColor: palette.divider }]} />

                <View style={s.features}>
                  {t.features.map((f) => (
                    <View key={f} style={s.featureRow}>
                      <View style={[s.checkWrap, { backgroundColor: accent + '20' }]}>
                        <Check size={11} color={accent} strokeWidth={3} />
                      </View>
                      <Text style={[s.featureText, { color: palette.textPrimary }]}>{f}</Text>
                    </View>
                  ))}
                </View>

                {isCurrent && (
                  <View style={[s.currentTag, { backgroundColor: palette.success + '18', borderColor: palette.success }]}>
                    <Text style={{ color: palette.success, fontSize: 11, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 }}>
                      CURRENT PLAN
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Region notice */}
        <View style={[s.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Clock size={16} color={palette.textSecondary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={[s.noticeTitle, { color: palette.textPrimary }]}>Payments coming soon</Text>
            <Text style={[s.noticeBody, { color: palette.textSecondary }]}>
              Tap a plan to register your interest — we'll email you the moment payments go live in your region.
            </Text>
          </View>
        </View>

        {/* CTA */}
        {selectedTier !== 'free' && (
          <Button
            label={
              isRegisteredHere
                ? `On the list · ${tiers.find((t) => t.key === selectedTier)?.name} ${interval}`
                : registered
                  ? `Switch to ${tiers.find((t) => t.key === selectedTier)?.name} ${interval}`
                  : `Notify me · ${tiers.find((t) => t.key === selectedTier)?.name} ${interval}`
            }
            onPress={onConfirm}
            loading={busy}
            disabled={isRegisteredHere}
            variant="gradient"
            size="xl"
            gradientColors={selectedTier === 'elite' ? palette.eliteGradient : palette.proGradient}
            fullWidth
          />
        )}

        <Text style={s.fineprint}>
          Subscriptions auto-renew until canceled. Manage anytime from Settings → Subscription.
        </Text>
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
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    back: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeLG,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.2,
    },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
    hero: { alignItems: 'center', gap: 8, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: Spacing.xs,
    },
    heroTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    heroBody: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
    },
    intervalRow: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 4,
    },
    intervalBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
    },
    saveTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    tiersWrap: { gap: Spacing.md },
    tierCard: {
      borderRadius: Radii.xl,
      padding: Spacing.lg,
      gap: Spacing.md,
      position: 'relative',
    },
    popular: {
      position: 'absolute',
      top: -10,
      left: Spacing.lg,
    },
    tierHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    tierName: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, letterSpacing: -0.3 },
    tierTagline: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightMedium, marginTop: 2, letterSpacing: 0.2 },
    tierIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
    priceLarge: { fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightBlack, letterSpacing: -0.8 },
    priceSub: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightMedium },
    divider: { height: StyleSheet.hairlineWidth },
    features: { gap: Spacing.sm },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    checkWrap: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontSize: Typography.fontSizeSM, flex: 1, letterSpacing: 0.1 },
    currentTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
    },
    noticeTitle: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, marginBottom: 2 },
    noticeBody: { fontSize: Typography.fontSizeXS, lineHeight: 17 },
    fineprint: {
      color: p.textMuted,
      fontSize: 11,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
      lineHeight: 16,
    },
  });
