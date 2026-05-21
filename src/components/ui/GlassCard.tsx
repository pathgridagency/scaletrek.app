import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Radii, elevationFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: 'dreamer' | 'reality' | 'admin' | 'accent' | 'pro' | 'elite' | 'none';
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  blur?: boolean;
  radius?: number;
}

export const GlassCard: React.FC<Props> = ({
  children,
  style,
  accent = 'none',
  elevation = 'none',
  blur = false,
  radius,
}) => {
  const { palette, mode } = useTheme();
  const borderColor =
    accent === 'dreamer'
      ? palette.dreamerBorder
      : accent === 'reality'
        ? palette.realityBorder
        : accent === 'admin'
          ? palette.adminBorder
          : accent === 'accent'
            ? palette.accentBorder
            : accent === 'pro'
              ? palette.proBorder
              : accent === 'elite'
                ? palette.eliteBorder
                : palette.border;

  const elev = elevation !== 'none' ? elevationFor(palette, elevation) : null;
  const br = radius ?? Radii.lg;

  const containerStyle: ViewStyle = {
    borderRadius: br,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor,
    overflow: 'hidden',
    backgroundColor: blur ? 'transparent' : palette.card,
    ...(elev || {}),
  };

  if (blur && Platform.OS !== 'web') {
    return (
      <View style={[containerStyle, style]}>
        <BlurView
          intensity={mode === 'dark' ? 40 : 60}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: mode === 'dark' ? 'rgba(19,19,22,0.6)' : 'rgba(255,255,255,0.65)' },
          ]}
        />
        {children}
      </View>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
};
