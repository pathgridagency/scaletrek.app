import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  size?: 'sm' | 'md' | 'lg';
}

export const SectionHeader: React.FC<Props> = ({ title, subtitle, action, size = 'md' }) => {
  const { palette } = useTheme();
  const titleSize =
    size === 'sm' ? Typography.fontSizeMD : size === 'lg' ? Typography.fontSize2XL : Typography.fontSizeLG;
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: palette.textPrimary,
            fontSize: titleSize,
            fontWeight: Typography.fontWeightBold,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              color: palette.textSecondary,
              fontSize: Typography.fontSizeSM,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={8}>
          <Text
            style={{
              color: palette.accent,
              fontSize: Typography.fontSizeSM,
              fontWeight: Typography.fontWeightSemiBold,
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
});
