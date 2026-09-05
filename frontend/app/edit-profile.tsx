import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageHeader } from '../components/PageHeader';
import { DateSelect } from '../components/DateSelect';
import { MajorSelect, OTHER } from '../components/MajorSelect';
import { calculateAge, formatDateInput } from '../utils/date';
import { colors } from '../components/theme';
import {
  MAJOR_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  type SchoolLevel,
  type SexAtBirth,
} from '../types/user';

type FieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'birthday'
    | 'sexAtBirth'
    | 'gender'
    | 'schoolLevel'
    | 'majors',
    string
  >
>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [sexAtBirth, setSexAtBirth] = useState<SexAtBirth | undefined>();
  const [gender, setGender] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | undefined>();
  const [majors, setMajors] = useState<string[]>([]);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [minors, setMinors] = useState<string[]>([]);
  const [memberId, setMemberId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setBirthday(profile.birthday ?? '');
    setSexAtBirth(profile.sexAtBirth);
    setGender(profile.gender ?? '');
    setPronouns(profile.pronouns ?? '');
    setSchoolLevel(profile.schoolLevel);
    setMajors(profile.majors ?? []);
    setMinors(profile.minors ?? []);
    setMemberId(profile.memberId ?? '');
  }, [profile]);

  const addMajor = (value: string) => {
    setShowMajorPicker(false);
    setMajors((prev) => [...prev, value === OTHER ? '' : value]);
  };
  const updateMajor = (index: number, text: string) =>
    setMajors((prev) => prev.map((m, i) => (i === index ? text : m)));
  const removeMajor = (index: number) =>
    setMajors((prev) => prev.filter((_, i) => i !== index));

  const addMinor = () => setMinors((prev) => [...prev, '']);
  const updateMinor = (index: number, text: string) =>
    setMinors((prev) => prev.map((m, i) => (i === index ? text : m)));
  const removeMinor = (index: number) =>
    setMinors((prev) => prev.filter((_, i) => i !== index));

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'Enter your first name.';
    if (!lastName.trim()) next.lastName = 'Enter your last name.';

    if (!birthday) next.birthday = 'Pick your birthday.';
    else {
      const age = calculateAge(birthday);
      if (age == null || age < 13 || age > 120) next.birthday = 'That birthday looks wrong.';
    }

    if (!sexAtBirth) next.sexAtBirth = 'Select one.';
    if (!gender.trim()) next.gender = 'Enter your gender.';
    if (!schoolLevel) next.schoolLevel = 'Select one.';

    if (majors.length === 0) next.majors = 'Add at least one major.';
    else if (majors.some((m) => !m.trim())) next.majors = 'Finish typing your major, or remove it.';

    return next;
  };

  const handleSave = async () => {
    if (!user) return;

    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthday,
        sexAtBirth,
        gender: gender.trim(),
        pronouns: pronouns.trim(),
        schoolLevel,
        majors: majors.map((m) => m.trim()),
        minors: minors.map((m) => m.trim()).filter(Boolean),
        memberId: memberId.trim(),
      });
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormError('Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Edit Profile" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.fieldLabel}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#888"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

          <Text style={styles.fieldLabel}>Last Name(s)</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name(s)"
            placeholderTextColor="#888"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

          <Text style={styles.fieldLabel}>Birthday</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowBirthdayPicker(true)}
          >
            <Text style={birthday ? styles.inputValue : styles.inputPlaceholder}>
              {birthday ? formatDateInput(birthday) : 'Birthday'}
            </Text>
          </TouchableOpacity>
          {errors.birthday ? <Text style={styles.errorText}>{errors.birthday}</Text> : null}
          <DateSelect
            visible={showBirthdayPicker}
            value={birthday}
            onSelect={setBirthday}
            onClose={() => setShowBirthdayPicker(false)}
          />

          <Text style={styles.fieldLabel}>Sex assigned at birth</Text>
          <SegmentedControl
            options={SEX_AT_BIRTH_OPTIONS}
            value={sexAtBirth}
            onChange={setSexAtBirth}
          />
          {errors.sexAtBirth ? <Text style={styles.errorText}>{errors.sexAtBirth}</Text> : null}

          <Text style={styles.fieldLabel}>Gender</Text>
          <TextInput
            style={styles.input}
            placeholder="Gender"
            placeholderTextColor="#888"
            value={gender}
            onChangeText={setGender}
          />
          {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

          <Text style={styles.fieldLabel}>Pronouns (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Pronouns"
            placeholderTextColor="#888"
            value={pronouns}
            onChangeText={setPronouns}
          />

          <Text style={styles.fieldLabel}>School level</Text>
          <SegmentedControl
            options={SCHOOL_LEVEL_OPTIONS}
            value={schoolLevel}
            onChange={setSchoolLevel}
          />
          {errors.schoolLevel ? <Text style={styles.errorText}>{errors.schoolLevel}</Text> : null}

          <Text style={styles.fieldLabel}>Major(s)</Text>
          {majors.map((m, index) => {
            const isCustom = !(MAJOR_OPTIONS as readonly string[]).includes(m);
            return (
              <View key={index} style={styles.chipRow}>
                {isCustom ? (
                  <TextInput
                    style={[styles.input, styles.chipInput]}
                    placeholder="Type your major"
                    placeholderTextColor="#888"
                    value={m}
                    onChangeText={(text) => updateMajor(index, text)}
                    autoCapitalize="words"
                  />
                ) : (
                  <View style={[styles.input, styles.chipStatic]}>
                    <Text style={styles.inputValue}>{m}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeMajor(index)}
                  style={styles.chipRemove}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={22} color="#888" />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addRow} onPress={() => setShowMajorPicker(true)}>
            <Ionicons name="add-circle-outline" size={20} color={colors.purple} />
            <Text style={styles.addRowText}>Add major</Text>
          </TouchableOpacity>
          {errors.majors ? <Text style={styles.errorText}>{errors.majors}</Text> : null}
          <MajorSelect
            visible={showMajorPicker}
            exclude={majors}
            onSelect={addMajor}
            onClose={() => setShowMajorPicker(false)}
          />

          <Text style={styles.fieldLabel}>Minor(s) (optional)</Text>
          {minors.map((m, index) => (
            <View key={index} style={styles.chipRow}>
              <TextInput
                style={[styles.input, styles.chipInput]}
                placeholder="Minor"
                placeholderTextColor="#888"
                value={m}
                onChangeText={(text) => updateMinor(index, text)}
                autoCapitalize="words"
              />
              <TouchableOpacity
                onPress={() => removeMinor(index)}
                style={styles.chipRemove}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={22} color="#888" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={addMinor}>
            <Ionicons name="add-circle-outline" size={20} color={colors.purple} />
            <Text style={styles.addRowText}>Add minor</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Member ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Member ID (recommended)"
            placeholderTextColor="#888"
            value={memberId}
            onChangeText={setMemberId}
            autoCapitalize="characters"
          />

          {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
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
    backgroundColor: '#25292e',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 2,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#3a3f47',
    color: '#fff',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 16,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
  },
  formErrorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  inputValue: {
    color: '#fff',
    fontSize: 16,
  },
  inputPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipInput: {
    flex: 1,
  },
  chipStatic: {
    flex: 1,
  },
  chipRemove: {
    marginBottom: 10,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  addRowText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
