import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Crown, Sparkles } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

type Kind = 'pro' | 'elite' | 'verified' | 'beta' | 'new' | 'neutral';
type Size = 'xs' | 'sm' | 'md';

interface Props {
  kind?: Kind;
  size?: Size;
  label?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<Props> = ({ kind = 'neutral', size = 'sm', label, icon, style }) => {
  const { palette } = useTheme();

  const defaults: Record<Kind, { label: string; gradient?: [string, string]; bg: string; fg: string; border: string; icon: React.ReactNode }> = {
    pro: {
      label: 'PRO',
      gradient: palette.proGradient,
      bg: palette.pro,
      fg: '#FFFFFF',
      border: palette.proBorder,
      icon: <Sparkles size={size === 'xs' ? 10 : 12} color="#FFFFFF" strokeWidth={2.5} />,
    },
    elite: {
      label: 'ELITE',
      gradient: palette.eliteGradient,
      bg: palette.elite,
      fg: '#1A1A1F',
      border: palette.eliteBorder,
      icon: <Crown size={size === 'xs' ? 10 : 12} color="#1A1A1F" strokeWidth={2.5} />,
    },
    verified: {
      label: 'Verified',
      bg: palette.info,
      fg: '#FFFFFF',
      border: palette.info,
      icon: <BadgeCheck size={size === 'xs' ? 10 : 12} color="#FFFFFF" strokeWidth={2.5} />,
    },
    beta: { label: 'BETA', bg: palette.accentSubtle, fg: palette.accent, border: palette.accentBorder, icon: null },
    new: { label: 'NEW', bg: palette.success, fg: '#FFFFFF', border: palette.success, icon: null },
    neutral: { label: 'New', bg: palette.surface, fg: palette.textSecondary, border: palette.border, icon: null },
  };
  const cfg = defaults[kind];
  const text = label ?? cfg.label;
  const padV = size === 'xs' ? 2 : size === 'md' ? 6 : 4;
  const padH = size === 'xs' ? 6 : size === 'md' ? 10 : 8;
  const fs = size === 'xs' ? 9 : size === 'md' ? 11 : 10;

  if (cfg.gradient) {
    return (
      <View
        style={[
          {
            borderRadius: Radii.full,
            overflow: 'hidden',
            alignSelf: 'flex-start',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: padV,
            paddingHorizontal: padH,
          }}
        >
          {icon ?? cfg.icon}
          <Text
            style={{
              color: cfg.fg,
              fontSize: fs,
              fontWeight: Typography.fontWeightBold,
              letterSpacing: 0.8,
            }}
          >
            {text}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingVertical: padV,
          paddingHorizontal: padH,
        },
        style,
      ]}
    >
      {(icon ?? cfg.icon) && <View style={{ marginRight: 4 }}>{icon ?? cfg.icon}</View>}
      <Text style={{ color: cfg.fg, fontSize: fs, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 }}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
