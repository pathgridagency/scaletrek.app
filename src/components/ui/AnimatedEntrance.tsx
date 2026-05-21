import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Position in a list — drives the staggered delay. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** How far the content slides up as it fades in. */
  offsetY?: number;
  /** Per-index stagger, milliseconds. */
  delayStep?: number;
  duration?: number;
}

/**
 * Lightweight mount animation: fade + slide-up, with an optional list stagger.
 * Native-driver only, so it stays smooth on the JS thread. Used to give lists
 * and screens a polished entrance without pulling in Reanimated.
 */
export const AnimatedEntrance: React.FC<Props> = ({
  children,
  index = 0,
  style,
  offsetY = 14,
  delayStep = 55,
  duration = 320,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      // Cap the stagger so long lists don't crawl in.
      delay: Math.min(index, 9) * delayStep,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, index, delayStep, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offsetY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
