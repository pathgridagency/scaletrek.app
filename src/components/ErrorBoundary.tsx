import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  /** Called when the user dismisses the fallback (e.g. navigation.goBack). */
  onClose?: () => void;
  /** Human-readable line shown under the title. */
  label?: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/lifecycle exceptions in its subtree and shows a dismissible
 * fallback instead of letting the error escape and restart the whole app.
 * Note: this only catches JS errors — true native crashes still propagate.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[ErrorBoundary] caught:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.fallback}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          {this.props.label ?? 'This screen could not be opened.'}
        </Text>
        {this.props.onClose && (
          <Pressable
            style={styles.btn}
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onClose?.();
            }}
          >
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  body: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
