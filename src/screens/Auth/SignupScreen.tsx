import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, Shield, Zap } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { UserRole } from '../../data/mockData';
import { OAuthButtons } from './OAuthButtons';
import { recordBothAcceptances } from '../../lib/sync/legal';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../constants/legal';

interface Props {
  onSwitchToLogin: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const SignupScreen: React.FC<Props> = ({ onSwitchToLogin, onOpenPrivacy, onOpenTerms }) => {
  const { palette } = useTheme();
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [industry, setIndustry] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('dreamer');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const s = styles(palette);

  const submit = async () => {
    setError(null);
    if (!accepted) {
      setError('You need to accept the Privacy Policy and Terms of Service.');
      return;
    }
    setLoading(true);
    try {
      const result = await signup({ name, username, email, password, role, bio, industry });
      if (result.ok === true) {
        // record the acceptance once the user has an authenticated session
        recordBothAcceptances(PRIVACY_VERSION, TERMS_VERSION).catch(() => undefined);
      }
      if (result.ok === 'verify') setPendingEmail(result.email);
      else if (result.ok !== true) setError(result.error);
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>
            We sent a confirmation link to {pendingEmail}. Tap it on this device
            to finish creating your account, then sign in.
          </Text>
          <View style={{ height: Spacing.lg }} />
          <TouchableOpacity onPress={onSwitchToLogin} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
            <Text style={s.backText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={onSwitchToLogin} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
            <Text style={s.backText}>Sign in</Text>
          </TouchableOpacity>

          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>A few details to get you started.</Text>

          <View style={s.roleSwitch}>
            {([
              { value: 'dreamer', label: 'Dreamer', icon: Zap, color: palette.dreamer },
              { value: 'investor', label: 'Investor', icon: Shield, color: palette.reality },
            ] as const).map(({ value, label, icon: Icon, color }) => {
              const active = role === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.roleBtn, active && { borderColor: color, backgroundColor: color + '14' }]}
                  onPress={() => setRole(value)}
                  activeOpacity={0.85}
                >
                  <Icon size={16} color={active ? color : palette.textMuted} strokeWidth={1.5} />
                  <Text style={[s.roleText, { color: active ? color : palette.textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.form}>
            <TextField label="Full name" value={name} onChangeText={setName} placeholder="Karim Benali" />
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="@karimb"
            />
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
              placeholder="At least 6 characters"
            />
            <TextField label="Industry (optional)" value={industry} onChangeText={setIndustry} placeholder="AgriTech, FinTech, ..." />
            <TextField
              label="Bio (optional)"
              value={bio}
              onChangeText={setBio}
              placeholder="One sentence about what you're building."
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />

            <Checkbox
              checked={accepted}
              onChange={setAccepted}
              label={
                <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 20 }}>
                  I have read and agree to the{' '}
                  <Text onPress={onOpenPrivacy} style={{ color: palette.accent, fontWeight: Typography.fontWeightSemiBold }}>
                    Privacy Policy
                  </Text>{' '}
                  and{' '}
                  <Text onPress={onOpenTerms} style={{ color: palette.accent, fontWeight: Typography.fontWeightSemiBold }}>
                    Terms of Service
                  </Text>
                  .
                </Text>
              }
            />

            {error && <Text style={s.error}>{error}</Text>}

            <Button label="Create account" onPress={submit} loading={loading} variant="gradient" size="lg" />
          </View>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign up with</Text>
            <View style={s.dividerLine} />
          </View>

          <OAuthButtons onError={setError} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    scroll: { padding: Spacing.xl, gap: Spacing.lg },
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
    roleSwitch: { flexDirection: 'row', gap: Spacing.sm },
    roleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    roleText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    form: { gap: Spacing.md },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    dividerLine: { flex: 1, height: 0.5, backgroundColor: p.border },
    dividerText: { color: p.textMuted, fontSize: Typography.fontSizeXS },
  });
