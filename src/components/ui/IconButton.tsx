import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  variant?: 'plain' | 'surface' | 'glass';
  badge?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<Props> = ({
  icon,
  onPress,
  size = 38,
  variant = 'surface',
  badge,
  style,
  disabled,
}) => {
  const { palette } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const bg =
    variant === 'plain'
      ? 'transparent'
      : variant === 'glass'
        ? palette.accentSubtle
        : palette.surface;
  const border = variant === 'plain' ? 'transparent' : palette.border;

  const onIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={disabled}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: variant === 'plain' ? 0 : StyleSheet.hairlineWidth,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {icon}
        {badge && <View style={styles.badge}>{badge}</View>}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: 0, right: 0 },
});
