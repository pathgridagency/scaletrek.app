import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Zap, Shield, ImagePlus, Video as VideoIcon, X } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedStore } from '../store/useFeedStore';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { FeedType } from '../data/mockData';
import {
  FREE_TIER_MAX_BYTES,
  FREE_TIER_MAX_ITEMS,
  PRO_TIER_MAX_BYTES,
  PRO_TIER_MAX_ITEMS,
  UploadedMedia,
  uploadPostMedia,
} from '../lib/sync/media';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { humanFileSize } from '../lib/format';

interface Props {
  onClose: () => void;
}

export const CreatePostScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const createPost = useFeedStore((s) => s.createPost);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const maxItems = isPro ? PRO_TIER_MAX_ITEMS : FREE_TIER_MAX_ITEMS;
  const maxBytes = isPro ? PRO_TIER_MAX_BYTES : FREE_TIER_MAX_BYTES;

  const [type, setType] = useState<FeedType>(user?.role === 'dreamer' ? 'dreamer' : 'reality');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [industry, setIndustry] = useState(user?.industry ?? '');
  const [metricLabel, setMetricLabel] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [currentFunding, setCurrentFunding] = useState('');
  const [riskScore, setRiskScore] = useState('5');
  const [rewardScore, setRewardScore] = useState('5');
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);

  const s = styles(palette);

  if (!user) return null;

  const [submitting, setSubmitting] = useState(false);

  const pickMedia = async (kind: 'image' | 'video') => {
    if (media.length >= maxItems) {
      setError(
        isPro
          ? `Pro tier supports up to ${PRO_TIER_MAX_ITEMS} media items per post.`
          : 'Free tier supports 1 image per post. Upgrade to Pro for video + up to 6 items.',
      );
      return;
    }
    if (kind === 'video' && !isPro) {
      setError('Video uploads are a Pro feature. Upgrade to attach video.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission to access photos was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > maxBytes) {
      setError(`File too large (${humanFileSize(asset.fileSize)}). Limit is ${humanFileSize(maxBytes)}.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadPostMedia({
        uri: asset.uri,
        type: kind,
        width: asset.width,
        height: asset.height,
        durationMs: asset.duration ?? undefined,
      });
      setMedia((prev) => [...prev, uploaded]);
    } catch (err) {
      console.warn('[create] upload failed', err);
      setError('Upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeMediaAt = (idx: number) =>
    setMedia((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPost({
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        verificationLevel: user.verificationLevel,
        type,
        milestoneTitle: title.trim(),
        description: description.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean),
        industry: industry.trim() || 'General',
        metric:
          metricValue.trim() && metricLabel.trim()
            ? { label: metricLabel.trim(), value: metricValue.trim(), unit: metricUnit.trim() || undefined }
            : undefined,
        fundingGoal: fundingGoal.trim() || undefined,
        currentFunding: currentFunding.trim() || undefined,
        riskScore: Math.max(0, Math.min(10, parseFloat(riskScore) || 5)),
        rewardScore: Math.max(0, Math.min(10, parseFloat(rewardScore) || 5)),
        media,
      });
      onClose();
    } catch (err: any) {
      const detail = err?.message ?? err?.details ?? String(err);
      setError(`Publish failed: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
            <Text style={s.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={s.title}>New Milestone</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.typeSwitch}>
            {([
              { value: 'dreamer', label: 'Dreamer', icon: Zap, color: palette.dreamer },
              { value: 'reality', label: 'Reality Check', icon: Shield, color: palette.reality },
            ] as const).map(({ value, label, icon: Icon, color }) => {
              const active = type === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.typeBtn, active && { borderColor: color, backgroundColor: color + '14' }]}
                  onPress={() => setType(value)}
                  activeOpacity={0.85}
                >
                  <Icon size={14} color={active ? color : palette.textMuted} strokeWidth={1.6} />
                  <Text style={[s.typeText, { color: active ? color : palette.textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {type === 'reality' && user.role !== 'admin' && (
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                padding: Spacing.md,
                borderRadius: Radii.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: palette.warning + '55',
                backgroundColor: palette.warning + '14',
              }}
            >
              <Shield size={16} color={palette.warning} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.warning,
                    fontSize: Typography.fontSizeSM,
                    fontWeight: Typography.fontWeightBold,
                    letterSpacing: 0.2,
                    marginBottom: 2,
                  }}
                >
                  Reviewed before going live
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: Typography.fontSizeXS, lineHeight: 18 }}>
                  Reality Check claims need to be verified by an admin before they appear on the public feed. You'll get a notification once they're approved.
                </Text>
              </View>
            </View>
          )}

          <TextField label="Milestone title" value={title} onChangeText={setTitle} placeholder="Prototype V2 Deployed" />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What happened? What's the proof?"
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          <TextField label="Industry" value={industry} onChangeText={setIndustry} placeholder="FinTech, AgriTech, ..." />
          <TextField
            label="Tags (comma-separated)"
            value={tags}
            onChangeText={setTags}
            placeholder="Growth, MENA, B2B"
            autoCapitalize="none"
          />

          <Text style={s.section}>Media (optional)</Text>
          <View style={s.mediaGrid}>
            {media.map((m, i) => (
              <View key={`${m.storagePath}-${i}`} style={s.mediaThumb}>
                <Image source={{ uri: m.url }} style={s.mediaThumbImg} contentFit="cover" />
                {m.type === 'video' && (
                  <View style={s.mediaVideoBadge}>
                    <VideoIcon size={12} color="#fff" strokeWidth={2} />
                  </View>
                )}
                <TouchableOpacity style={s.mediaRemove} onPress={() => removeMediaAt(i)}>
                  <X size={12} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {media.length < maxItems && (
              <>
                <TouchableOpacity
                  style={[s.mediaAdd, { borderColor: palette.border }]}
                  onPress={() => pickMedia('image')}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  {uploading ? (
                    <ActivityIndicator color={palette.textSecondary} />
                  ) : (
                    <>
                      <ImagePlus size={20} color={palette.textSecondary} strokeWidth={1.6} />
                      <Text style={s.mediaAddLabel}>Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.mediaAdd,
                    { borderColor: palette.border, opacity: isPro ? 1 : 0.55 },
                  ]}
                  onPress={() => pickMedia('video')}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  <VideoIcon size={20} color={palette.textSecondary} strokeWidth={1.6} />
                  <Text style={s.mediaAddLabel}>{isPro ? 'Video' : 'Video · Pro'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={s.mediaHint}>
            {isPro
              ? `Pro · up to ${PRO_TIER_MAX_ITEMS} items, ${humanFileSize(PRO_TIER_MAX_BYTES)} each.`
              : `Free · 1 image up to ${humanFileSize(FREE_TIER_MAX_BYTES)}. Upgrade to Pro for video + more.`}
          </Text>

          <Text style={s.section}>Headline metric (optional)</Text>
          <View style={s.row}>
            <View style={{ flex: 2 }}>
              <TextField label="Label" value={metricLabel} onChangeText={setMetricLabel} placeholder="Pilot Farms" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Value" value={metricValue} onChangeText={setMetricValue} placeholder="50" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Unit" value={metricUnit} onChangeText={setMetricUnit} placeholder="active" />
            </View>
          </View>

          <Text style={s.section}>Funding (optional)</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Current" value={currentFunding} onChangeText={setCurrentFunding} placeholder="180K MAD" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Goal" value={fundingGoal} onChangeText={setFundingGoal} placeholder="500K MAD" />
            </View>
          </View>

          <Text style={s.section}>Risk & Reward (0-10)</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextField label="Risk" value={riskScore} onChangeText={setRiskScore} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Reward" value={rewardScore} onChangeText={setRewardScore} keyboardType="numeric" />
            </View>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <Button label="Publish milestone" onPress={submit} loading={submitting} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    back: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 80 },
    backText: { color: p.textSecondary, fontSize: Typography.fontSizeSM },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
    typeSwitch: { flexDirection: 'row', gap: Spacing.sm },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 4,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    typeText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    section: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: Spacing.sm,
    },
    row: { flexDirection: 'row', gap: Spacing.sm },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    mediaThumb: {
      width: 86,
      height: 86,
      borderRadius: Radii.md,
      overflow: 'hidden',
      backgroundColor: p.surface,
      position: 'relative',
    },
    mediaThumbImg: { width: '100%', height: '100%' },
    mediaVideoBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    mediaRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaAdd: {
      width: 86,
      height: 86,
      borderRadius: Radii.md,
      borderWidth: 0.75,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    mediaAddLabel: { color: p.textSecondary, fontSize: 11, fontWeight: Typography.fontWeightSemiBold },
    mediaHint: { color: p.textMuted, fontSize: 11, marginTop: -4 },
  });
