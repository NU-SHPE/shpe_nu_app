import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/**
 * Without explicit persistence, Firebase Auth on React Native keeps session
 * state in memory only — members would sign in again on every launch.
 *
 * getReactNativePersistence exists only on Firebase's react-native entry point.
 * Metro resolves that on phones, but TypeScript and the web bundle both see the
 * browser build, where the symbol isn't there — so it's resolved with require()
 * inside the native branch rather than imported at the top. Browsers already
 * persist to localStorage, so getAuth is the right call there anyway.
 */
const nativePersistence = (): Persistence =>
  require('firebase/auth').getReactNativePersistence(AsyncStorage);

export const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: nativePersistence() });

export const db = getFirestore(app);

// Cloud Storage — only the resume book uses it. Requires the Blaze plan
// (this project's bucket is the newer `.firebasestorage.app` kind, which has
// no Spark free tier); usage stays inside the free allowance at chapter scale.
export const storage = getStorage(app);
