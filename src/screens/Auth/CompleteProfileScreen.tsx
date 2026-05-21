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
import { Shield, Zap } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { UserRole } from '../../data/mockData';

// Shown after an OAuth sign-up (Google/LinkedIn/etc.) when the freshly-created
// profile is missing the role + display details. The trigger filled in name +
// username + avatar from email/metadata; we collect what's missing here.
export const CompleteProfileScreen: React.FC = () => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [industry, setIndustry] = useState(user?.industry ?? '');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>(
    user?.role === 'investor' ? 'investor' : 'dreamer',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = styles(palette);

  if (!user) return null;

  const submit = async () => {
    setError(null);
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }
    setLoading(true);
    try {
      updateUser({
        name: name.trim(),
        username: username.trim().startsWith('@')
          ? username.trim()
          : `@${username.trim()}`,
        bio: bio.trim(),
        industry: industry.trim() || undefined,
        role,
        profileComplete: true,
      });
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
          <Text style={s.title}>Finish your profile</Text>
          <Text style={s.subtitle}>
            Tell us how you want to appear on ScaleTrek.
          </Text>

          <View style={s.roleSwitch}>
            {(
              [
                { value: 'dreamer', label: 'Dreamer', icon: Zap, color: palette.dreamer },
                { value: 'investor', label: 'Investor', icon: Shield, color: palette.reality },
              ] as const
            ).map(({ value, label, icon: Icon, color }) => {
              const active = role === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    s.roleBtn,
                    active && {
                      borderColor: color,
                      backgroundColor: color + '14',
                    },
                  ]}
                  onPress={() => setRole(value)}
                  activeOpacity={0.85}
                >
                  <Icon
                    size={16}
                    color={active ? color : palette.textMuted}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[
                      s.roleText,
                      { color: active ? color : palette.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.form}>
            <TextField label="Full name" value={name} onChangeText={setName} />
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextField
              label="Industry (optional)"
              value={industry}
              onChangeText={setIndustry}
              placeholder="AgriTech, FinTech, ..."
            />
            <TextField
              label="Bio (optional)"
              value={bio}
              onChangeText={setBio}
              multiline
              style={{ minHeight: 72, textAlignVertical: 'top' }}
              placeholder="One sentence about what you're building."
            />

            {error && <Text style={s.error}>{error}</Text>}

            <Button label="Continue" onPress={submit} loading={loading} />
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
    roleText: {
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    form: { gap: Spacing.md },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
  });
