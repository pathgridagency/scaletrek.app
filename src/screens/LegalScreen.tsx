import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, PRIVACY_VERSION, TERMS_VERSION } from '../constants/legal';

interface Props {
  kind: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalScreen: React.FC<Props> = ({ kind, onClose }) => {
  const { palette } = useTheme();
  const body = kind === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const version = kind === 'privacy' ? PRIVACY_VERSION : TERMS_VERSION;
  const titleText = kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const s = styles(palette);

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
          <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>{titleText}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.versionTag}>Version {version}</Text>
        {renderMarkdown(body, palette)}
        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </Screen>
  );
};

const renderMarkdown = (md: string, palette: any) => {
  // Very small markdown renderer for our two static docs: # h1, ## h2, **bold**, blank line breaks, list items "- ".
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      nodes.push(<View key={key++} style={{ height: 8 }} />);
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <Text
          key={key++}
          style={{
            color: palette.textPrimary,
            fontSize: Typography.fontSize2XL,
            fontWeight: Typography.fontWeightBlack,
            letterSpacing: -0.5,
            marginBottom: Spacing.sm,
          }}
        >
          {line.slice(2)}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <Text
          key={key++}
          style={{
            color: palette.textPrimary,
            fontSize: Typography.fontSizeLG,
            fontWeight: Typography.fontWeightBold,
            letterSpacing: -0.2,
            marginTop: Spacing.md,
            marginBottom: Spacing.xs,
          }}
        >
          {line.slice(3)}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('- ')) {
      nodes.push(
        <View key={key++} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM }}>•</Text>
          <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeSM, flex: 1, lineHeight: 22 }}>
            {renderBold(line.slice(2), palette)}
          </Text>
        </View>,
      );
      continue;
    }
    nodes.push(
      <Text
        key={key++}
        style={{
          color: palette.textSecondary,
          fontSize: Typography.fontSizeSM,
          lineHeight: 22,
          marginBottom: 6,
        }}
      >
        {renderBold(line, palette)}
      </Text>,
    );
  }
  return nodes;
};

const renderBold = (line: string, palette: any): React.ReactNode => {
  const parts = line.split(/\*\*/);
  return parts.map((part, i) =>
    i % 2 === 0 ? (
      <Text key={i}>{part}</Text>
    ) : (
      <Text key={i} style={{ color: palette.textPrimary, fontWeight: Typography.fontWeightBold }}>
        {part}
      </Text>
    ),
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.divider,
    },
    back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeLG,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.2,
    },
    scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
    versionTag: {
      alignSelf: 'flex-start',
      color: p.textMuted,
      fontSize: 11,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radii.full,
      backgroundColor: p.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      marginBottom: Spacing.md,
    },
  });
