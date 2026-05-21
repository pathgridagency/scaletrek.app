import React, { useState } from 'react';
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
import { ChevronLeft, Sparkles, Crown, RefreshCw, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radii, Spacing, Typography, elevationFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { critiquePitch, PitchCritique } from '../lib/sync/pitchCoach';
import { FEATURES } from '../constants/features';

interface Props {
  onClose: () => void;
  onUpgrade: () => void;
}

type Audience = 'investor' | 'customer' | 'cofounder';

export const PitchCoachScreen: React.FC<Props> = ({ onClose, onUpgrade }) => {
  const { palette } = useTheme();
  const isElite = useSubscriptionStore((s) => s.isElite);
  const [pitch, setPitch] = useState('');
  const [audience, setAudience] = useState<Audience>('investor');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PitchCritique | null>(null);
  const s = styles(palette);

  if (!FEATURES.pitchCoach) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
            <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.title}>Pitch Coach</Text>
          <Badge kind="elite" size="xs" />
        </View>
        <EmptyState
          icon={<Sparkles size={28} color={palette.elite} strokeWidth={2} />}
          title="Coming soon"
          description="An AI pitch coach that scores your pitch 0-100, calls out what works and what doesn't, and suggests a tightened rewrite. Launching with the next Elite drop."
        />
      </Screen>
    );
  }

  if (!isElite) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
            <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.title}>Pitch Coach</Text>
          <View style={{ width: 36 }} />
        </View>
        <EmptyState
          icon={<Crown size={28} color={palette.elite} strokeWidth={2} />}
          title="Elite feature"
          description="The AI Pitch Coach gives you a senior-investor critique on your pitch in seconds. Upgrade to Elite to unlock it."
          cta={{ label: 'See Elite', onPress: onUpgrade }}
        />
      </Screen>
    );
  }

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await critiquePitch(pitch, audience);
      setResult(r);
    } catch (e: any) {
      Alert.alert('Couldn\'t reach Pitch Coach', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
          <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Pitch Coach</Text>
        <Badge kind="elite" size="xs" />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <View style={[s.heroIcon, { backgroundColor: palette.eliteSubtle, borderColor: palette.eliteBorder }]}>
              <Sparkles size={20} color={palette.elite} strokeWidth={2} />
            </View>
            <Text style={s.heroTitle}>Score & sharpen your pitch</Text>
            <Text style={s.heroBody}>
              Paste your pitch below. The coach scores it 0-100, calls out what works,
              what doesn't, and rewrites the strongest version in 2-3 sentences.
            </Text>
          </View>

          <View>
            <Text style={s.label}>AUDIENCE</Text>
            <View style={s.audRow}>
              {(['investor', 'customer', 'cofounder'] as Audience[]).map((a) => {
                const active = audience === a;
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAudience(a)}
                    style={[
                      s.audBtn,
                      {
                        borderColor: active ? palette.accent : palette.border,
                        backgroundColor: active ? palette.accentSubtle : palette.card,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.audText, { color: active ? palette.accent : palette.textSecondary }]}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={s.label}>YOUR PITCH</Text>
            <TextInput
              value={pitch}
              onChangeText={setPitch}
              placeholder="We help [audience] do [outcome] by [mechanism]…"
              placeholderTextColor={palette.textMuted}
              multiline
              maxLength={4000}
              style={[
                s.input,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                },
              ]}
            />
            <Text style={s.counter}>{pitch.length} / 4000</Text>
          </View>

          <Button
            label={result ? 'Re-run analysis' : 'Run Pitch Coach'}
            onPress={run}
            loading={busy}
            disabled={pitch.trim().length < 20}
            variant="gradient"
            size="lg"
            gradientColors={palette.eliteGradient}
            icon={busy ? null : result ? <RefreshCw size={16} color="#FFF" strokeWidth={2.5} /> : <Sparkles size={16} color="#FFF" strokeWidth={2.5} />}
            fullWidth
          />

          {result && (
            <View style={{ gap: Spacing.lg }}>
              {/* Score */}
              <View
                style={[
                  s.scoreCard,
                  { backgroundColor: palette.card, borderColor: palette.border, ...elevationFor(palette, 'md') },
                ]}
              >
                <LinearGradient
                  colors={palette.eliteGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.scoreGradient}
                />
                <Text style={s.scoreLabel}>SCORE</Text>
                <Text style={[s.scoreValue, { color: palette.textPrimary }]}>{result.score}</Text>
                <Text style={[s.scoreOutOf, { color: palette.textSecondary }]}>/ 100</Text>
              </View>

              {/* Strengths */}
              <View style={[s.section, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[s.sectionTitle, { color: palette.success }]}>STRENGTHS</Text>
                <View style={{ gap: 8, marginTop: Spacing.xs }}>
                  {result.strengths.map((str, i) => (
                    <View key={i} style={s.bulletRow}>
                      <View style={[s.bulletIcon, { backgroundColor: palette.success + '20' }]}>
                        <Check size={11} color={palette.success} strokeWidth={3} />
                      </View>
                      <Text style={[s.bulletText, { color: palette.textPrimary }]}>{str}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Weaknesses */}
              <View style={[s.section, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[s.sectionTitle, { color: palette.warning }]}>OPPORTUNITIES</Text>
                <View style={{ gap: 8, marginTop: Spacing.xs }}>
                  {result.weaknesses.map((str, i) => (
                    <View key={i} style={s.bulletRow}>
                      <View style={[s.bulletIcon, { backgroundColor: palette.warning + '20' }]}>
                        <X size={11} color={palette.warning} strokeWidth={3} />
                      </View>
                      <Text style={[s.bulletText, { color: palette.textPrimary }]}>{str}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Rewrite */}
              <View style={[s.section, { backgroundColor: palette.card, borderColor: palette.accentBorder, borderWidth: 1 }]}>
                <Text style={[s.sectionTitle, { color: palette.accent }]}>SUGGESTED REWRITE</Text>
                <Text style={[s.rewriteText, { color: palette.textPrimary }]}>{result.rewrite}</Text>
              </View>
            </View>
          )}
        </ScrollView>
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
      gap: Spacing.sm,
    },
    back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    title: { color: p.textPrimary, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, letterSpacing: -0.2 },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
    hero: { gap: 6, paddingBottom: Spacing.xs },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: Spacing.xs,
    },
    heroTitle: { color: p.textPrimary, fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightBlack, letterSpacing: -0.5 },
    heroBody: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 20 },
    label: { color: p.textSecondary, fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5, marginBottom: 6 },
    audRow: { flexDirection: 'row', gap: Spacing.sm },
    audBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
    },
    audText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    input: {
      minHeight: 160,
      padding: Spacing.md,
      borderRadius: Radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      fontSize: Typography.fontSizeMD,
      lineHeight: 22,
      textAlignVertical: 'top',
    },
    counter: { color: p.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
    scoreCard: {
      borderRadius: Radii.xl,
      borderWidth: StyleSheet.hairlineWidth,
      padding: Spacing.lg,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    scoreGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
    scoreLabel: { color: p.textMuted, fontSize: 11, fontWeight: Typography.fontWeightBold, letterSpacing: 1.5, marginTop: 4 },
    scoreValue: { fontSize: 64, fontWeight: Typography.fontWeightBlack, letterSpacing: -2, lineHeight: 72 },
    scoreOutOf: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium, marginTop: -8 },
    section: { padding: Spacing.lg, borderRadius: Radii.xl, borderWidth: StyleSheet.hairlineWidth },
    sectionTitle: { fontSize: 11, fontWeight: Typography.fontWeightBold, letterSpacing: 1.2 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    bulletIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    bulletText: { flex: 1, fontSize: Typography.fontSizeSM, lineHeight: 21 },
    rewriteText: { marginTop: Spacing.sm, fontSize: Typography.fontSizeMD, lineHeight: 24, fontStyle: 'italic' },
  });
