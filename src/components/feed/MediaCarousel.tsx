import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import { PostMedia } from '../../data/mockData';
import { Radii, Spacing } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  media: PostMedia[];
  height?: number;
}

const SCREEN_W = Dimensions.get('window').width;

const VideoSlide: React.FC<{ uri: string; width: number; height: number; palette: ReturnType<typeof useTheme>['palette'] }> = ({
  uri,
  width,
  height,
  palette,
}) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });
  const [playing, setPlaying] = useState(false);
  return (
    <View style={{ width, height, backgroundColor: palette.surface }}>
      <VideoView
        player={player}
        style={{ width, height }}
        nativeControls={playing}
        contentFit="cover"
      />
      {!playing && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            style={[styles.playBadge, { backgroundColor: palette.overlay }]}
            onPress={() => {
              player.play();
              setPlaying(true);
            }}
            activeOpacity={0.85}
          >
            <Play size={20} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const MediaCarousel: React.FC<Props> = ({ media, height = 200 }) => {
  const { palette } = useTheme();
  const cardWidth = SCREEN_W - Spacing.lg * 2 - 2;
  const [active, setActive] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (idx !== active) setActive(idx);
  };
  const ref = useRef<FlatList<PostMedia>>(null);

  if (media.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderColor: palette.borderSubtle, height }]}>
      <FlatList
        ref={ref}
        data={media}
        keyExtractor={(m) => m.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) =>
          item.type === 'video' ? (
            <VideoSlide uri={item.url} width={cardWidth} height={height} palette={palette} />
          ) : (
            <Image
              source={{ uri: item.url }}
              style={{ width: cardWidth, height }}
              contentFit="cover"
              transition={200}
            />
          )
        }
      />
      {media.length > 1 && (
        <View style={styles.dots}>
          {media.map((m, i) => (
            <View
              key={m.id}
              style={[
                styles.dot,
                { backgroundColor: i === active ? palette.textPrimary : palette.textMuted },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.85 },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
