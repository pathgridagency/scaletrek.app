import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  score: number;
  accentColor?: string;
  showDot?: boolean;
}

export const MomentumPill: React.FC<Props> = ({ score, accentColor, showDot = true }) => {
  const { palette } = useTheme();
  const active = score >= 85;
  const color = accentColor ?? (active ? palette.accent : palette.textDim);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={styles.row}>
      {showDot && active ? (
        <Animated.View
          style={[
            styles.dot,
            { backgroundColor: color, transform: [{ scale: dotScale }], opacity: dotOpacity },
          ]}
        />
      ) : null}
      <Text style={[styles.text, { color }]}>{score}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 999 },
  text: {
    fontSize: Typography.fontSizeXS,
    fontWeight: Typography.fontWeightSemiBold,
    letterSpacing: 0.3,
  },
});
