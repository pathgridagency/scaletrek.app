import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Crown, Shield } from 'lucide-react-native';
import { Typography } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

export type AvatarAccent = 'dreamer' | 'reality' | 'admin' | 'accent' | 'pro' | 'elite';
export type AvatarVerification = 'none' | 'basic' | 'verified' | 'elite' | 'admin';

interface Props {
  initials: string;
  size?: number;
  accent?: AvatarAccent;
  imageUrl?: string;
  ring?: 'none' | 'story' | 'live' | 'verified';
  showPresence?: boolean;
  presenceOnline?: boolean;
  verification?: AvatarVerification;
}

export const Avatar: React.FC<Props> = ({
  initials,
  size = 40,
  accent = 'accent',
  imageUrl,
  ring = 'none',
  showPresence = false,
  presenceOnline = false,
  verification = 'none',
}) => {
  const { palette } = useTheme();
  const color =
    accent === 'reality'
      ? palette.reality
      : accent === 'admin'
        ? palette.admin
        : accent === 'dreamer'
          ? palette.dreamer
          : accent === 'pro'
            ? palette.pro
            : accent === 'elite'
              ? palette.elite
              : palette.accent;
  const fontSize = Math.max(10, size * 0.36);

  const ringWidth = ring !== 'none' ? 2.5 : 0;
  const ringGap = ring !== 'none' ? 2 : 0;
  const outerSize = size + (ringWidth + ringGap) * 2;

  const ringGradient: [string, string] =
    ring === 'story'
      ? ['#F472B6', '#A855F7']
      : ring === 'live'
        ? ['#F87171', '#DC2626']
        : ring === 'verified'
          ? palette.eliteGradient
          : [color, color];

  const inner = imageUrl ? (
    <Image
      source={{ uri: imageUrl }}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.surface,
          borderColor: palette.borderSubtle,
        },
      ]}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.surface,
          borderColor: palette.borderSubtle,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize, color }]}>{initials}</Text>
    </View>
  );

  const verifyBadgeSize = Math.max(14, Math.round(size * 0.32));
  const verifyIconSize = Math.max(8, Math.round(verifyBadgeSize * 0.62));
  const showVerify = verification === 'verified' || verification === 'elite' || verification === 'admin';

  const renderVerifyBadge = () => {
    if (!showVerify) return null;
    let bg = palette.info;
    let icon: React.ReactNode = <BadgeCheck size={verifyIconSize} color="#FFFFFF" strokeWidth={2.5} />;
    if (verification === 'elite') {
      bg = palette.elite;
      icon = <Crown size={verifyIconSize} color="#1A1A1F" strokeWidth={2.5} />;
    } else if (verification === 'admin') {
      bg = palette.admin;
      icon = <Shield size={verifyIconSize} color="#FFFFFF" strokeWidth={2.5} />;
    }
    return (
      <View
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: verifyBadgeSize,
          height: verifyBadgeSize,
          borderRadius: verifyBadgeSize / 2,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
    );
  };

  if (ring === 'none') {
    return (
      <View style={{ position: 'relative' }}>
        {inner}
        {showPresence && (
          <View
            style={[
              styles.presence,
              {
                backgroundColor: presenceOnline ? palette.success : palette.textMuted,
                borderColor: palette.background,
              },
            ]}
          />
        )}
        {renderVerifyBadge()}
      </View>
    );
  }

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: outerSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <LinearGradient
        colors={ringGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
        }}
      />
      <View
        style={{
          width: outerSize - ringWidth * 2,
          height: outerSize - ringWidth * 2,
          borderRadius: (outerSize - ringWidth * 2) / 2,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {inner}
      </View>
      {showPresence && (
        <View
          style={[
            styles.presence,
            {
              backgroundColor: presenceOnline ? palette.success : palette.textMuted,
              borderColor: palette.background,
            },
          ]}
        />
      )}
      {renderVerifyBadge()}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: Typography.fontWeightBold,
    letterSpacing: 0.4,
  },
  presence: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
