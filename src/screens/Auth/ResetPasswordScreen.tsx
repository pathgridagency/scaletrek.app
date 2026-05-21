import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';

interface Props {
  onDone: () => void;
}

// Shown when the user lands via the password-reset deep link. The session is
// already established by useOAuthDeepLink (it sets the session from the
// access_token in the URL fragment), so we just need to call updateUser with
// the new password.
export const ResetPasswordScreen: React.FC<Props> = ({ onDone }) => {
  const { palette } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = styles(palette);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) setError(err.message);
      else onDone();
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
          <Text style={s.title}>Set a new password</Text>
          <Text style={s.subtitle}>
            You&apos;re signed in from the reset link. Pick a new password to
            finish.
          </Text>

          <View style={s.form}>
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
            <TextField
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Type it again"
            />
            {error && <Text style={s.error}>{error}</Text>}
            <Button label="Save new password" onPress={submit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingTop: Spacing.xxxl },
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
  });
