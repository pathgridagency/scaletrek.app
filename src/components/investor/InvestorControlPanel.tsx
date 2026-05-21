import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Filter, Sparkles, ShieldCheck } from 'lucide-react-native';
import { Radii, Spacing, Typography, accentFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { useFeedStore } from '../../store/useFeedStore';
import { FeedType } from '../../data/mockData';

interface Props {
  onChange?: (feed: FeedType) => void;
}

export const InvestorControlPanel: React.FC<Props> = ({ onChange }) => {
  const { palette } = useTheme();
  const activeFeed = useFeedStore((s) => s.activeFeed);
  const riskFilter = useFeedStore((s) => s.riskFilter);
  const rewardFilter = useFeedStore((s) => s.rewardFilter);
  const posts = useFeedStore((s) => s.posts);
  const toggleFeed = useFeedStore((s) => s.toggleFeed);
  const setRiskFilter = useFeedStore((s) => s.setRiskFilter);
  const setRewardFilter = useFeedStore((s) => s.setRewardFilter);

  const { dreamerCount, realityCount, activeCount } = useMemo(() => {
    let dreamer = 0;
    let reality = 0;
    for (const p of posts) {
      if (p.removed) continue;
      if (p.riskScore > riskFilter || p.rewardScore < rewardFilter) continue;
      if (p.type === 'dreamer') dreamer += 1;
      else reality += 1;
    }
    return {
      dreamerCount: dreamer,
      realityCount: reality,
      activeCount: activeFeed === 'dreamer' ? dreamer : reality,
    };
  }, [posts, riskFilter, rewardFilter, activeFeed]);

  const aActive = accentFor(palette, activeFeed === 'dreamer' ? 'dreamer' : 'reality');
  const aDreamer = accentFor(palette, 'dreamer');
  const aReality = accentFor(palette, 'reality');

  const select = (feed: FeedType) => {
    toggleFeed(feed);
    onChange?.(feed);
  };

  const s = styles(palette);

  return (
    <View style={[s.panel, { borderColor: aActive.border }]}>
      <View style={s.header}>
        <Filter size={14} color={palette.textSecondary} strokeWidth={1.6} />
        <Text style={s.title}>Investor Control Panel</Text>
        <Text style={[s.activeCount, { color: aActive.primary }]}>{activeCount}</Text>
      </View>

      <View style={[s.toggle, { borderColor: palette.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            s.segment,
            activeFeed === 'dreamer' && {
              backgroundColor: aDreamer.subtle,
              borderColor: aDreamer.border,
            },
          ]}
          onPress={() => select('dreamer')}
        >
          <Sparkles
            size={14}
            color={activeFeed === 'dreamer' ? aDreamer.primary : palette.textMuted}
            strokeWidth={1.6}
          />
          <View style={s.segmentMeta}>
            <Text
              style={[
                s.segmentLabel,
                { color: activeFeed === 'dreamer' ? aDreamer.primary : palette.textSecondary },
              ]}
            >
              Dreamers
            </Text>
            <Text style={s.segmentCount}>{dreamerCount} matching</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            s.segment,
            activeFeed === 'reality' && {
              backgroundColor: aReality.subtle,
              borderColor: aReality.border,
            },
          ]}
          onPress={() => select('reality')}
        >
          <ShieldCheck
            size={14}
            color={activeFeed === 'reality' ? aReality.primary : palette.textMuted}
            strokeWidth={1.6}
          />
          <View style={s.segmentMeta}>
            <Text
              style={[
                s.segmentLabel,
                { color: activeFeed === 'reality' ? aReality.primary : palette.textSecondary },
              ]}
            >
              Reality Checks
            </Text>
            <Text style={s.segmentCount}>{realityCount} matching</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={s.sliderGroup}>
        <View style={s.sliderRow}>
          <Text style={s.sliderLabel}>Max Risk</Text>
          <Text style={[s.sliderValue, { color: palette.warning }]}>
            {riskFilter.toFixed(1)}
          </Text>
        </View>
        <Slider
          style={s.slider}
          minimumValue={0}
          maximumValue={10}
          step={0.1}
          value={riskFilter}
          onValueChange={setRiskFilter}
          minimumTrackTintColor={palette.warning}
          maximumTrackTintColor={palette.surface}
          thumbTintColor={palette.warning}
        />
      </View>

      <View style={s.sliderGroup}>
        <View style={s.sliderRow}>
          <Text style={s.sliderLabel}>Min Reward</Text>
          <Text style={[s.sliderValue, { color: palette.success }]}>
            {rewardFilter.toFixed(1)}
          </Text>
        </View>
        <Slider
          style={s.slider}
          minimumValue={0}
          maximumValue={10}
          step={0.1}
          value={rewardFilter}
          onValueChange={setRewardFilter}
          minimumTrackTintColor={palette.success}
          maximumTrackTintColor={palette.surface}
          thumbTintColor={palette.success}
        />
      </View>

      <View style={s.footer}>
        <Text style={s.footerHint}>
          Showing <Text style={{ color: aActive.primary, fontWeight: Typography.fontWeightSemiBold }}>
            {activeCount}
          </Text>{' '}
          {activeFeed === 'dreamer' ? 'dreamer' : 'reality-check'} opportunities
        </Text>
      </View>
    </View>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    panel: {
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    title: {
      flex: 1,
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    activeCount: {
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    toggle: {
      flexDirection: 'row',
      gap: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      padding: 4,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.sm,
      borderWidth: 0.5,
      borderColor: 'transparent',
    },
    segmentMeta: { flex: 1 },
    segmentLabel: {
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    segmentCount: { color: p.textMuted, fontSize: 10 },
    sliderGroup: { gap: 2 },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sliderLabel: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    sliderValue: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold },
    slider: { width: '100%', height: 32 },
    footer: { paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: p.borderSubtle },
    footerHint: { color: p.textSecondary, fontSize: Typography.fontSizeXS, textAlign: 'center' },
  });
