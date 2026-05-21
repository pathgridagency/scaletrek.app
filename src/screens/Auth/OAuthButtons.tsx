import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { signInWithOAuthProvider, OAuthProvider } from '../../lib/sync/oauth_web';

interface Props {
  onError: (message: string) => void;
}

// Compact OAuth button row reused on Login + Signup. Google goes through the
// native module (best UX on Android); other providers use the web-OAuth flow
// in oauth_web.ts.
export const OAuthButtons: React.FC<Props> = ({ onError }) => {
  const { palette } = useTheme();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [busy, setBusy] = useState<string | null>(null);
  const s = styles(palette);

  const handleGoogle = async () => {
    setBusy('google');
    try {
      const r = await loginWithGoogle();
      if (!r.ok) onError(r.error);
    } finally {
      setBusy(null);
    }
  };

  const handleWeb = async (provider: OAuthProvider) => {
    setBusy(provider);
    try {
      const r = await signInWithOAuthProvider(provider);
      if (!r.ok) onError(r.error);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.wrap}>
      <TouchableOpacity
        style={[s.googleBtn, busy === 'google' && s.busy]}
        onPress={handleGoogle}
        disabled={!!busy}
        activeOpacity={0.85}
      >
        <View style={s.gIcon}>
          <Text style={s.gLetter}>G</Text>
        </View>
        <Text style={s.googleText}>
          {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      <View style={s.providerRow}>
        {(
          [
            { id: 'linkedin_oidc', label: 'LinkedIn' },
            { id: 'github', label: 'GitHub' },
            { id: 'twitter', label: 'X' },
            { id: 'facebook', label: 'Facebook' },
          ] as { id: OAuthProvider; label: string }[]
        ).map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[s.providerBtn, busy === p.id && s.busy]}
            onPress={() => handleWeb(p.id)}
            disabled={!!busy}
            activeOpacity={0.85}
          >
            <Text style={s.providerLabel}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    wrap: { gap: Spacing.sm },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
      justifyContent: 'center',
    },
    gIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gLetter: { color: '#4285F4', fontWeight: '700', fontSize: 12 },
    googleText: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    providerRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'center',
    },
    providerBtn: {
      flex: 1,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
      alignItems: 'center',
    },
    providerLabel: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
    },
    busy: { opacity: 0.5 },
  });
