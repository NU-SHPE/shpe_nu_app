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
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../components/theme';
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_KEYS,
  type EventCategory,
} from '../../types/event';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parseDateTime, toDateInput, toTimeInput } from '../../utils/date';

/**
 * The community picker has no usable web build, so the browser keeps plain text
 * inputs. Officers create events on their phones, which is where the native
 * date and time wheels matter.
 */
const USE_NATIVE_PICKER = Platform.OS !== 'web';

type PickerTarget = 'date' | 'start' | 'end';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user, profile, profileLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  /** Seeds the picker with whatever's already chosen, else a sensible default. */
  const pickerValue = (target: PickerTarget): Date => {
    if (target === 'date') return parseDateTime(date, '12:00') ?? new Date();
    const time = target === 'start' ? startTime : endTime;
    return parseDateTime(date || toDateInput(new Date()), time) ?? new Date();
  };

  const handlePicked = (_event: unknown, selected?: Date) => {
    const target = picker;
    setPicker(null); // Android dismisses the dialog once a value is chosen
    if (!selected || !target) return;
    if (target === 'date') setDate(toDateInput(selected));
    else if (target === 'start') setStartTime(toTimeInput(selected));
    else setEndTime(toTimeInput(selected));
  };

  if (!profileLoading && profile && profile.isAdmin !== true) {
    return (
      <View style={styles.container}>
        <PageHeader title="Create Event" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only organizers can create events.</Text>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!user) return;

    if (!title || !category || !date || !startTime || !endTime || !location) {
      Alert.alert('Error', 'Please fill in every field except description.');
      return;
    }

    const startsAt = parseDateTime(date, startTime);
    const endsAt = parseDateTime(date, endTime);

    if (!startsAt) {
      Alert.alert('Error', 'Check the date and start time. Use YYYY-MM-DD and HH:MM.');
      return;
    }
    if (!endsAt) {
      Alert.alert('Error', 'Check the end time. Use HH:MM in 24-hour format.');
      return;
    }
    if (endsAt <= startsAt) {
      Alert.alert('Error', 'The end time has to be after the start time.');
      return;
    }

    const points = EVENT_CATEGORIES[category];

    setSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        checkInPoints: points.checkInPoints,
        checkOutPoints: points.checkOutPoints,
        checkOutOpen: false,
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromDate(endsAt),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      router.back();
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Could not create the event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selected = category ? EVENT_CATEGORIES[category] : undefined;

  return (
    <View style={styles.container}>
      <PageHeader title="Create Event" onBack={() => router.back()} />

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
          {USE_NATIVE_PICKER ? (
            <TouchableOpacity style={styles.input} onPress={() => setPicker('date')}>
              <Text style={date ? styles.inputValue : styles.inputPlaceholder}>
                {date || 'Pick a date'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
          )}

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>Starts</Text>
              {USE_NATIVE_PICKER ? (
                <TouchableOpacity style={styles.input} onPress={() => setPicker('start')}>
                  <Text style={startTime ? styles.inputValue : styles.inputPlaceholder}>
                    {startTime || 'Pick a time'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="18:00"
                  placeholderTextColor={colors.textFaint}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              )}
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>Ends</Text>
              {USE_NATIVE_PICKER ? (
                <TouchableOpacity style={styles.input} onPress={() => setPicker('end')}>
                  <Text style={endTime ? styles.inputValue : styles.inputPlaceholder}>
                    {endTime || 'Pick a time'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="19:00"
                  placeholderTextColor={colors.textFaint}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              )}
            </View>
          </View>

          {picker ? (
            <DateTimePicker
              value={pickerValue(picker)}
              mode={picker === 'date' ? 'date' : 'time'}
              onChange={handlePicked}
            />
          ) : null}

          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Tech LR2"
            placeholderTextColor={colors.textFaint}
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="What's happening at this event?"
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Create Event</Text>
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
    justifyContent: 'center', // centers the Text when this wraps a picker row
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
});
