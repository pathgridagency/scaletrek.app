import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Props {
  /** Finger swipes left → advance to the next tab. */
  onSwipeLeft?: () => void;
  /** Finger swipes right → go back to the previous tab. */
  onSwipeRight?: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a screen so a horizontal flick navigates between bottom tabs.
 *
 * `activeOffsetX` keeps the gesture dormant until the drag is clearly
 * horizontal, and `failOffsetY` cancels it the moment the user scrolls
 * vertically — so inner FlatLists keep working untouched. Reanimated is not
 * installed, so the `onEnd` callback runs on the JS thread and can call
 * `navigation.navigate` directly.
 */
export const SwipeArea: React.FC<Props> = ({ onSwipeLeft, onSwipeRight, children }) => {
  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-18, 18])
    .onEnd((e) => {
      const committed = Math.abs(e.translationX) > 64 || Math.abs(e.velocityX) > 600;
      if (!committed) return;
      if (e.translationX < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
