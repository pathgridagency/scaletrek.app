import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronLeft, FileText, ShieldCheck } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { Screen } from '../components/ui/Screen';
import {
  DeckShare,
  createDeckShare,
  getDeckSignedUrl,
  listMyDeckShares,
  revokeDeckShare,
  signNda,
  uploadDeck,
} from '../lib/sync/decks';

interface Props {
  onClose: () => void;
  // Optional: pre-select investor (from a profile screen "Share deck with…" CTA).
  shareWithInvestorId?: string;
}

export const DeckSharesScreen: React.FC<Props> = ({ onClose, shareWithInvestorId }) => {
  const { palette } = useTheme();
  const me = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const [shares, setShares] = useState<DeckShare[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const s = styles(palette);

  const load = useCallback(async () => {
    try {
      setShares(await listMyDeckShares());
    } catch (err) {
      console.warn('[decks] list failed:', err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUploadAndShare = async () => {
    if (!me) return;
    if (me.role !== 'dreamer' && me.role !== 'admin') {
      Alert.alert('Only founders share decks', 'Switch to the dreamer role first.');
      return;
    }
    if (!shareWithInvestorId) {
      Alert.alert('Pick an investor first', 'Open an investor profile and tap "Share deck".');
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];
      const { path, size } = await uploadDeck(
        file.uri,
        file.name,
        file.mimeType ?? 'application/pdf',
      );
      const share = await createDeckShare({
        investorId: shareWithInvestorId,
        filePath: path,
        filename: file.name,
        sizeBytes: size,
        expiresInHours: 72,
      });
      setShares((s) => [share, ...s]);
      Alert.alert(
        'Deck shared',
        'The investor will see an NDA before they can open the file. Link expires in 72h.',
      );
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSign = async (share: DeckShare) => {
    try {
      const next = await signNda(share.id);
      setShares((rows) => rows.map((r) => (r.id === next.id ? next : r)));
      const url = await getDeckSignedUrl(next.filePath, 600);
      Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open deck', err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpen = async (share: DeckShare) => {
    try {
      const url = await getDeckSignedUrl(share.filePath, 600);
      Linking.openURL(url);
    } catch (err) {
      Alert.alert('Could not open deck', err instanceof Error ? err.message : String(err));
    }
  };

  const handleRevoke = async (share: DeckShare) => {
    try {
      await revokeDeckShare(share.id);
      setShares((rows) =>
        rows.map((r) => (r.id === share.id ? { ...r, revoked: true } : r)),
      );
    } catch (err) {
      Alert.alert('Revoke failed', err instanceof Error ? err.message : String(err));
    }
  };

  const renderRow = ({ item }: { item: DeckShare }) => {
    const otherId = me?.id === item.founderId ? item.investorId : item.founderId;
    const other = users.find((u) => u.id === otherId);
    const iAmFounder = me?.id === item.founderId;
    const expired = item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false;
    const status = item.revoked
      ? 'Revoked'
      : expired
        ? 'Expired'
        : item.ndaSignedAt
          ? 'NDA signed'
          : iAmFounder
            ? 'Awaiting NDA'
            : 'NDA required';
    return (
      <View style={s.card}>
        <View style={s.row}>
          <FileText size={16} color={palette.textSecondary} strokeWidth={1.6} />
          <View style={{ flex: 1 }}>
            <Text style={s.filename} numberOfLines={1}>{item.filename}</Text>
            <Text style={s.meta}>
              {iAmFounder ? 'Shared with ' : 'Shared by '}
              {other?.name ?? 'Unknown'} · {status}
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          {!iAmFounder && !item.ndaSignedAt && !item.revoked && !expired && (
            <TouchableOpacity style={s.signBtn} onPress={() => handleSign(item)}>
              <ShieldCheck size={12} color={palette.accent} strokeWidth={1.6} />
              <Text style={[s.signText, { color: palette.accent }]}>Sign NDA & open</Text>
            </TouchableOpacity>
          )}
          {!iAmFounder && item.ndaSignedAt && !item.revoked && !expired && (
            <TouchableOpacity style={s.openBtn} onPress={() => handleOpen(item)}>
              <Text style={[s.signText, { color: palette.textPrimary }]}>Open deck</Text>
            </TouchableOpacity>
          )}
          {iAmFounder && !item.revoked && (
            <TouchableOpacity style={s.revokeBtn} onPress={() => handleRevoke(item)}>
              <Text style={[s.signText, { color: palette.error }]}>Revoke</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.back}>
          <ChevronLeft size={20} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Deck shares</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={shares}
        keyExtractor={(i) => i.id}
        renderItem={renderRow}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={palette.textSecondary}
          />
        }
        ListEmptyComponent={
          <Text style={s.empty}>No deck shares yet.</Text>
        }
        ListHeaderComponent={
          shareWithInvestorId ? (
            <TouchableOpacity style={s.uploadBtn} onPress={handleUploadAndShare}>
              <Text style={s.uploadText}>Upload PDF and share</Text>
            </TouchableOpacity>
          ) : null
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
    list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
    card: {
      padding: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
      gap: Spacing.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    filename: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    meta: { color: p.textMuted, fontSize: Typography.fontSizeXS, marginTop: 2 },
    actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    signBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.accentBorder,
      backgroundColor: p.accentSubtle,
    },
    openBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    revokeBtn: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      borderColor: p.error,
      backgroundColor: p.error + '14',
    },
    signText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    uploadBtn: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.accent,
      backgroundColor: p.accentSubtle,
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    uploadText: {
      color: p.accent,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    empty: {
      color: p.textMuted,
      fontSize: Typography.fontSizeSM,
      textAlign: 'center',
      marginTop: Spacing.xl,
    },
  });
