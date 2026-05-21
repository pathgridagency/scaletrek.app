import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { OAuthButtons } from './OAuthButtons';

interface Props {
  onSwitchToSignup: () => void;
  onForgotPassword?: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onSwitchToSignup, onForgotPassword }) => {
  const { palette } = useTheme();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = styles(palette);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) setError(result.error);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.name}: ${err.message}`
          : 'Unexpected error during sign-in.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoMark}>
            <TrendingUp size={24} color={palette.accent} strokeWidth={1.8} />
          </View>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your Scaletrek account.</Text>

          <View style={s.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
            />

            {error && <Text style={s.error}>{error}</Text>}

            <Button label="Sign in" onPress={submit} loading={loading} />

            {onForgotPassword && (
              <TouchableOpacity onPress={onForgotPassword} style={s.forgotBtn}>
                <Text style={s.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <OAuthButtons onError={setError} />

          <TouchableOpacity onPress={onSwitchToSignup} style={s.signupBtn}>
            <Text style={s.signupText}>Create new account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingTop: Spacing.xxxl },
    logoMark: {
      width: 56,
      height: 56,
      borderRadius: Radii.lg,
      backgroundColor: p.card,
      borderWidth: 0.5,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    subtitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      textAlign: 'center',
      marginTop: -Spacing.sm,
    },
    form: { gap: Spacing.md, marginTop: Spacing.md },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    dividerLine: { flex: 1, height: 0.5, backgroundColor: p.border },
    dividerText: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    signupBtn: {
      paddingVertical: Spacing.md,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
      alignItems: 'center',
    },
    signupText: {
      color: p.accent,
      fontWeight: Typography.fontWeightSemiBold,
      fontSize: Typography.fontSizeMD,
    },
    forgotBtn: { alignSelf: 'center', paddingVertical: 4 },
    forgotText: { color: p.textMuted, fontSize: Typography.fontSizeXS },
  });
