import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, View, StyleSheet, Animated } from 'react-native';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const TextField: React.FC<Props> = ({
  label,
  error,
  hint,
  style,
  leadingIcon,
  trailingIcon,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);
  const s = styles(palette);
  const borderColor = error
    ? palette.error
    : focused
      ? palette.accent
      : palette.border;
  const labelColor = error ? palette.error : focused ? palette.accent : palette.textSecondary;

  return (
    <View style={s.wrap}>
      {label && <Text style={[s.label, { color: labelColor }]}>{label}</Text>}
      <View
        style={[
          s.fieldContainer,
          {
            borderColor,
            backgroundColor: palette.card,
          },
        ]}
      >
        {leadingIcon && <View style={s.icon}>{leadingIcon}</View>}
        <TextInput
          {...rest}
          placeholderTextColor={palette.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.input, style]}
        />
        {trailingIcon && <View style={s.icon}>{trailingIcon}</View>}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    wrap: { gap: 6 },
    label: {
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    fieldContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: Radii.lg,
      paddingHorizontal: Spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: Spacing.md,
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
    },
    icon: { paddingHorizontal: 4 },
    error: { color: p.error, fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightMedium },
    hint: { color: p.textMuted, fontSize: Typography.fontSizeXS },
  });
