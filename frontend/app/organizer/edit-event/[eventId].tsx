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
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../../components/theme';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_KEYS,
  type EventCategory,
  type EventDoc,
} from '../../../types/event';
import { DateSelect } from '../../../components/DateSelect';
import { TimeSelect, formatTimeLabel } from '../../../components/TimeSelect';
import { formatEventDate, parseDateTime, toDateInput, toTimeInput, toDate } from '../../../utils/date';

type PickerTarget = 'date' | 'start' | 'end';
type FieldErrors = Partial<Record<'title' | 'category' | 'date' | 'time' | 'location', string>>;

export default function EditEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user, profile, profileLoading } = useAuth();

  const [event, setEvent] = useState<(EventDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkInCount, setCheckInCount] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    const fetchEvent = async () => {
      try {
        const snap = await getDoc(doc(db, 'events', String(eventId)));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          const data = { id: snap.id, ...(snap.data() as EventDoc) };
          setEvent(data);
          setTitle(data.title ?? '');
          setCategory(data.category);
          setLocation(data.location ?? '');
          setDescription(data.description ?? '');
          const start = toDate(data.startsAt);
          const end = toDate(data.endsAt);
          if (start) {
            setDate(toDateInput(start));
            setStartTime(toTimeInput(start));
          }
          if (end) setEndTime(toTimeInput(end));
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const canManage =
    profile?.isAdmin === true || (profile?.isExec === true && event?.createdBy === user?.uid);

  // Admin-only: checkIns reads are isAdmin()-only in firestore.rules, so an
  // exec viewer can't run this query even for their own event. The warning
  // still shows without a number for them — this is the same asymmetry the
  // organizer past-events attendance badge already has, not a new one.
  useEffect(() => {
    if (!deleteModalVisible || !eventId || profile?.isAdmin !== true) return;
    getCountFromServer(query(collection(db, 'checkIns'), where('eventId', '==', eventId)))
      .then((snap) => setCheckInCount(snap.data().count))
      .catch((error) => {
        console.error('Error loading check-in count:', error);
        setCheckInCount(null);
      });
  }, [deleteModalVisible, eventId, profile?.isAdmin]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Give the event a name.';
    if (!category) next.category = 'Pick a category.';
    if (!date) next.date = 'Pick a date.';
    if (!location.trim()) next.location = 'Where is it happening?';

    if (!startTime || !endTime) {
      next.time = 'Pick a start and end time.';
    } else if (date) {
      const startsAt = parseDateTime(date, startTime);
      const endsAt = parseDateTime(date, endTime);
      if (!startsAt || !endsAt) next.time = 'That time looks wrong.';
      else if (endsAt <= startsAt) next.time = 'The end time has to be after the start.';
    }
    return next;
  };

  const handleSave = async () => {
    if (!event) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const startsAt = parseDateTime(date, startTime)!;
    const endsAt = parseDateTime(date, endTime)!;
    const points = EVENT_CATEGORIES[category!];

    setSaving(true);
    try {
      await updateDoc(doc(db, 'events', event.id), {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        checkInPoints: points.checkInPoints,
        checkOutPoints: points.checkOutPoints,
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
      });
      router.back();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', event.id));
      setDeleteModalVisible(false);
      router.back();
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Could not delete this event. Please try again.');
      setDeleting(false);
    }
  };

  const selected = category ? EVENT_CATEGORIES[category] : undefined;

  if (loading || profileLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Event" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
        </View>
      </View>
    );
  }

  if (notFound || !event) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Event" onBack={() => router.back()} />
        <Text style={styles.noAccess}>This event no longer exists.</Text>
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.container}>
        <PageHeader title="Edit Event" onBack={() => router.back()} />
        <Text style={styles.noAccess}>You can only edit events you created.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Edit Event" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.fieldLabel}>Event name</Text>
          <TextInput
            style={styles.input}
            placeholder="Fall Kickoff Meeting"
            placeholderTextColor={colors.textFaint}
            value={title}
            onChangeText={setTitle}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipRow}>
            {EVENT_CATEGORY_KEYS.map((key) => {
              const isSelected = key === category;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {EVENT_CATEGORIES[key].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

          {selected ? (
            <Text style={styles.pointsNote}>
              Worth {selected.checkInPoints}{' '}
              {selected.checkInPoints === 1 ? 'point' : 'points'} for checking in
              {selected.checkOutPoints > 0
                ? `, plus ${selected.checkOutPoints} for checking out.`
                : '. No check-out for this category.'}
            </Text>
          ) : null}

          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setPicker('date')}>
            <Text style={date ? styles.inputValue : styles.inputPlaceholder}>
              {date ? formatEventDate(new Date(`${date}T00:00:00`)) : 'Pick a date'}
            </Text>
          </TouchableOpacity>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>Starts</Text>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('start')}>
                <Text style={startTime ? styles.inputValue : styles.inputPlaceholder}>
                  {startTime ? formatTimeLabel(startTime) : 'Pick a time'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>Ends</Text>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('end')}>
                <Text style={endTime ? styles.inputValue : styles.inputPlaceholder}>
                  {endTime ? formatTimeLabel(endTime) : 'Pick a time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}

          <DateSelect
            visible={picker === 'date'}
            value={date}
            onSelect={setDate}
            onClose={() => setPicker(null)}
          />
          <TimeSelect
            visible={picker === 'start'}
            value={startTime}
            title="Start time"
            onSelect={setStartTime}
            onClose={() => setPicker(null)}
          />
          <TimeSelect
            visible={picker === 'end'}
            value={endTime}
            title="End time"
            onSelect={setEndTime}
            onClose={() => setPicker(null)}
          />

          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Tech LR2"
            placeholderTextColor={colors.textFaint}
            value={location}
            onChangeText={setLocation}
          />
          {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What's happening at this event?"
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
          />

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
            <Text style={styles.deleteButtonText}>Delete Event</Text>
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
            <Text style={styles.modalTitle}>Delete this event?</Text>
            <Text style={styles.modalBody}>
              Deleting this event is permanent. Any member who already checked in will see
              &quot;Event unavailable&quot; in their attendance history from now on.
              {profile?.isAdmin === true
                ? checkInCount === null
                  ? ''
                  : checkInCount > 0
                    ? ` ${checkInCount} ${checkInCount === 1 ? 'member has' : 'members have'} already checked in.`
                    : ' No one has checked in yet.'
                : ''}
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
  inputValue: {
    color: colors.text,
    fontSize: fontSize.body,
  },
  inputPlaceholder: {
    color: colors.textFaint,
    fontSize: fontSize.body,
  },
  multiline: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    color: colors.text,
    fontSize: fontSize.label,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.onNavy,
  },
  errorText: {
    color: colors.red,
    fontSize: fontSize.label,
    marginTop: spacing.xs,
  },
  pointsNote: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.label,
    lineHeight: 18,
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
