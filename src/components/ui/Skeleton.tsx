import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';
import { Radii } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<Props> = ({ width = '100%', height = 12, radius = Radii.sm, style }) => {
  const { palette, mode } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonGroup: React.FC<{ lines?: number; lastWidth?: `${number}%` }> = ({
  lines = 3,
  lastWidth = '60%',
}) => {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? lastWidth : '100%'} height={10} />
      ))}
    </View>
  );
};
