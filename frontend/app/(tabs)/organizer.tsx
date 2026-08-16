import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import { categoryLabel } from '../../types/event';
import { formatEventDate, formatTimeRange } from '../../utils/date';

export default function OrganizerScreen() {
  const router = useRouter();
  const { profile, profileLoading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // onSnapshot, not getDocs: a one-time fetch leaves this list showing whatever
  // existed when the tab first mounted. Tabs stay mounted, so creating an event
  // and coming back wouldn't show it.
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startsAt', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading events:', error);
        setLoading(false);
      },
    );
  }, []);

  const canAccessOrganizer = profile?.isAdmin === true || profile?.isExec === true;

  if (!profileLoading && profile && !canAccessOrganizer) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="lock-closed-outline" size={48} color="#888" />
        <Text style={styles.noAccessTitle}>Organizer access required</Text>
        <Text style={styles.noAccessBody}>
          Only SHPE organizers can generate event QR codes.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Organizer"
        subtitle="Show the check-in code when an event starts, check-out when it ends"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionsRow}>
          <ActionButton
            icon="add-circle"
            label="Create Event"
            onPress={() => router.push('/organizer/create-event')}
          />
          {/* Post Announcement goes here next. */}
          {profile?.isAdmin === true ? (
            <ActionButton
              icon="people-circle"
              label="Manage Roles"
              onPress={() => router.push('/organizer/manage-roles')}
            />
          ) : (
            <View style={styles.actionSpacer} />
          )}
        </View>

        <Text style={styles.sectionTitle}>Your Events</Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#D50032" />
          </View>
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>No events yet.</Text>
        ) : (
          events.map((ev) => {
            const timeStr = formatTimeRange(ev.startsAt, ev.endsAt);
            const category = categoryLabel(ev.category);
            return (
              <View key={ev.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{ev.title ?? 'Untitled Event'}</Text>
                  <Text style={styles.cardInfo}>
                    {formatEventDate(ev.startsAt)}
                    {timeStr ? ` · ${timeStr}` : ''}
                  </Text>
                  <Text style={styles.cardLocation}>
                    {[ev.location, category].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.qrButtonRow}>
                  <TouchableOpacity
                    style={styles.qrButton}
                    onPress={() => router.push(`/organizer/qr/${ev.id}`)}
                  >
                    <Ionicons name="log-in" size={22} color="#fff" />
                  </TouchableOpacity>

                  {ev.checkOutPoints > 0 ? (
                    <TouchableOpacity
                      style={[styles.qrButton, styles.qrButtonOut]}
                      onPress={() => router.push(`/organizer/qr/${ev.id}?mode=out`)}
                    >
                      <Ionicons name="log-out" size={22} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
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
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  actionSpacer: {
    flex: 1,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B2A6B',
    marginTop: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2A6B',
    marginBottom: 4,
  },
  cardInfo: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 13,
    color: '#888',
  },
  qrButtonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  qrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D50032',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  // Only overrides the colour — size and shape come from qrButton underneath.
  qrButtonOut: {
    backgroundColor: '#1B2A6B',
  },
  noAccessTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  noAccessBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 260,
  },
});
