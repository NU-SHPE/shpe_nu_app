import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { isChapterEmail, CHAPTER_EMAIL_LABEL } from '../utils/validation';
import { colors } from '../components/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');

  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    setFormError('');

    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Enter your email.';
    else if (!isChapterEmail(email)) {
      next.email = `Please use your ${CHAPTER_EMAIL_LABEL} email to sign in.`;
    }
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      const code = error?.code;

      if (code === 'auth/invalid-email') {
        setErrors({ email: 'Please enter a valid email address.' });
      } else if (code === 'auth/user-not-found') {
        setErrors({ email: 'No account found with this email.' });
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrors({ password: 'Incorrect password. Please try again.' });
      } else if (code === 'auth/too-many-requests') {
        setFormError('Too many failed attempts. Please try again later.');
      } else {
        setFormError('An unexpected error occurred. Please try again.');
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
      <Image
        source={require('../assets/images/shpe_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => router.push('/register')}
      >
        <Text style={styles.registerText}>
          Don't have an account? <Text style={styles.registerBold}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.purple,
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    color: '#0A0A0A',
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  formErrorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    alignSelf: 'center',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    color: '#aaa',
    fontSize: 15,
  },
  registerBold: {
    color: colors.purple,
    fontWeight: '700',
  },
});
