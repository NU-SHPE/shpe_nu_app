import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { isChapterEmail, CHAPTER_EMAIL_LABEL } from '../utils/validation';
import { colors } from '../components/theme';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const router = useRouter();
  const { resetPassword } = useAuth();

  const handleSend = async () => {
    setError('');

    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (!isChapterEmail(email)) {
      setError(`Enter your ${CHAPTER_EMAIL_LABEL} email.`);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else if (code === 'auth/user-not-found') {
        // Don't reveal whether the address has an account.
        setSent(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name={sent ? 'mail-outline' : 'lock-closed-outline'}
          size={30}
          color={colors.purple}
        />
      </View>

      <Text style={styles.title}>Reset password</Text>

      {sent ? (
        <>
          <Text style={styles.body}>
            If an account exists for{'\n'}
            <Text style={styles.email}>{email.trim()}</Text>
            {'\n'}we&rsquo;ve sent a link to reset your password.
          </Text>
          <Text style={styles.hint}>
            Check your inbox and spam folder. The link opens a page to set a new
            password, then you can log in with it.
          </Text>
          <TouchableOpacity
            testID="forgot-back"
            style={styles.button}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.buttonText}>Back to log in</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter your chapter email and we&rsquo;ll send you a link to set a new
            password.
          </Text>

          <TextInput
            testID="forgot-email"
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus={!email}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            testID="forgot-submit"
            style={styles.button}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send reset link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/')}>
            <Text style={styles.backText}>Back to log in</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
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
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.purpleTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.purple,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  email: {
    fontWeight: '700',
    color: '#111',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    color: '#0A0A0A',
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    fontSize: 16,
  },
  errorText: {
    alignSelf: 'stretch',
    color: colors.danger,
    fontSize: 13,
    marginTop: -4,
    marginBottom: 10,
    marginLeft: 4,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  backLink: {
    marginTop: 20,
    padding: 8,
  },
  backText: {
    color: '#888',
    fontSize: 14,
  },
});
