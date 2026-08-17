import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { isChapterEmail, CHAPTER_EMAIL_LABEL } from '../utils/validation';
import { SegmentedControl } from '../components/SegmentedControl';
import { DateSelect } from '../components/DateSelect';
import { MajorSelect, OTHER } from '../components/MajorSelect';
import { calculateAge, formatDateInput } from '../utils/date';
import {
  MAJOR_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  type SchoolLevel,
  type SexAtBirth,
} from '../types/user';

const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.';
const isStrongPassword = (pw: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw);

type FieldErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'birthday'
    | 'sexAtBirth'
    | 'gender'
    | 'schoolLevel'
    | 'majors',
    string
  >
>;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');

  const router = useRouter();
  const { register } = useAuth();

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

  /**
   * Errors land under the field they belong to rather than in an alert —
   * Alert.alert is a no-op on web in this react-native-web version (it
   * doesn't even fall back to window.alert), so anything routed through it
   * was silently invisible to web users.
   */
  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'Enter your first name.';
    if (!lastName.trim()) next.lastName = 'Enter your last name.';

    if (!email.trim()) next.email = 'Enter your email.';
    else if (!isChapterEmail(email)) {
      next.email = `Registration is restricted to ${CHAPTER_EMAIL_LABEL} emails.`;
    }

    if (!password) next.password = PASSWORD_HINT;
    else if (!isStrongPassword(password)) next.password = PASSWORD_HINT;

    if (!confirmPassword) next.confirmPassword = 'Confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';

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

  const handleRegister = async () => {
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsLoading(true);
    try {
      await register(email, password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthday,
        sexAtBirth: sexAtBirth!,
        gender: gender.trim(),
        pronouns: pronouns.trim(),
        schoolLevel: schoolLevel!,
        majors: majors.map((m) => m.trim()),
        minors: minors.map((m) => m.trim()).filter(Boolean),
        memberId: memberId.trim(),
      });
    } catch (error: any) {
      const code = error?.code;

      if (code === 'auth/email-already-in-use') {
        setErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }));
      } else if (code === 'auth/invalid-email') {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
      } else if (code === 'auth/weak-password') {
        setErrors((prev) => ({ ...prev, password: PASSWORD_HINT }));
      } else if (code === 'auth/too-many-requests') {
        setFormError('Too many attempts. Please wait a moment and try again.');
      } else {
        setFormError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SHPE Northwestern</Text>

        <Text style={styles.sectionLabel}>Account</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#888"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Last Name(s)"
          placeholderTextColor="#888"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
        {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={`Email (${CHAPTER_EMAIL_LABEL})`}
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Text style={[styles.hintText, errors.password && styles.errorText]}>
          {errors.password ?? PASSWORD_HINT}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Profile</Text>
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

        <TextInput
          style={styles.input}
          placeholder="Gender"
          placeholderTextColor="#888"
          value={gender}
          onChangeText={setGender}
        />
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Pronouns (optional)"
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
          <Ionicons name="add-circle-outline" size={20} color="#D50032" />
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
          <Ionicons name="add-circle-outline" size={20} color="#D50032" />
          <Text style={styles.addRowText}>Add minor</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Member ID (optional)"
          placeholderTextColor="#888"
          value={memberId}
          onChangeText={setMemberId}
          autoCapitalize="characters"
        />

        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginBold}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  sectionLabel: {
    color: '#D50032',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#3a3f47',
    color: '#fff',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
    justifyContent: 'center',
  },
  errorText: {
    color: '#D50032',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  hintText: {
    color: '#999',
    fontSize: 13,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  formErrorText: {
    color: '#D50032',
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
    marginBottom: 15,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  addRowText: {
    color: '#D50032',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#D50032',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 20,
  },
  loginText: {
    color: '#aaa',
    fontSize: 15,
  },
  loginBold: {
    color: '#D50032',
    fontWeight: '700',
  },
});
