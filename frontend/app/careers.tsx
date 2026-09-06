import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { ResumeCard } from '../components/ResumeCard';
import { colors } from '../components/theme';
import {
  GRAD_MONTHS,
  SEEKING_OPTIONS,
  SPONSORSHIP_QUESTION,
  WORK_AUTH_QUESTION,
  YES_NO_OPTIONS,
  gradYearOptions,
  type Seeking,
  type YesNo,
} from '../types/user';

const MONTH_ABBR = GRAD_MONTHS.map((m) => m.slice(0, 3));

/**
 * A member's whole career profile in one place: their resume PDF plus the
 * structured fields (expected graduation, what they're seeking, work
 * authorization). Officers see all of this in the resume book and can hand
 * it to recruiters. Reached from a row on the Profile tab.
 */
export default function CareersScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  // Graduation is stored as gradTerm "YYYY-MM"; split into month (1-12) + year
  // for the pickers, recombined on save (only when both are set).
  const [gradMonth, setGradMonth] = useState<number | undefined>();
  const [gradYear, setGradYear] = useState<number | undefined>();
  const [seeking, setSeeking] = useState<Seeking[]>([]);
  const [workAuthorized, setWorkAuthorized] = useState<YesNo | undefined>();
  const [needsSponsorship, setNeedsSponsorship] = useState<YesNo | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const m = /^(\d{4})-(\d{2})$/.exec(profile.gradTerm ?? '');
    setGradYear(m ? Number(m[1]) : undefined);
    setGradMonth(m ? Number(m[2]) : undefined);
    setSeeking(profile.seeking ?? []);
    setWorkAuthorized(profile.workAuthorized);
    setNeedsSponsorship(profile.needsSponsorship);
  }, [profile]);

  const gradTerm =
    gradMonth && gradYear ? `${gradYear}-${String(gradMonth).padStart(2, '0')}` : '';

  const dirty =
    !!profile &&
    (gradTerm !== (profile.gradTerm ?? '') ||
      JSON.stringify(seeking) !== JSON.stringify(profile.seeking ?? []) ||
      workAuthorized !== profile.workAuthorized ||
      needsSponsorship !== profile.needsSponsorship);

  const touch = () => setSaved(false);
  const toggleSeeking = (opt: Seeking) => {
    touch();
    setSeeking((prev) => (prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        gradTerm: gradTerm || null,
        seeking,
        workAuthorized: workAuthorized ?? null,
        needsSponsorship: needsSponsorship ?? null,
      });
      setSaved(true);
    } catch (e) {
      console.error('Error saving career details:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="Careers" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <ResumeCard />

          <Text style={styles.sectionTitle}>Career details</Text>
          <Text style={styles.sectionNote}>
            Shown to chapter officers alongside your resume. All optional.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Expected graduation</Text>
            <View style={styles.chipWrap}>
              {gradYearOptions().map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.pill, gradYear === y && styles.pillOn]}
                  onPress={() => {
                    touch();
                    setGradYear(gradYear === y ? undefined : y);
                  }}
                >
                  <Text style={[styles.pillText, gradYear === y && styles.pillTextOn]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.chipWrap, styles.monthWrap]}>
              {MONTH_ABBR.map((abbr, i) => {
                const month = i + 1;
                const on = gradMonth === month;
                return (
                  <TouchableOpacity
                    key={abbr}
                    style={[styles.pill, styles.monthPill, on && styles.pillOn]}
                    onPress={() => {
                      touch();
                      setGradMonth(on ? undefined : month);
                    }}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>{abbr}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Seeking</Text>
            <View style={styles.chipWrap}>
              {SEEKING_OPTIONS.map((opt) => {
                const on = seeking.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pill, on && styles.pillOn]}
                    onPress={() => toggleSeeking(opt)}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{WORK_AUTH_QUESTION}</Text>
            <View style={styles.chipWrap}>
              {YES_NO_OPTIONS.map((opt) => {
                const on = workAuthorized === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pill, on && styles.pillOn]}
                    onPress={() => {
                      touch();
                      setWorkAuthorized(on ? undefined : opt);
                    }}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{SPONSORSHIP_QUESTION}</Text>
            <View style={styles.chipWrap}>
              {YES_NO_OPTIONS.map((opt) => {
                const on = needsSponsorship === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pill, on && styles.pillOn]}
                    onPress={() => {
                      touch();
                      setNeedsSponsorship(on ? undefined : opt);
                    }}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonIdle]}
            onPress={save}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{saved && !dirty ? 'Saved' : 'Save career details'}</Text>
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
    backgroundColor: '#f2f2f7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 14,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthWrap: {
    marginTop: 8,
  },
  monthPill: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  pillOn: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  pillTextOn: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.purple,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonIdle: {
    backgroundColor: '#c7c7cc',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
