import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { Screen } from '../components/ui/Screen';
import { UserRole } from '../data/mockData';

interface Props {
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onFinish }) => {
  const { palette } = useTheme();
  const { user, setRole, setOnboarded } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const choose = (role: Exclude<UserRole, 'admin'>) => {
    setRole(role);
    setOnboarded(true);
    onFinish();
  };

  const s = styles(palette);

  return (
    <Screen>
      <Animated.View
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={s.logoSection}>
          <View style={s.logoMark}>
            <TrendingUp size={24} color={palette.accent} strokeWidth={1.8} />
          </View>
          <Text style={s.logoText}>Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={s.tagline}>How will you use Scaletrek?</Text>
        </View>

        <View style={s.features}>
          {[
            { icon: Zap, text: 'Dreamer Stream', color: palette.dreamer },
            { icon: Shield, text: 'Reality Check', color: palette.reality },
            { icon: TrendingUp, text: 'Momentum Score', color: palette.accent },
          ].map(({ icon: Icon, text, color }) => (
            <View key={text} style={[s.featurePill, { borderColor: color + '40' }]}>
              <Icon size={12} color={color} strokeWidth={1.6} />
              <Text style={[s.featureText, { color }]}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Choose your stream</Text>

        <TouchableOpacity style={s.roleCard} onPress={() => choose('dreamer')} activeOpacity={0.85}>
          <View style={[s.roleIcon, { borderColor: palette.dreamerBorder, backgroundColor: palette.dreamerSubtle }]}>
            <Zap size={20} color={palette.dreamer} strokeWidth={1.7} />
          </View>
          <View style={s.roleInfo}>
            <Text style={s.roleTitle}>I'm a Dreamer</Text>
            <Text style={s.roleDesc}>Founder, idea maker, or early-stage business</Text>
          </View>
          <ArrowRight size={16} color={palette.textMuted} strokeWidth={1.6} />
        </TouchableOpacity>

        <TouchableOpacity style={s.roleCard} onPress={() => choose('investor')} activeOpacity={0.85}>
          <View style={[s.roleIcon, { borderColor: palette.realityBorder, backgroundColor: palette.realitySubtle }]}>
            <Shield size={20} color={palette.reality} strokeWidth={1.7} />
          </View>
          <View style={s.roleInfo}>
            <Text style={s.roleTitle}>I'm an Investor</Text>
            <Text style={s.roleDesc}>Angel, VC, or deal-seeker looking for traction</Text>
          </View>
          <ArrowRight size={16} color={palette.textMuted} strokeWidth={1.6} />
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          By continuing you agree to our terms. All deal communications are encrypted end-to-end.
        </Text>
      </Animated.View>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    content: { flex: 1, padding: Spacing.xl, gap: Spacing.lg, justifyContent: 'center' },
    logoSection: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
    logoMark: {
      width: 56,
      height: 56,
      borderRadius: Radii.lg,
      backgroundColor: p.card,
      borderWidth: 0.5,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: p.textPrimary,
      fontSize: Typography.fontSize2XL,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: -0.3,
    },
    tagline: { color: p.textSecondary, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    features: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    featurePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 5,
      borderRadius: Radii.full,
      borderWidth: 0.5,
      backgroundColor: p.card,
    },
    featureText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      letterSpacing: 0.5,
      textAlign: 'center',
      textTransform: 'uppercase',
      fontWeight: Typography.fontWeightSemiBold,
    },
    roleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.card,
      borderRadius: Radii.lg,
      borderWidth: 0.5,
      borderColor: p.border,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    roleIcon: {
      width: 44,
      height: 44,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleInfo: { flex: 1, gap: 3 },
    roleTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    roleDesc: { color: p.textSecondary, fontSize: Typography.fontSizeXS, lineHeight: 17 },
    disclaimer: {
      color: p.textMuted,
      fontSize: 10,
      textAlign: 'center',
      lineHeight: 15,
      marginTop: Spacing.sm,
    },
  });
