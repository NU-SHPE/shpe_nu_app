import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { auth, db } from '../firebaseConfig';
import type { UserProfile, UserProfileInput } from '../types/user';

// How a notification behaves if it arrives while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push and stores its token, keyed by uid, in the
 * dedicated pushTokens collection (not on the user's own profile doc -- see
 * firestore.rules). Silently no-ops on web or if permission is denied;
 * nothing else in the app depends on this succeeding. Doesn't work in Expo
 * Go (SDK dropped remote push support there) -- needs a real EAS build.
 */
const registerForPushNotifications = async (uid: string) => {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await setDoc(doc(db, 'pushTokens', uid), {
      token,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }
};

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile: UserProfileInput,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) registerForPushNotifications(firebaseUser.uid);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setProfileLoading(false);
      },
      (error) => {
        console.error('Error subscribing to profile:', error);
        setProfileLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const register = async (
    email: string,
    password: string,
    profileInput: UserProfileInput,
  ) => {
    const trimmedEmail = email.trim();
    const credential = await createUserWithEmailAndPassword(
      auth,
      trimmedEmail,
      password,
    );
    await setDoc(doc(db, 'users', credential.user.uid), {
      ...profileInput,
      email: trimmedEmail,
      isAdmin: false,
      isExec: false,
      createdAt: serverTimestamp(),
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, profileLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
