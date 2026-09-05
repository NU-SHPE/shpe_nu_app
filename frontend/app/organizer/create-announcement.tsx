import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../components/theme';
import { displayName } from '../../types/user';

type FieldErrors = Partial<Record<'title' | 'body', string>>;

/**
 * No Cloud Function -- sent straight from this client to Expo's push
 * endpoint, which needs no API key (it's keyed by the tokens themselves).
 * Chunked at 100, Expo's documented per-request batch limit. Best-effort:
 * a failed send doesn't block the announcement itself, which is already
 * saved by the time this runs.
 */
const sendPushToAllMembers = async (title: string, body: string) => {
  try {
    const snapshot = await getDocs(collection(db, 'pushTokens'));
    const tokens = snapshot.docs
      .map((d) => d.data().token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);

    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100).map((to) => ({ to, title, body }));
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
};

export default function CreateAnnouncementScreen() {
  const router = useRouter();
  const { user, profile, profileLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Give the announcement a title.';
    if (!body.trim()) next.body = "What's the announcement?";
    return next;
  };

  const canPost = profile?.isAdmin === true || profile?.isExec === true;

  if (!profileLoading && profile && !canPost) {
    return (
      <View style={styles.container}>
        <PageHeader title="Post Announcement" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only organizers can post announcements.</Text>
      </View>
    );
  }

  const handlePost = async () => {
    if (!user) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    setSaving(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: trimmedTitle,
        body: trimmedBody,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        // Saved at post time, not looked up live -- the users collection is
        // admin-or-self only, so a member reading the feed couldn't resolve
        // another poster's uid into a name anyway. Also keeps this accurate
        // to who actually posted it even if that person's name changes later.
        createdByName: displayName(profile) || profile?.email || 'A member',
      });
      // Fire-and-forget: the announcement is already saved and visible on
      // the home feed regardless of whether the push send succeeds.
      sendPushToAllMembers(trimmedTitle, trimmedBody);
      router.back();
    } catch (error) {
      console.error('Error posting announcement:', error);
      Alert.alert('Error', 'Could not post the announcement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Post Announcement" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Chapter Meeting Moved to Friday"
            placeholderTextColor={colors.textFaint}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

          <Text style={styles.fieldLabel}>Announcement</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What do members need to know?"
            placeholderTextColor={colors.textFaint}
            value={body}
            onChangeText={setBody}
            multiline
          />
          {errors.body ? <Text style={styles.errorText}>{errors.body}</Text> : null}

          <Text style={styles.pushNote}>
            Every member with notifications enabled gets a push when this posts.
          </Text>

          <TouchableOpacity style={styles.button} onPress={handlePost} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Post Announcement</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  noAccess: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.textMuted,
    fontSize: fontSize.body,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.label,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    minHeight: 48,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    justifyContent: 'center',
  },
  multiline: {
    minHeight: 140,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.label,
    marginTop: spacing.xs,
  },
  pushNote: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: fontSize.label,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.purple,
    height: 52,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: {
    color: colors.card,
    fontSize: 17,
    fontWeight: '700',
  },
});
