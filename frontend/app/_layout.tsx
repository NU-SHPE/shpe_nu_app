import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { colors } from '../components/theme';

const AUTH_SEGMENTS = new Set(['', 'register']);
const VERIFY_SEGMENT = 'verify-email';

function AuthGate() {
  const { user, loading, emailVerified } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentSegment = segments[0] ?? '';
    const isAuthScreen = AUTH_SEGMENTS.has(currentSegment);
    const isVerifyScreen = currentSegment === VERIFY_SEGMENT;

    if (!user && !isAuthScreen) {
      router.replace('/');
    } else if (user && !emailVerified && !isVerifyScreen) {
      // Signed in but hasn't confirmed their email -- nothing past the gate.
      router.replace('/verify-email');
    } else if (user && emailVerified && (isAuthScreen || isVerifyScreen)) {
      router.replace('/(tabs)/home');
    }
  }, [user, loading, emailVerified, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="organizer/qr/[eventId]" />
      <Stack.Screen name="organizer/create-event" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
