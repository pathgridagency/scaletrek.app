import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Spacing, Typography, Radii } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  size?: number;
  error?: string;
}

export const Checkbox: React.FC<Props> = ({ checked, onChange, label, size = 22, error }) => {
  const { palette } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        onPress={() => onChange(!checked)}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={6}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: checked ? palette.accent : 'transparent',
            borderColor: error ? palette.error : checked ? palette.accent : palette.borderStrong,
          }}
        >
          {checked && <Check size={size * 0.65} color={palette.accentOn} strokeWidth={3} />}
        </View>
        {typeof label === 'string' ? (
          <Text style={{ flex: 1, color: palette.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 20 }}>
            {label}
          </Text>
        ) : (
          <View style={{ flex: 1 }}>{label}</View>
        )}
      </Pressable>
      {error && <Text style={{ color: palette.error, fontSize: Typography.fontSizeXS, marginLeft: size + 12 }}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
