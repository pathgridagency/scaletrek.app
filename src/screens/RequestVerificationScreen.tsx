import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useModerationStore } from '../store/useModerationStore';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { VerificationLevel } from '../data/mockData';

interface Props {
  onClose: () => void;
}

const NEXT: Record<VerificationLevel, VerificationLevel | null> = {
  none: 'basic',
  basic: 'verified',
  verified: 'elite',
  elite: null,
};

export const RequestVerificationScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const requestVerification = useModerationStore((s) => s.requestVerification);
  const requests = useModerationStore((s) => s.verificationRequests);
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => (user ? NEXT[user.verificationLevel] : null), [user]);
  const pending = user && requests.some((r) => r.userId === user.id && r.status === 'pending');
  const s = styles(palette);

  if (!user) return null;

  const submit = () => {
    if (!target) {
      setError('You are already at Elite level.');
      return;
    }
    if (evidence.trim().length < 12) {
      setError('Add some evidence so an admin can verify.');
      return;
    }
    requestVerification(user.id, target, evidence.trim());
    onClose();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
          </TouchableOpacity>
          <Text style={s.title}>Verification</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.cardTitle}>Current level</Text>
            <Text style={s.cardLevel}>{user.verificationLevel.toUpperCase()}</Text>

            {target ? (
              <>
                <Text style={s.cardTitle}>Requesting</Text>
                <Text style={[s.cardLevel, { color: palette.accent }]}>{target.toUpperCase()}</Text>
              </>
            ) : (
              <Text style={s.cardHint}>You are already at the top level.</Text>
            )}
          </View>

          {pending && (
            <Text style={s.pendingNote}>You already have a pending request. An admin will review it soon.</Text>
          )}

          {target && !pending && (
            <>
              <TextField
                label="Evidence"
                value={evidence}
                onChangeText={setEvidence}
                multiline
                style={{ minHeight: 120, textAlignVertical: 'top' }}
                placeholder="Link to revenue dashboard, deck, audit report, on-site photos..."
              />
              {error && <Text style={s.error}>{error}</Text>}
              <Button label="Submit request" onPress={submit} />
            </>
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
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    back: { padding: 4 },
    title: { color: p.textPrimary, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemiBold },
    scroll: { padding: Spacing.lg, gap: Spacing.md },
    card: {
      padding: Spacing.lg,
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      borderColor: p.border,
      gap: 4,
    },
    cardTitle: {
      color: p.textMuted,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    cardLevel: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.5,
      marginBottom: Spacing.sm,
    },
    cardHint: { color: p.textSecondary, fontSize: Typography.fontSizeSM },
    pendingNote: {
      color: p.warning,
      fontSize: Typography.fontSizeSM,
      backgroundColor: p.warning + '14',
      borderRadius: Radii.md,
      padding: Spacing.md,
    },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
  });
