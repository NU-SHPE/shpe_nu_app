import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../../components/theme';

type FieldErrors = Partial<Record<'title' | 'body', string>>;

interface AnnouncementDoc {
  title: string;
  body: string;
  createdBy?: string;
}

export default function EditAnnouncementScreen() {
  const router = useRouter();
  const { announcementId } = useLocalSearchParams<{ announcementId: string }>();
  const { user, profile, profileLoading } = useAuth();

  const [announcement, setAnnouncement] = useState<(AnnouncementDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!announcementId) {
      setLoading(false);
      return;
    }
    const fetchAnnouncement = async () => {
      try {
        const snap = await getDoc(doc(db, 'announcements', String(announcementId)));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          const data = { id: snap.id, ...(snap.data() as AnnouncementDoc) };
          setAnnouncement(data);
          setTitle(data.title ?? '');
          setBody(data.body ?? '');
        }
      } catch (error) {
        console.error('Error fetching announcement:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [announcementId]);

  // A missing createdBy (hand-written console announcements from before this
  // feature existed) falls out as admin-only-manageable -- it can't match
  // any exec's uid.
  const canManage =
    profile?.isAdmin === true || (profile?.isExec === true && announcement?.createdBy === user?.uid);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Give the announcement a title.';
    if (!body.trim()) next.body = "What's the announcement?";
    return next;
  };

  const handleSave = async () => {
    if (!announcement) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'announcements', announcement.id), {
        title: title.trim(),
        body: body.trim(),
      });
      router.back();
    } catch (error) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!announcement) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'announcements', announcement.id));
      setDeleteModalVisible(false);
      router.back();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      Alert.alert('Error', 'Could not delete this announcement. Please try again.');
      setDeleting(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Announcement" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
        </View>
      </View>
    );
  }

  if (notFound || !announcement) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Announcement" onBack={() => router.back()} />
        <Text style={styles.noAccess}>This announcement no longer exists.</Text>
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Announcement" onBack={() => router.back()} />
        <Text style={styles.noAccess}>You can only edit announcements you posted.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Edit Announcement" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

          <Text style={styles.fieldLabel}>Announcement</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholderTextColor={colors.textFaint}
            value={body}
            onChangeText={setBody}
            multiline
          />
          {errors.body ? <Text style={styles.errorText}>{errors.body}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.red} />
            <Text style={styles.deleteButtonText}>Delete Announcement</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this announcement?</Text>
            <Text style={styles.modalBody}>
              This removes it from every member&apos;s home feed. This can&apos;t be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: colors.red,
    fontSize: fontSize.label,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.red,
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
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    height: 48,
    marginTop: spacing.md,
  },
  deleteButtonText: {
    color: colors.red,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: fontSize.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.screen,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '600',
  },
  modalDeleteButton: {
    backgroundColor: colors.red,
  },
  modalDeleteText: {
    color: colors.card,
    fontWeight: '700',
  },
});
