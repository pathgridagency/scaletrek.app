import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { ChevronLeft, Sun, Moon, Smartphone, Trash2, Crown, ChevronRight, Globe, FileText, ShieldCheck, Bookmark, Sparkles, Handshake } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { ThemePreference, useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { GlassCard } from '../components/ui/GlassCard';
import { wipeAllStores } from '../storage/persist';
import { useAuthStore } from '../store/useAuthStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useTranslation, useI18nStore, SUPPORTED_LOCALES, LOCALE_LABELS, SupportedLocale } from '../i18n';
import { FEATURES } from '../constants/features';

interface Props {
  onClose: () => void;
  onLogout: () => void;
  onOpenSubscription?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenSaved?: () => void;
  onOpenPitchCoach?: () => void;
  onOpenSynergy?: () => void;
}

export const SettingsScreen: React.FC<Props> = ({
  onClose,
  onLogout,
  onOpenSubscription,
  onOpenPrivacy,
  onOpenTerms,
  onOpenSaved,
  onOpenPitchCoach,
  onOpenSynergy,
}) => {
  const { palette, preference, setPreference, mode } = useTheme();
  const { t } = useTranslation();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const logout = useAuthStore((s) => s.logout);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const [dealNotif, setDealNotif] = useState(true);
  const [followNotif, setFollowNotif] = useState(true);
  const [signalNotif, setSignalNotif] = useState(true);
  const s = styles(palette);

  const options: { value: ThemePreference; label: string; icon: any }[] = [
    { value: 'system', label: t('settings.themeSystem'), icon: Smartphone },
    { value: 'light', label: t('settings.themeLight'), icon: Sun },
    { value: 'dark', label: t('settings.themeDark'), icon: Moon },
  ];

  const wipe = () => {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reset'),
          style: 'destructive',
          onPress: async () => {
            await wipeAllStores();
            logout();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>{t('settings.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.section}>{t('settings.appearance')}</Text>
        <GlassCard style={s.card}>
          <Text style={s.cardLabel}>{t('settings.theme')}</Text>
          <Text style={s.cardHint}>{mode}</Text>
          <View style={s.row}>
            {options.map(({ value, label, icon: Icon }) => {
              const active = preference === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    s.option,
                    active && {
                      borderColor: palette.accent,
                      backgroundColor: palette.accentSubtle,
                    },
                  ]}
                  onPress={() => setPreference(value)}
                >
                  <Icon
                    size={16}
                    color={active ? palette.accent : palette.textSecondary}
                    strokeWidth={1.6}
                  />
                  <Text
                    style={[
                      s.optionText,
                      { color: active ? palette.accent : palette.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <Text style={s.section}>{t('settings.language')}</Text>
        <GlassCard style={s.card}>
          <View style={s.langRow}>
            <Globe size={14} color={palette.textSecondary} strokeWidth={1.8} />
            <Text style={s.cardHint}>{LOCALE_LABELS[locale]}</Text>
          </View>
          <View style={s.langGrid}>
            {(SUPPORTED_LOCALES as readonly SupportedLocale[]).map((code) => {
              const active = code === locale;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    s.langCell,
                    active && {
                      borderColor: palette.accent,
                      backgroundColor: palette.accentSubtle,
                    },
                  ]}
                  onPress={() => setLocale(code)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      s.langText,
                      { color: active ? palette.accent : palette.textSecondary },
                    ]}
                  >
                    {LOCALE_LABELS[code]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        <Text style={s.section}>{t('settings.notifications')}</Text>
        <GlassCard style={s.card}>
          {[
            { label: t('settings.notifDeals'), value: dealNotif, set: setDealNotif },
            { label: t('settings.notifSignals'), value: signalNotif, set: setSignalNotif },
            { label: t('settings.notifFollows'), value: followNotif, set: setFollowNotif },
          ].map(({ label, value, set }) => (
            <View key={label} style={s.switchRow}>
              <Text style={s.switchLabel}>{label}</Text>
              <Switch
                value={value}
                onValueChange={set}
                trackColor={{ false: palette.surface, true: palette.accent + '60' }}
                thumbColor={value ? palette.accent : palette.textMuted}
              />
            </View>
          ))}
        </GlassCard>

        {onOpenSubscription && (
          <>
            <Text style={s.section}>{t('settings.subscription')}</Text>
            <GlassCard style={s.card}>
              <TouchableOpacity style={s.proRow} onPress={onOpenSubscription}>
                <Crown size={16} color={palette.accent} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={s.proLabel}>
                    {isPro ? t('subscription.activeCta') : t('subscription.upgradeCta')}
                  </Text>
                  <Text style={s.proHint}>
                    {isPro ? t('subscription.activeHint') : t('subscription.upgradeHint')}
                  </Text>
                </View>
                <ChevronRight size={16} color={palette.textSecondary} />
              </TouchableOpacity>
            </GlassCard>
          </>
        )}

        {(onOpenSaved || onOpenPitchCoach || onOpenSynergy) && (
          <>
            <Text style={s.section}>Features</Text>
            <GlassCard style={s.card}>
              {onOpenSynergy && (
                <TouchableOpacity style={s.proRow} onPress={onOpenSynergy}>
                  <Handshake size={16} color={palette.accent} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.proLabel}>Synergy Match</Text>
                    <Text style={s.proHint}>Find a complementary co-founder</Text>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
              {onOpenSaved && (
                <TouchableOpacity style={s.proRow} onPress={onOpenSaved}>
                  <Bookmark size={16} color={palette.pro} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.proLabel}>Saved posts</Text>
                    <Text style={s.proHint}>Bookmarked posts to read later</Text>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
              {onOpenPitchCoach && (
                <TouchableOpacity style={s.proRow} onPress={onOpenPitchCoach}>
                  <Sparkles size={16} color={palette.elite} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.proLabel}>Pitch Coach</Text>
                    <Text style={s.proHint}>
                      {FEATURES.pitchCoach ? 'AI critique on your pitch' : 'Coming soon'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </GlassCard>
          </>
        )}

        {(onOpenPrivacy || onOpenTerms) && (
          <>
            <Text style={s.section}>Legal</Text>
            <GlassCard style={s.card}>
              {onOpenPrivacy && (
                <TouchableOpacity style={s.proRow} onPress={onOpenPrivacy}>
                  <ShieldCheck size={16} color={palette.textSecondary} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.proLabel}>Privacy Policy</Text>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
              {onOpenTerms && (
                <TouchableOpacity style={s.proRow} onPress={onOpenTerms}>
                  <FileText size={16} color={palette.textSecondary} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.proLabel}>Terms of Service</Text>
                  </View>
                  <ChevronRight size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </GlassCard>
          </>
        )}

        <Text style={s.section}>{t('settings.account')}</Text>
        <GlassCard style={s.card}>
          <TouchableOpacity style={s.dangerRow} onPress={wipe}>
            <Trash2 size={16} color={palette.error} />
            <Text style={[s.dangerText, { color: palette.error }]}>{t('settings.reset')}</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={s.version}>ScaleTrek v1.0.0</Text>
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
    scroll: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
    section: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: Spacing.md,
    },
    card: { padding: Spacing.md, gap: Spacing.sm },
    cardLabel: { color: p.textPrimary, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold },
    cardHint: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    row: { flexDirection: 'row', gap: Spacing.sm },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    optionText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    switchLabel: { color: p.textPrimary, fontSize: Typography.fontSizeSM },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
    dangerText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    proRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
    proLabel: { color: p.textPrimary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    proHint: { color: p.textMuted, fontSize: Typography.fontSizeXS, marginTop: 2 },
    langRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    langCell: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.surface,
      minWidth: 96,
      alignItems: 'center',
    },
    langText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    version: {
      color: p.textMuted,
      fontSize: 10,
      textAlign: 'center',
      marginTop: Spacing.xl,
      letterSpacing: 0.5,
    },
  });
