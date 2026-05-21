import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from './Button';

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; onPress: () => void };
}

export const EmptyState: React.FC<Props> = ({ icon, title, description, cta }) => {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      {icon && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {icon}
        </View>
      )}
      <Text
        style={{
          color: palette.textPrimary,
          fontSize: Typography.fontSizeLG,
          fontWeight: Typography.fontWeightBold,
          letterSpacing: -0.2,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            color: palette.textSecondary,
            fontSize: Typography.fontSizeSM,
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {description}
        </Text>
      )}
      {cta && (
        <View style={{ marginTop: Spacing.sm }}>
          <Button label={cta.label} onPress={cta.onPress} variant="gradient" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
