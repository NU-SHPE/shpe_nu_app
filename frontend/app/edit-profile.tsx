import React, { useEffect, useState } from 'react';
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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageHeader } from '../components/PageHeader';
import { DateSelect } from '../components/DateSelect';
import { calculateAge, formatDateInput } from '../utils/date';
import {
  SCHOOL_LEVEL_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  type SchoolLevel,
  type SexAtBirth,
} from '../types/user';

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
  const [major, setMajor] = useState('');
  const [minor, setMinor] = useState('');
  const [memberId, setMemberId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setBirthday(profile.birthday ?? '');
    setSexAtBirth(profile.sexAtBirth);
    setGender(profile.gender ?? '');
    setPronouns(profile.pronouns ?? '');
    setSchoolLevel(profile.schoolLevel);
    setMajor(profile.major ?? '');
    setMinor(profile.minor ?? '');
    setMemberId(profile.memberId ?? '');
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    if (
      !firstName ||
      !lastName ||
      !birthday ||
      !sexAtBirth ||
      !gender ||
      !schoolLevel ||
      !major
    ) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const age = calculateAge(birthday);
    if (age == null || age < 13 || age > 120) {
      Alert.alert('Error', 'Please enter a valid birthday.');
      return;
    }

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
        major: major.trim(),
        minor: minor.trim(),
        memberId: memberId.trim(),
      });
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not update your profile. Please try again.');
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

          <Text style={styles.fieldLabel}>Last Name(s)</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name(s)"
            placeholderTextColor="#888"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Birthday</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowBirthdayPicker(true)}
          >
            <Text style={birthday ? styles.inputValue : styles.inputPlaceholder}>
              {birthday ? formatDateInput(birthday) : 'Birthday'}
            </Text>
          </TouchableOpacity>
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

          <Text style={styles.fieldLabel}>Gender</Text>
          <TextInput
            style={styles.input}
            placeholder="Gender"
            placeholderTextColor="#888"
            value={gender}
            onChangeText={setGender}
          />

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

          <Text style={styles.fieldLabel}>Major</Text>
          <TextInput
            style={styles.input}
            placeholder="Major"
            placeholderTextColor="#888"
            value={major}
            onChangeText={setMajor}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Minor</Text>
          <TextInput
            style={styles.input}
            placeholder="Minor (optional)"
            placeholderTextColor="#888"
            value={minor}
            onChangeText={setMinor}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Member ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Member ID (recommended)"
            placeholderTextColor="#888"
            value={memberId}
            onChangeText={setMemberId}
            autoCapitalize="characters"
          />

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
  inputValue: {
    color: '#fff',
    fontSize: 16,
  },
  inputPlaceholder: {
    color: '#888',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#D50032',
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
