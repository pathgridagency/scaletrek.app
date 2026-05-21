import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radii, Spacing, Typography, elevationFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  gradientColors?: [string, string];
  fullWidth?: boolean;
  elevated?: boolean;
}

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  iconRight,
  style,
  accentColor,
  gradientColors,
  fullWidth,
  elevated,
}) => {
  const { palette } = useTheme();
  const accent = accentColor ?? palette.accent;
  const scale = useRef(new Animated.Value(1)).current;

  const padV = size === 'sm' ? Spacing.sm : size === 'lg' ? Spacing.md + 2 : size === 'xl' ? Spacing.lg : Spacing.sm + 4;
  const padH = size === 'sm' ? Spacing.md : size === 'xl' ? Spacing.xxl : Spacing.lg;
  const font =
    size === 'sm'
      ? Typography.fontSizeXS
      : size === 'lg'
        ? Typography.fontSizeMD
        : size === 'xl'
          ? Typography.fontSizeLG
          : Typography.fontSizeSM;

  const colors: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: accent, fg: palette.accentOn, border: accent },
    secondary: { bg: palette.surface, fg: palette.textPrimary, border: palette.border },
    outline: { bg: 'transparent', fg: palette.textPrimary, border: palette.borderStrong },
    ghost: { bg: 'transparent', fg: accent, border: 'transparent' },
    danger: { bg: palette.error, fg: palette.white, border: palette.error },
    gradient: { bg: 'transparent', fg: palette.white, border: 'transparent' },
  };
  const c = colors[variant];

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  const elev = elevated || variant === 'primary' || variant === 'gradient' ? elevationFor(palette, 'sm') : null;

  const inner = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={c.fg} />
      ) : (
        <>
          {icon && <View style={{ marginRight: Spacing.sm }}>{icon}</View>}
          <Text style={{ color: c.fg, fontSize: font, fontWeight: Typography.fontWeightSemiBold, letterSpacing: 0.1 }}>
            {label}
          </Text>
          {iconRight && <View style={{ marginLeft: Spacing.sm }}>{iconRight}</View>}
        </>
      )}
    </View>
  );

  const baseStyle: ViewStyle = {
    borderRadius: Radii.full,
    paddingVertical: padV,
    paddingHorizontal: padH,
    opacity: disabled ? 0.45 : 1,
    overflow: 'hidden',
    alignSelf: fullWidth ? 'stretch' : 'auto',
    ...(elev || {}),
  };

  return (
    <Animated.View style={[{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'auto' }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={[
          baseStyle,
          variant !== 'gradient' && {
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth: variant === 'outline' || variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        {variant === 'gradient' ? (
          <LinearGradient
            colors={gradientColors ?? palette.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {inner}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
