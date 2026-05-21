import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Radii, Spacing, Typography, elevationFor } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number;
}

export const Sheet: React.FC<Props> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scrollable = true,
  maxHeight,
}) => {
  const { palette } = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, mass: 1, stiffness: 240 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const screenH = Dimensions.get('window').height;
  const sheetMaxH = maxHeight ?? screenH * 0.85;
  const elev = elevationFor(palette, 'xl');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: palette.overlayStrong, opacity: overlayOpacity },
            ]}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            elev,
            {
              transform: [{ translateY }],
              backgroundColor: palette.card,
              borderColor: palette.border,
              maxHeight: sheetMaxH,
            },
          ]}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: palette.borderStrong }]} />
            </View>
            {(title || subtitle) && (
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  {title && (
                    <Text
                      style={{
                        color: palette.textPrimary,
                        fontSize: Typography.fontSizeXL,
                        fontWeight: Typography.fontWeightBold,
                        letterSpacing: -0.3,
                      }}
                    >
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text
                      style={{
                        color: palette.textSecondary,
                        fontSize: Typography.fontSizeSM,
                        marginTop: 4,
                      }}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <X size={16} color={palette.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>
            )}
            {scrollable ? (
              <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.body}>{children}</View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  grabber: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  grabberBar: { width: 38, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
});
