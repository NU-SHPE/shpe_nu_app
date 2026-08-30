import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

// How often, while this screen sits open, we ask Firebase whether the link
// has been clicked yet. Verification happens in the user's browser, not here,
// so polling is how the app finds out -- AuthGate redirects on its own once
// `emailVerified` flips.
const POLL_MS = 4000;
// Firebase rate-limits verification emails; a cooldown keeps the button from
// walking users into `auth/too-many-requests`.
const RESEND_COOLDOWN_S = 45;

export default function VerifyEmailScreen() {
  const { user, reloadUser, resendVerification, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Background poll + re-check whenever the app returns to the foreground
  // (the common case: user tapped the link in another app, comes back).
  useEffect(() => {
    const check = () => {
      reloadUser().catch(() => {});
    };
    const interval = setInterval(check, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [reloadUser]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && cooldownRef.current) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleCheck = async () => {
    setNotice('');
    setError('');
    setChecking(true);
    try {
      const verified = await reloadUser();
      if (!verified) {
        setError("Not verified yet — open the link in your inbox, then try again. Check your spam folder too.");
      }
      // On success AuthGate takes over and routes to the app.
    } catch {
      setError('Could not check your status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setNotice('');
    setError('');
    try {
      await resendVerification();
      setNotice('Sent. Give it a minute, then check your inbox and spam folder.');
      startCooldown();
    } catch (e: any) {
      if (e?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
        startCooldown();
      } else {
        setError('Could not send the email. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/shpe_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.iconCircle}>
        <Ionicons name="mail-unread-outline" size={34} color="#D50032" />
      </View>

      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.body}>
        We sent a verification link to{'\n'}
        <Text style={styles.email}>{user?.email ?? 'your email'}</Text>
      </Text>
      <Text style={styles.hint}>
        Open it to finish setting up your account. This screen updates on its own
        once you do.
      </Text>

      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleCheck}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>I've verified my email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleResend}
        disabled={cooldown > 0}
      >
        <Text style={[styles.secondaryText, cooldown > 0 && styles.secondaryTextDisabled]}>
          {cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutLink} onPress={() => logout()}>
        <Text style={styles.signOutText}>Wrong address? Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1B2A6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontWeight: '700',
    color: '#111',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  noticeText: {
    color: '#1B2A6B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#D50032',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#D50032',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: {
    color: '#D50032',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryTextDisabled: {
    color: '#aaa',
  },
  signOutLink: {
    marginTop: 20,
    padding: 8,
  },
  signOutText: {
    color: '#888',
    fontSize: 14,
  },
});
