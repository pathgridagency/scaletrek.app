import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Plus } from 'lucide-react-native';
import { Spacing, Typography, Radii } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { useStoriesStore } from '../../store/useStoriesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useModerationStore } from '../../store/useModerationStore';
import { AuthorStories } from '../../lib/sync/stories';

interface Props {
  onOpenComposer: () => void;
  onOpenStory: (authorIndex: number) => void;
}

export const StoriesRail: React.FC<Props> = ({ onOpenComposer, onOpenStory }) => {
  const { palette } = useTheme();
  const stories = useStoriesStore((s) => s.stories);
  const user = useAuthStore((s) => s.user);
  const blockedIds = useModerationStore((s) => s.blockedIds);
  const groups = useMemo(() => {
    const all = useStoriesStore.getState().groupedByAuthor();
    return all.filter((g) => !blockedIds.includes(g.userId));
  }, [stories, blockedIds]);

  const myGroup = user ? groups.find((g) => g.userId === user.id) : undefined;
  const others = user ? groups.filter((g) => g.userId !== user.id) : groups;

  return (
    <View style={[styles.wrap, { borderBottomColor: palette.divider }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Your story / add */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (myGroup) {
              const idx = groups.findIndex((g) => g.userId === myGroup.userId);
              onOpenStory(idx);
            } else {
              onOpenComposer();
            }
          }}
          style={styles.cell}
        >
          <View style={styles.avatarWrap}>
            {user ? (
              <Avatar
                initials={user.avatar}
                imageUrl={user.avatarUrl}
                size={64}
                ring={myGroup ? (myGroup.allSeen ? 'none' : 'story') : 'none'}
                accent="dreamer"
              />
            ) : (
              <Avatar initials="?" size={64} />
            )}
            {!myGroup && (
              <View
                style={[
                  styles.plus,
                  { backgroundColor: palette.accent, borderColor: palette.background },
                ]}
              >
                <Plus size={12} color={palette.accentOn} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={[styles.label, { color: palette.textSecondary }]} numberOfLines={1}>
            {myGroup ? 'Your story' : 'Add story'}
          </Text>
        </TouchableOpacity>

        {others.map((g) => {
          const idx = groups.findIndex((x) => x.userId === g.userId);
          return (
            <TouchableOpacity
              key={g.userId}
              activeOpacity={0.85}
              onPress={() => onOpenStory(idx)}
              style={styles.cell}
            >
              <Avatar
                initials={g.userAvatar}
                imageUrl={g.userAvatarUrl}
                size={64}
                ring={g.allSeen ? 'none' : 'story'}
                accent={g.userRole === 'investor' ? 'reality' : g.userRole === 'admin' ? 'admin' : 'dreamer'}
              />
              <Text style={[styles.label, { color: palette.textSecondary }]} numberOfLines={1}>
                {g.userName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  cell: { width: 72, alignItems: 'center', gap: 6 },
  avatarWrap: { position: 'relative' },
  plus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: Typography.fontWeightMedium,
    letterSpacing: 0.1,
    maxWidth: 72,
  },
});
