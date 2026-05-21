import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronLeft, Bookmark, Crown } from 'lucide-react-native';
import { Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';
import { fetchSavedPostIds } from '../lib/sync/saved';
import { FeedCard } from '../components/feed/FeedCard';

interface Props {
  onClose: () => void;
  onUpgrade: () => void;
  onOpenProfile: (userId: string) => void;
}

export const SavedPostsScreen: React.FC<Props> = ({ onClose, onUpgrade, onOpenProfile }) => {
  const { palette } = useTheme();
  const isPro = useSubscriptionStore((s) => s.isPro);
  const user = useAuthStore((s) => s.user);
  const allPosts = useFeedStore((s) => s.posts);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const s = styles(palette);

  useEffect(() => {
    if (!isPro || !user) return;
    fetchSavedPostIds(user.id)
      .then(setSavedIds)
      .catch(() => setSavedIds([]));
  }, [isPro, user?.id]);

  if (!isPro) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
            <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.title}>Saved</Text>
          <View style={{ width: 36 }} />
        </View>
        <EmptyState
          icon={<Crown size={28} color={palette.pro} strokeWidth={2} />}
          title="Pro feature"
          description="Bookmark posts and revisit them later. Upgrade to Pro to start saving."
          cta={{ label: 'See Pro', onPress: onUpgrade }}
        />
      </Screen>
    );
  }

  if (savedIds === null) {
    return (
      <Screen edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
            <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.title}>Saved</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.loading}>
          <ActivityIndicator color={palette.accent} />
        </View>
      </Screen>
    );
  }

  const saved = allPosts.filter((p) => savedIds.includes(p.id));

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back} hitSlop={8}>
          <ChevronLeft size={22} color={palette.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Saved</Text>
        <Badge kind="pro" size="xs" />
      </View>

      {saved.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={28} color={palette.accent} strokeWidth={2} />}
          title="No saved posts yet"
          description="Tap the bookmark on any post to save it here for later."
        />
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              liked={user ? item.likedBy?.includes(user.id) : false}
              signaled={user ? item.signaledBy?.includes(user.id) : false}
              onLike={(id) => user && toggleLike(id, user.id)}
              onSignal={() => undefined}
              onAuthorPress={onOpenProfile}
              onReport={() => undefined}
            />
          )}
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
          showsVerticalScrollIndicator={false}
        />
      )}
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
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    title: { color: p.textPrimary, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, letterSpacing: -0.2 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
