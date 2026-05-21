import React, { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { LegalScreen } from '../LegalScreen';

type Mode = 'login' | 'signup' | 'forgot';
type Legal = 'privacy' | 'terms' | null;

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [legal, setLegal] = useState<Legal>(null);

  // Cold-start case: if user opens the reset-password email link first thing,
  // we should still land them on Login (they'll be auto-redirected to the
  // ResetPasswordScreen by Navigator once their session resolves).
  useEffect(() => {
    let live = true;
    Linking.getInitialURL()
      .then((url) => {
        if (!live) return;
        if (url?.includes('reset-password')) setMode('login');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (legal) {
    return <LegalScreen kind={legal} onClose={() => setLegal(null)} />;
  }

  if (mode === 'signup') {
    return (
      <SignupScreen
        onSwitchToLogin={() => setMode('login')}
        onOpenPrivacy={() => setLegal('privacy')}
        onOpenTerms={() => setLegal('terms')}
      />
    );
  }
  if (mode === 'forgot') {
    return <ForgotPasswordScreen onClose={() => setMode('login')} />;
  }
  return (
    <LoginScreen
      onSwitchToSignup={() => setMode('signup')}
      onForgotPassword={() => setMode('forgot')}
    />
  );
};
