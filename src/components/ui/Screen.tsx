import React from 'react';
import { View, StyleSheet, StatusBar, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  safe?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const Screen: React.FC<Props> = ({ children, style, safe = true, edges = ['top'] }) => {
  const { palette } = useTheme();
  const Container: any = safe ? SafeAreaView : View;
  return (
    <Container style={[styles.flex, { backgroundColor: palette.background }, style]} edges={edges}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.background} />
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({ flex: { flex: 1 } });
