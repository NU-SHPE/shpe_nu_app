import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { formatRelativeTime } from '../../utils/date';
import { colors } from '../../components/theme';

function ActionButton({ icon, label, onPress } : { icon: any; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionIconCircle}>
        <Ionicons name={icon} size={26} color="#fff" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Index() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // onSnapshot, not getDocs: this tab stays mounted like every other tab in
  // the app, so a one-time fetch would show stale announcements forever
  // once one gets posted, edited, or deleted while this screen isn't active.
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setAnnouncements(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading announcements:', error);
        setLoading(false);
      },
    );
  }, []);

  const canManage = (a: any) => profile?.isAdmin === true || a.createdBy === user?.uid;

  return (
    <View style={styles.container}>
      <PageHeader
        title="SHPE App"
        subtitle={`Welcome back, ${profile?.firstName || 'Member'}!`}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.actionsRow}>
          <ActionButton icon="calendar-clear" label="View Events" onPress={() => router.push('/events')} />
          <ActionButton icon="scan" label="Check In" onPress={() => router.push('/check-in')} />
          <ActionButton icon="person" label="Profile" onPress={() => router.push('/profile')} />
        </View>

        <Text style={styles.sectionTitle}>Announcements</Text>
        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : announcements.length === 0 ? (
          <Text style={[styles.cardBody, { textAlign: 'center', marginTop: 8 }]}>No announcements yet.</Text>
        ) : (
          announcements.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.cardBody}>{a.body}</Text>
                <Text style={styles.cardTime}>
                  {[formatRelativeTime(a.createdAt) || a.time, a.createdByName && `Posted by ${a.createdByName}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {canManage(a) ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/organizer/edit-announcement/${a.id}`)}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </TouchableOpacity>
              ) : null}
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
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    height: 140,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 4,
    paddingVertical: 20,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width : 0, height : 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconCircle: {
    backgroundColor: colors.purple,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#25292e',
    textAlign: 'center',
    marginRight: 30,
    marginLeft: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.purple,
    marginBottom: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width : 0, height : 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.purple,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14,
    color: '#25292e',
    marginBottom: 6,
    lineHeight: 20,
  },
  cardTime: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
