import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../components/theme';
import { displayName, type UserProfile } from '../../types/user';
import { useRouter } from 'expo-router';

type UserRow = UserProfile & { id: string };

export default function ManageRolesScreen() {
  const router = useRouter();
  const { profile, profileLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('firstName'));
    return onSnapshot(
      q,
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as UserRow)));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading users:', error);
        setLoading(false);
      },
    );
  }, []);

  if (!profileLoading && profile && profile.isAdmin !== true) {
    return (
      <View style={styles.container}>
        <PageHeader title="Manage Roles" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only admins can manage roles.</Text>
      </View>
    );
  }

  const toggleExec = async (row: UserRow, next: boolean) => {
    setSavingId(row.id);
    try {
      await updateDoc(doc(db, 'users', row.id), { isExec: next });
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Could not update this role. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Manage Roles"
        subtitle="Exec gets the Organizer tab: create events, run check-in/out QR codes, and post announcements"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.red} />
          </View>
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No members yet.</Text>
        ) : (
          users.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.name}>{displayName(row) || row.email}</Text>
                <Text style={styles.email}>{row.email}</Text>
                {row.isAdmin ? <Text style={styles.adminBadge}>Admin</Text> : null}
              </View>
              {row.isAdmin ? (
                <Text style={styles.adminNote}>Console-only</Text>
              ) : savingId === row.id ? (
                <ActivityIndicator color={colors.red} />
              ) : (
                <Switch
                  value={row.isExec === true}
                  onValueChange={(next) => toggleExec(row, next)}
                  trackColor={{ false: '#ccc', true: colors.red }}
                  thumbColor="#fff"
                  ios_backgroundColor="#ccc"
                />
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  adminBadge: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.navy,
    color: colors.onNavy,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  adminNote: {
    fontSize: 12,
    color: colors.textFaint,
  },
  noAccess: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: fontSize.body,
  },
});
