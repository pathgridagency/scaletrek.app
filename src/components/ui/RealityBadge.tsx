import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { VerificationLevel } from '../../data/mockData';

interface Props {
  level: VerificationLevel;
  size?: number;
}

export const RealityBadge: React.FC<Props> = ({ level, size = 48 }) => {
  const { palette } = useTheme();
  const config: Record<VerificationLevel, { label: string; color: string; ring: number }> = {
    none: { label: 'None', color: palette.textMuted, ring: 0 },
    basic: { label: 'Basic', color: palette.textDim, ring: 35 },
    verified: { label: 'Verified', color: palette.reality, ring: 70 },
    elite: { label: 'Elite', color: palette.accent, ring: 100 },
  };
  const c = config[level];
  const sw = 1.5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const progress = (c.ring / 100) * circ;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke={palette.border} strokeWidth={sw} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={c.color}
          strokeWidth={sw}
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={[
          styles.inner,
          { top: sw + 2, width: size - (sw + 2) * 2, height: size - (sw + 2) * 2 },
        ]}
      >
        <Text style={[styles.label, { color: c.color }]}>{c.label.charAt(0)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center' },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: Typography.fontWeightSemiBold,
  },
});
