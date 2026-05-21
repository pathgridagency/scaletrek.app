import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useDealsStore } from '../store/useDealsStore';
import { useFeedStore } from '../store/useFeedStore';
import { Screen } from '../components/ui/Screen';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { DealStage } from '../data/mockData';

interface Props {
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

const STAGES: { value: DealStage; label: string }[] = [
  { value: 'exploring', label: 'Exploring' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'closed', label: 'Closed' },
];

export const DealPipelineScreen: React.FC<Props> = ({ onClose, onOpenProfile }) => {
  const { palette } = useTheme();
  const me = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const posts = useFeedStore((s) => s.posts);
  const items = useDealsStore((s) => s.items);
  const setStage = useDealsStore((s) => s.setStage);
  const remove = useDealsStore((s) => s.remove);
  const s = styles(palette);

  if (!me) return null;
  const myDeals = items.filter((d) => d.investorId === me.id);

  const stageColor = (st: DealStage) =>
    st === 'closed' ? palette.success : st === 'negotiating' ? palette.warning : palette.textSecondary;

  const advance = (id: string, current: DealStage, dir: 1 | -1) => {
    const idx = STAGES.findIndex((s) => s.value === current);
    const next = STAGES[idx + dir];
    if (next) setStage(id, next.value);
  };

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Deal Pipeline</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.board}>
        {STAGES.map((stage) => {
          const stageDeals = myDeals.filter((d) => d.stage === stage.value);
          return (
            <View key={stage.value} style={s.column}>
              <View style={s.colHeader}>
                <View style={[s.colDot, { backgroundColor: stageColor(stage.value) }]} />
                <Text style={s.colTitle}>{stage.label}</Text>
                <Text style={s.colCount}>{stageDeals.length}</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {stageDeals.map((deal) => {
                  const dreamer = users.find((u) => u.id === deal.dreamerId);
                  const post = deal.postId ? posts.find((p) => p.id === deal.postId) : undefined;
                  if (!dreamer) return null;
                  return (
                    <GlassCard key={deal.id} style={s.dealCard}>
                      <TouchableOpacity
                        style={s.dealHead}
                        onPress={() => onOpenProfile(dreamer.id)}
                      >
                        <Avatar initials={dreamer.avatar} size={32} accent="dreamer" />
                        <View style={{ flex: 1 }}>
                          <Text style={s.dealName}>{dreamer.name}</Text>
                          <Text style={s.dealMeta}>
                            {dreamer.industry ?? 'General'} · {deal.updatedAt}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {post && <Text style={s.postTitle}>{post.milestoneTitle}</Text>}
                      {deal.notes ? <Text style={s.notes}>{deal.notes}</Text> : null}
                      {deal.amount ? <Text style={[s.amount, { color: palette.success }]}>{deal.amount}</Text> : null}

                      <View style={s.dealActions}>
                        <TouchableOpacity
                          style={s.iconBtn}
                          disabled={stage.value === 'exploring'}
                          onPress={() => advance(deal.id, stage.value, -1)}
                        >
                          <ArrowLeft
                            size={14}
                            color={stage.value === 'exploring' ? palette.textDim : palette.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.iconBtn} onPress={() => remove(deal.id)}>
                          <Trash2 size={14} color={palette.error} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.iconBtn}
                          disabled={stage.value === 'closed'}
                          onPress={() => advance(deal.id, stage.value, 1)}
                        >
                          <ArrowRight
                            size={14}
                            color={stage.value === 'closed' ? palette.textDim : palette.accent}
                          />
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                  );
                })}
                {stageDeals.length === 0 && (
                  <View style={s.emptyCol}>
                    <Text style={s.emptyText}>No deals</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    back: { padding: 4 },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    board: { padding: Spacing.lg, gap: Spacing.md },
    column: {
      width: 260,
      backgroundColor: p.surface,
      borderRadius: Radii.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    colHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    colDot: { width: 8, height: 8, borderRadius: 4 },
    colTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
      flex: 1,
    },
    colCount: {
      color: p.textMuted,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    dealCard: { padding: Spacing.md, gap: Spacing.sm },
    dealHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dealName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    dealMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    postTitle: { color: p.textPrimary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium },
    notes: { color: p.textSecondary, fontSize: Typography.fontSizeXS, lineHeight: 17 },
    amount: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold },
    dealActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      justifyContent: 'space-between',
      paddingTop: Spacing.sm,
      borderTopWidth: 0.5,
      borderTopColor: p.borderSubtle,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCol: { padding: Spacing.lg, alignItems: 'center' },
    emptyText: { color: p.textMuted, fontSize: Typography.fontSizeXS },
  });
