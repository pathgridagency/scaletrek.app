import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react-native';
import { Radii, Spacing, Typography, AccentKind, accentFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  value: string;
  label: string;
  unit?: string;
  delta?: number;
  verified?: boolean;
  accent?: AccentKind;
  compact?: boolean;
}

const numberPattern = /-?\d+(?:[.,]\d+)?/;

const parseValue = (
  raw: string,
): { prefix: string; number: number; suffix: string; decimals: number } => {
  const match = raw.match(numberPattern);
  if (!match) {
    return { prefix: raw, number: 0, suffix: '', decimals: 0 };
  }
  const rawNumber = match[0].replace(/,/g, '');
  const number = parseFloat(rawNumber);
  const decimals = rawNumber.includes('.') ? rawNumber.split('.')[1]!.length : 0;
  const start = match.index ?? 0;
  return {
    prefix: raw.slice(0, start),
    number: Number.isFinite(number) ? number : 0,
    suffix: raw.slice(start + match[0].length),
    decimals: Math.min(decimals, 4),
  };
};

const groupThousands = (intStr: string) => intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const format = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const [intPart, decPart] = abs.toFixed(decimals).split('.');
  const grouped = groupThousands(intPart ?? '0');
  return decimals > 0 ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
};

export const MetricTicker: React.FC<Props> = ({
  value,
  label,
  unit,
  delta,
  verified,
  accent = 'dreamer',
  compact,
}) => {
  const { palette } = useTheme();
  const tokens = useMemo(() => parseValue(value), [value]);
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(() => format(0, tokens.decimals));

  useEffect(() => {
    animated.setValue(0);
    const listener = animated.addListener(({ value: v }) => {
      setDisplay(format(tokens.number * v, tokens.decimals));
    });
    Animated.timing(animated, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animated.removeListener(listener);
  }, [animated, tokens.number, tokens.decimals]);

  const a = accentFor(palette, accent);
  const deltaPositive = (delta ?? 0) > 0;
  const deltaNegative = (delta ?? 0) < 0;
  const deltaColor = deltaPositive
    ? palette.success
    : deltaNegative
    ? palette.error
    : palette.textMuted;
  const DeltaIcon = deltaPositive ? TrendingUp : deltaNegative ? TrendingDown : null;
  const s = styles(palette);

  return (
    <View style={[s.container, { borderColor: a.border, backgroundColor: a.subtle }, compact && s.compact]}>
      <View style={s.row}>
        <Text style={s.label} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {verified ? (
          <View style={[s.verified, { borderColor: a.border }]}>
            <ShieldCheck size={10} color={a.primary} strokeWidth={2} />
            <Text style={[s.verifiedText, { color: a.primary }]}>VERIFIED</Text>
          </View>
        ) : null}
      </View>
      <View style={s.valueRow}>
        <Text style={[s.value, { color: a.primary }, compact && s.valueCompact]} numberOfLines={1}>
          {tokens.prefix}
          {display}
          {tokens.suffix}
        </Text>
        {unit ? <Text style={s.unit}>{unit}</Text> : null}
      </View>
      {delta !== undefined && delta !== 0 ? (
        <View style={s.deltaRow}>
          {DeltaIcon ? <DeltaIcon size={11} color={deltaColor} strokeWidth={2} /> : null}
          <Text style={[s.deltaText, { color: deltaColor }]}>
            {deltaPositive ? '+' : ''}
            {delta.toFixed(Math.abs(delta) < 10 ? 1 : 0)}
            {unit ?? '%'} this week
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    container: {
      borderWidth: 0.5,
      borderRadius: Radii.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      gap: 2,
    },
    compact: { paddingVertical: 6, paddingHorizontal: Spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: {
      color: p.textMuted,
      fontSize: 10,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.6,
    },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radii.full,
      borderWidth: 0.5,
    },
    verifiedText: { fontSize: 9, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    value: {
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.6,
    },
    valueCompact: { fontSize: Typography.fontSizeLG },
    unit: { color: p.textSecondary, fontSize: Typography.fontSizeXS },
    deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deltaText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
  });
