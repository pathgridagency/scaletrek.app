import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { ChevronLeft } from 'lucide-react-native';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

interface Props {
  onClose: () => void;
}

export const ForgotPasswordScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const s = styles(palette);

  const submit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your account email.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('reset-password');
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      );
      if (err) setError(err.message);
      else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={onClose} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
            <Text style={s.backText}>Sign in</Text>
          </TouchableOpacity>

          <Text style={s.title}>Reset your password</Text>
          <Text style={s.subtitle}>
            We&apos;ll email you a link that opens ScaleTrek to a new-password
            screen.
          </Text>

          {sent ? (
            <View style={s.sentBox}>
              <Text style={s.sentText}>
                Email sent. Open the link from your inbox on this device.
              </Text>
            </View>
          ) : (
            <View style={s.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />
              {error && <Text style={s.error}>{error}</Text>}
              <Button label="Send reset link" onPress={submit} loading={loading} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingTop: Spacing.xxxl },
    back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: p.textSecondary, fontSize: Typography.fontSizeSM },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    subtitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      marginTop: -Spacing.md,
    },
    form: { gap: Spacing.md },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    sentBox: {
      padding: Spacing.lg,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: p.success,
      backgroundColor: p.success + '14',
    },
    sentText: { color: p.success, fontSize: Typography.fontSizeSM, textAlign: 'center' },
  });
