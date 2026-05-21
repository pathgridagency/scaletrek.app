import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { ChevronLeft, Search as SearchIcon, X } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';
import { Avatar } from '../components/ui/Avatar';
import { GlassCard } from '../components/ui/GlassCard';
import { Screen } from '../components/ui/Screen';
import { fetchTrendingTags, TrendingTag } from '../lib/sync/trending';

interface Props {
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

type Tab = 'all' | 'people' | 'posts' | 'tags';

export const SearchScreen: React.FC<Props> = ({ onClose, onOpenProfile }) => {
  const { palette } = useTheme();
  const users = useAuthStore((s) => s.users);
  const posts = useFeedStore((s) => s.posts);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const q = query.trim().toLowerCase();

  const matchedUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          !u.suspended &&
          u.role !== 'admin' &&
          (u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            (u.industry ?? '').toLowerCase().includes(q))
      ),
    [users, q]
  );

  const matchedPosts = useMemo(
    () =>
      posts
        .filter((p) => !p.removed)
        .filter(
          (p) =>
            p.milestoneTitle.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.industry.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        ),
    [posts, q]
  );

  const [serverTrending, setServerTrending] = useState<TrendingTag[]>([]);
  useEffect(() => {
    fetchTrendingTags(20)
      .then(setServerTrending)
      .catch(() => undefined);
  }, []);

  const trendingTags = useMemo<[string, number][]>(() => {
    // Prefer the server-side view (cross-user popularity) when available.
    if (serverTrending.length > 0) {
      return serverTrending
        .filter((t) => !q || t.tag.toLowerCase().includes(q))
        .map((t) => [t.tag, t.postCount] as [string, number]);
    }
    const counts: Record<string, number> = {};
    posts
      .filter((p) => !p.removed)
      .forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts)
      .filter(([t]) => !q || t.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [posts, q, serverTrending]);

  const s = styles(palette);

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <View style={s.searchBox}>
          <SearchIcon size={14} color={palette.textMuted} strokeWidth={1.6} />
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people, posts, tags..."
            placeholderTextColor={palette.textMuted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={14} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.tabs}>
        {(['all', 'people', 'posts', 'tags'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && { borderBottomColor: palette.accent }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && { color: palette.accent }]}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {(tab === 'all' || tab === 'people') && matchedUsers.length > 0 && (
          <>
            <Text style={s.sectionTitle}>People</Text>
            {matchedUsers.map((u) => (
              <TouchableOpacity key={u.id} onPress={() => onOpenProfile(u.id)}>
                <GlassCard style={s.userRow}>
                  <Avatar initials={u.avatar} size={42} accent={u.role === 'investor' ? 'reality' : 'dreamer'} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{u.name}</Text>
                    <Text style={s.userMeta}>
                      {u.username} · {u.industry ?? u.role}
                    </Text>
                  </View>
                  <Text style={s.userScore}>{u.momentumScore}</Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        {(tab === 'all' || tab === 'tags') && trendingTags.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{q ? 'Tags' : 'Trending Tags'}</Text>
            <View style={s.tagWrap}>
              {trendingTags.map(([tag, count]) => (
                <TouchableOpacity
                  key={tag}
                  style={s.tagChip}
                  onPress={() => {
                    setQuery(tag);
                    setTab('posts');
                  }}
                >
                  <Text style={s.tagText}>#{tag}</Text>
                  <Text style={s.tagCount}>{count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(tab === 'all' || tab === 'posts') && matchedPosts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Posts</Text>
            <FlatList
              data={matchedPosts}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <GlassCard style={s.postRow}>
                  <Text style={s.postTitle}>{item.milestoneTitle}</Text>
                  <Text style={s.postMeta}>
                    {item.userName} · {item.industry} · {item.createdAt}
                  </Text>
                  <Text style={s.postDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </GlassCard>
              )}
            />
          </>
        )}

        {q.length > 0 && matchedUsers.length === 0 && matchedPosts.length === 0 && trendingTags.length === 0 && (
          <Text style={s.empty}>No matches for "{query}".</Text>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    back: { padding: 4 },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: p.card,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.border,
    },
    input: { flex: 1, color: p.textPrimary, fontSize: Typography.fontSizeSM, padding: 0 },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    tab: {
      paddingBottom: Spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabText: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    scroll: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: Spacing.sm,
      marginBottom: 4,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
    },
    userName: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    userMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    userScore: { color: p.accent, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
      backgroundColor: p.accentSubtle,
    },
    tagText: { color: p.accent, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    tagCount: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    postRow: { padding: Spacing.md, gap: 4 },
    postTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    postMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    postDesc: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 18 },
    empty: { color: p.textMuted, textAlign: 'center', padding: Spacing.xl, fontSize: Typography.fontSizeSM },
  });
