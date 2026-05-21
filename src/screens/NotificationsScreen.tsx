import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ChevronLeft, Bell, Bookmark, UserPlus, ShieldCheck, Activity } from 'lucide-react-native';
import { Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { Avatar } from '../components/ui/Avatar';
import { Screen } from '../components/ui/Screen';
import { Notification, NotificationType } from '../data/mockData';

interface Props {
  onClose: () => void;
}

const iconFor = (t: NotificationType) => {
  if (t === 'signal') return Bookmark;
  if (t === 'follow') return UserPlus;
  if (t === 'verification') return ShieldCheck;
  if (t === 'deal') return Activity;
  return Bell;
};

export const NotificationsScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const allItems = useNotificationsStore((s) => s.items);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const items = user ? allItems.filter((n) => n.recipientId === user.id) : [];

  useEffect(() => {
    if (user) markAllRead(user.id);
  }, [user?.id]);

  const s = styles(palette);

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }: { item: Notification }) => {
          const Icon = iconFor(item.type);
          return (
            <View style={s.row}>
              {item.actorAvatar ? (
                <Avatar initials={item.actorAvatar} size={40} accent="dreamer" />
              ) : (
                <View style={s.iconWrap}>
                  <Icon size={18} color={palette.accent} strokeWidth={1.6} />
                </View>
              )}
              <View style={s.rowInfo}>
                <Text style={s.rowText}>
                  {item.actorName ? <Text style={s.actor}>{item.actorName} </Text> : null}
                  {item.message}
                </Text>
                <Text style={s.rowTime}>{item.createdAt}</Text>
              </View>
              {!item.read && <View style={s.unreadDot} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Bell size={28} color={palette.textMuted} />
            <Text style={s.emptyText}>No notifications yet.</Text>
            <Text style={s.emptySub}>Signals, follows and deal updates appear here.</Text>
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
    list: { paddingVertical: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: p.borderSubtle,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: p.accentSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowInfo: { flex: 1, gap: 2 },
    rowText: { color: p.textPrimary, fontSize: Typography.fontSizeSM, lineHeight: 19 },
    actor: { fontWeight: Typography.fontWeightSemiBold },
    rowTime: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: p.accent },
    empty: { padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.sm },
    emptyText: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    emptySub: { color: p.textMuted, fontSize: Typography.fontSizeSM, textAlign: 'center' },
  });
