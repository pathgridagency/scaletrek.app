import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Image as ImageIcon, Video as VideoIcon, Send, Type } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { Screen } from '../components/ui/Screen';
import { useAuthStore } from '../store/useAuthStore';
import { useStoriesStore } from '../store/useStoriesStore';
import { createStory } from '../lib/sync/stories';

interface Props {
  onClose: () => void;
}

interface PickedAsset {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
}

export const StoryComposerScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const user = useAuthStore((s) => s.user);
  const upsertOne = useStoriesStore((s) => s.upsertOne);
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const player = useVideoPlayer(asset?.type === 'video' ? asset.uri : null, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const s = styles(palette);

  // Auto-open the picker as soon as the screen mounts — Stories are camera-first.
  useEffect(() => {
    pickFromLibrary('image');
  }, []);

  if (!user) return null;

  const pickFromLibrary = async (preferred: 'image' | 'video') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow media access to add a story.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        preferred === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsEditing: false,
      videoMaxDuration: 30,
    });
    if (result.canceled || result.assets.length === 0) {
      if (!asset) onClose();
      return;
    }
    const a = result.assets[0];
    setAsset({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
      width: a.width,
      height: a.height,
      durationMs: a.duration ? Math.round(a.duration) : undefined,
    });
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera off', 'Allow camera to capture a story.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (result.canceled || result.assets.length === 0) return;
    const a = result.assets[0];
    setAsset({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
      width: a.width,
      height: a.height,
      durationMs: a.duration ? Math.round(a.duration) : undefined,
    });
  };

  const submit = async () => {
    if (!asset) return;
    setSubmitting(true);
    try {
      const row = await createStory({
        uri: asset.uri,
        type: asset.type,
        width: asset.width,
        height: asset.height,
        durationMs: asset.durationMs,
        caption: caption.trim() || undefined,
      });
      upsertOne(row);
      onClose();
    } catch (e: any) {
      console.warn('[story] create failed', e);
      Alert.alert('Upload failed', e?.message ?? 'Try again.');
      setSubmitting(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <View style={s.canvas}>
        {asset ? (
          asset.type === 'video' ? (
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
          ) : (
            <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          )
        ) : (
          <View style={s.empty}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent']}
          style={[StyleSheet.absoluteFill, { height: 140 }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={[s.bottomGradient]}
          pointerEvents="none"
        />

        <View style={s.topBar}>
          <Pressable onPress={onClose} style={s.iconCircle} hitSlop={8}>
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setShowCaption((v) => !v)}
            style={[s.iconCircle, showCaption && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
            hitSlop={8}
          >
            <Type size={18} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

        {showCaption && (
          <View style={s.captionWrap}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption"
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={s.captionInput}
              multiline
              maxLength={200}
              autoFocus
            />
          </View>
        )}
        {!showCaption && !!caption && (
          <View style={s.captionDisplay}>
            <Text style={s.captionDisplayText}>{caption}</Text>
          </View>
        )}

        <View style={s.bottomBar}>
          <Pressable onPress={() => pickFromLibrary('image')} style={s.smallBtn} hitSlop={8}>
            <ImageIcon size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={s.smallBtnText}>Photo</Text>
          </Pressable>
          <Pressable onPress={() => pickFromLibrary('video')} style={s.smallBtn} hitSlop={8}>
            <VideoIcon size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={s.smallBtnText}>Video</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={submit}
            disabled={!asset || submitting}
            style={({ pressed }) => [s.sendBtn, { opacity: !asset || submitting ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={s.sendBtnText}>Share</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: '#000000', position: 'relative' },
    empty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
    topBar: {
      position: 'absolute',
      top: Spacing.md,
      left: Spacing.lg,
      right: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    captionWrap: {
      position: 'absolute',
      left: Spacing.lg,
      right: Spacing.lg,
      top: '40%',
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: Radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    captionInput: {
      color: '#FFFFFF',
      fontSize: Typography.fontSizeLG,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.2,
      minHeight: 40,
    },
    captionDisplay: {
      position: 'absolute',
      left: Spacing.lg,
      right: Spacing.lg,
      bottom: 110,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: Radii.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    captionDisplayText: {
      color: '#FFFFFF',
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
      textAlign: 'center',
    },
    bottomBar: {
      position: 'absolute',
      bottom: Spacing.lg,
      left: Spacing.lg,
      right: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    smallBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    smallBtnText: { color: '#FFFFFF', fontWeight: Typography.fontWeightSemiBold, fontSize: Typography.fontSizeSM },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      backgroundColor: p.accent,
    },
    sendBtnText: { color: '#FFFFFF', fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeSM, letterSpacing: 0.3 },
  });
