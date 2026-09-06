import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
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
  /**
   * Whether the signed-in user has confirmed ownership of their email. Tracked
   * as its own state because `onAuthStateChanged` does NOT refire when the
   * flag flips -- the verify-email screen calls `reloadUser()` to pick it up.
   */
  emailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile: UserProfileInput,
  ) => Promise<void>;
  /** Re-send the verification link to the current user's address. */
  resendVerification: () => Promise<void>;
  /**
   * Send a password-reset link. Resolves whether or not an account exists for
   * the address -- Firebase's email-enumeration protection means it may not
   * throw for an unknown email, so callers show the same "check your inbox"
   * message either way rather than confirming which emails are registered.
   */
  resetPassword: (email: string) => Promise<void>;
  /**
   * Pull the latest user record from Firebase and, if the email just became
   * verified, force-refresh the ID token so the `email_verified` claim the
   * Firestore rules read is current. Returns the fresh verified state.
   */
  reloadUser: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(firebaseUser?.emailVerified ?? false);
      setLoading(false);
      // Hold off on push registration until the address is confirmed -- an
      // unverified account can't get past the verify-email gate anyway, and
      // the pushTokens write rule now requires a verified token.
      if (firebaseUser?.emailVerified) registerForPushNotifications(firebaseUser.uid);
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
    await sendEmailVerification(credential.user);
  };

  const resendVerification = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const reloadUser = async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    const verified = current.emailVerified;
    // A fresh ID token so `request.auth.token.email_verified` is true for the
    // Firestore rules -- `reload()` alone updates the user record but not the
    // token's claims.
    if (verified) await current.getIdToken(true);
    setUser(current);
    setEmailVerified(verified);
    if (verified) registerForPushNotifications(current.uid);
    return verified;
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        emailVerified,
        login,
        register,
        resendVerification,
        resetPassword,
        reloadUser,
        logout,
      }}
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
