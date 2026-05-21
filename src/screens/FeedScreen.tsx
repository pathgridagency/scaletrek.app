import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Bell, Search } from 'lucide-react-native';
import { Radii, Spacing, Typography, accentFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useFeedStore } from '../store/useFeedStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useModerationStore } from '../store/useModerationStore';
import { FeedCard } from '../components/feed/FeedCard';
import { Avatar } from '../components/ui/Avatar';
import { Screen } from '../components/ui/Screen';
import { IconButton } from '../components/ui/IconButton';
import { StoriesRail } from '../components/stories/StoriesRail';
import { useChatStore } from '../store/useChatStore';
import { ShowcasePost } from '../data/mockData';
import { useTranslation } from '../i18n';

interface Props {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenStoryComposer: () => void;
  onOpenStoryViewer: (authorIndex: number) => void;
}

export const FeedScreen: React.FC<Props> = ({
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onOpenStoryComposer,
  onOpenStoryViewer,
}) => {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const feedView = useFeedStore((s) => s.feedView);
  const setFeedView = useFeedStore((s) => s.setFeedView);
  const sortMode = useFeedStore((s) => s.sortMode);
  const setSortMode = useFeedStore((s) => s.setSortMode);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const toggleSignal = useFeedStore((s) => s.toggleSignal);
  const feedItems = useFeedStore((s) => s.feedItems);
  const allPosts = useFeedStore((s) => s.posts);
  const riskFilter = useFeedStore((s) => s.riskFilter);
  const rewardFilter = useFeedStore((s) => s.rewardFilter);
  const user = useAuthStore((s) => s.user);
  const notifItems = useNotificationsStore((s) => s.items);
  const push = useNotificationsStore((s) => s.push);
  const reportPost = useModerationStore((s) => s.report);
  const blockedIds = useModerationStore((s) => s.blockedIds);
  const startThread = useChatStore((s) => s.startThread);
  const refresh = useFeedStore((s) => s.refresh);
  const [refreshing, setRefreshing] = useState(false);

  const posts = useMemo(
    () => feedItems().filter((p) => !blockedIds.includes(p.userId)),
    [feedItems, feedView, sortMode, allPosts, riskFilter, rewardFilter, blockedIds],
  );
  const accentKey: 'dreamer' | 'reality' = feedView === 'reality' ? 'reality' : 'dreamer';
  const a = accentFor(palette, accentKey);
  const unread = useMemo(
    () => (user ? notifItems.filter((n) => n.recipientId === user.id && !n.read).length : 0),
    [notifItems, user?.id],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.warn('[feed] refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignal = (post: ShowcasePost) => {
    if (!user) return;
    toggleSignal(post.id, user.id);
    if (!post.signaledBy?.includes(user.id) && post.userId !== user.id) {
      push({
        type: 'signal',
        recipientId: post.userId,
        actorId: user.id,
        actorName: user.name,
        actorAvatar: user.avatar,
        postId: post.id,
        message: `signaled your "${post.milestoneTitle}" milestone`,
      });
      startThread({ participantId: post.userId, participantName: post.userName, participantAvatar: post.userAvatar });
    }
  };

  const s = styles(palette);

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.logo}>ScaleTrek</Text>
        <View style={s.headerRight}>
          <IconButton
            icon={<Search size={18} color={palette.textPrimary} strokeWidth={2} />}
            onPress={onOpenSearch}
            variant="surface"
          />
          <View style={{ position: 'relative' }}>
            <IconButton
              icon={<Bell size={18} color={palette.textPrimary} strokeWidth={2} />}
              onPress={onOpenNotifications}
              variant="surface"
            />
            {unread > 0 && (
              <View style={[s.dot, { backgroundColor: palette.error, borderColor: palette.background }]}>
                <Text style={s.dotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
          {user && (
            <TouchableOpacity onPress={() => onOpenProfile(user.id)} activeOpacity={0.85}>
              <Avatar
                initials={user.avatar}
                size={36}
                accent={user.role === 'investor' ? 'reality' : user.role === 'admin' ? 'admin' : 'dreamer'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.toggleRow}>
        {(['explore', 'dreamer', 'reality'] as const).map((view) => {
          const active = feedView === view;
          const ta = accentFor(palette, view === 'reality' ? 'reality' : 'dreamer');
          const accent = view === 'explore' ? palette.accent : ta.primary;
          return (
            <TouchableOpacity
              key={view}
              style={s.toggleTab}
              onPress={() => setFeedView(view)}
              activeOpacity={0.7}
            >
              <Text style={[s.toggleLabel, active && { color: accent }]}>
                {view === 'explore' ? t('feed.explore') : view === 'dreamer' ? t('feed.dreamer') : t('feed.reality')}
              </Text>
              {active && <View style={[s.toggleUnderline, { backgroundColor: accent }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.contextRow}>
        <Text style={s.contextHint}>
          {feedView === 'explore'
            ? t('feed.hintExplore')
            : feedView === 'dreamer'
              ? t('feed.hintDreamer')
              : t('feed.hintReality')}
        </Text>
        <View style={s.sortPill}>
          {(['recent', 'top'] as const).map((mode) => {
            const active = sortMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setSortMode(mode)}
                style={[
                  s.sortBtn,
                  active && { backgroundColor: palette.accent + '22', borderColor: palette.accent + '88' },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[s.sortBtnLabel, active && { color: palette.accent }]}>
                  {mode === 'recent' ? t('feed.recent') : t('feed.top')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <StoriesRail onOpenComposer={onOpenStoryComposer} onOpenStory={onOpenStoryViewer} />
        }
        renderItem={({ item }) => (
          <FeedCard
            post={item}
            liked={user ? item.likedBy?.includes(user.id) : false}
            signaled={user ? item.signaledBy?.includes(user.id) : false}
            onLike={(id) => user && toggleLike(id, user.id)}
            onSignal={() => handleSignal(item)}
            onAuthorPress={onOpenProfile}
            onReport={(id) => user && reportPost(id, user.id, 'flagged from feed')}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={a.primary}
            colors={[a.primary]}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('feed.empty')}</Text>
          </View>
        }
      />
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    logo: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: -0.8,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dot: {
      position: 'absolute',
      right: -2,
      top: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotText: {
      color: p.white,
      fontSize: 9,
      fontWeight: Typography.fontWeightBold,
    },
    toggleRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.xl,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
      marginBottom: Spacing.sm,
    },
    toggleTab: { paddingBottom: Spacing.sm, position: 'relative' },
    toggleLabel: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    toggleUnderline: {
      position: 'absolute',
      bottom: -0.5,
      left: 0,
      right: 0,
      height: 2,
      borderTopLeftRadius: Radii.sm,
      borderTopRightRadius: Radii.sm,
    },
    contextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    contextHint: { color: p.textMuted, fontSize: 11, flex: 1 },
    sortPill: { flexDirection: 'row', gap: 4 },
    sortBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 0.5,
      borderColor: p.border,
    },
    sortBtnLabel: { color: p.textSecondary, fontSize: 11, fontWeight: Typography.fontWeightSemiBold },
    list: { paddingBottom: Spacing.xxl },
    empty: { padding: Spacing.xxl, alignItems: 'center' },
    emptyText: { color: p.textSecondary, fontSize: Typography.fontSizeSM },
  });
