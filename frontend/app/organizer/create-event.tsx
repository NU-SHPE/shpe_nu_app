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
import { DateSelect } from '../../components/DateSelect';
import { TimeSelect, formatTimeLabel } from '../../components/TimeSelect';
import { formatEventDate, parseEventDates } from '../../utils/date';

type PickerTarget = 'startDate' | 'endDate' | 'start' | 'end';
type FieldErrors = Partial<
  Record<'title' | 'category' | 'startDate' | 'endDate' | 'time' | 'location', string>
>;

export default function CreateEventScreen() {
  const router = useRouter();
  const { user, profile, profileLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Same-day is the common case, so picking a start date carries the end
  // date along with it -- but only while it's still following (empty, or
  // equal to the previous start date). Once someone's deliberately set a
  // different end date (an overnight event), changing the start date again
  // doesn't clobber it.
  const handleSelectStartDate = (value: string) => {
    if (endDate === '' || endDate === startDate) setEndDate(value);
    setStartDate(value);
  };

  /**
   * Errors land under the field they belong to rather than in one alert, so
   * "which field is wrong and why" doesn't have to be guessed.
   */
  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = 'Give the event a name.';
    if (!category) next.category = 'Pick a category.';
    if (!startDate) next.startDate = 'Pick a start date.';
    if (!endDate) next.endDate = 'Pick an end date.';
    if (!location.trim()) next.location = 'Where is it happening?';

    if (!startTime || !endTime) {
      next.time = 'Pick a start and end time.';
    } else if (startDate && endDate) {
      const window = parseEventDates(startDate, startTime, endDate, endTime);
      if (!window) next.time = 'That time looks wrong.';
      else if (window.endsAt.getTime() <= window.startsAt.getTime()) {
        next.time = 'The end has to be after the start.';
      }
    }
    return next;
  };

  const canCreateEvents = profile?.isAdmin === true || profile?.isExec === true;

  if (!profileLoading && profile && !canCreateEvents) {
    return (
      <View style={styles.container}>
        <PageHeader title="Create Event" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only organizers can create events.</Text>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!user) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // validate() guarantees these are set and parseable.
    const { startsAt, endsAt } = parseEventDates(startDate, startTime, endDate, endTime)!;
    const points = EVENT_CATEGORIES[category!];

    setSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        category,
        checkInPoints: points.checkInPoints,
        checkOutPoints: points.checkOutPoints,
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

          <Text style={styles.fieldLabel}>Starts</Text>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('startDate')}>
                <Text style={startDate ? styles.inputValue : styles.inputPlaceholder}>
                  {startDate ? formatEventDate(new Date(`${startDate}T00:00:00`)) : 'Pick a date'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('start')}>
                <Text style={startTime ? styles.inputValue : styles.inputPlaceholder}>
                  {startTime ? formatTimeLabel(startTime) : 'Pick a time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.startDate ? <Text style={styles.errorText}>{errors.startDate}</Text> : null}

          <Text style={styles.fieldLabel}>Ends</Text>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('endDate')}>
                <Text style={endDate ? styles.inputValue : styles.inputPlaceholder}>
                  {endDate ? formatEventDate(new Date(`${endDate}T00:00:00`)) : 'Pick a date'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowItem}>
              <TouchableOpacity style={styles.input} onPress={() => setPicker('end')}>
                <Text style={endTime ? styles.inputValue : styles.inputPlaceholder}>
                  {endTime ? formatTimeLabel(endTime) : 'Pick a time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
          {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}

          <DateSelect
            visible={picker === 'startDate'}
            value={startDate}
            onSelect={handleSelectStartDate}
            onClose={() => setPicker(null)}
          />
          <DateSelect
            visible={picker === 'endDate'}
            value={endDate}
            onSelect={setEndDate}
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
});
