import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from '../../../components/Card';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { formatEventDate, formatTimeRange, isEventPast, toDate } from '../../../utils/date';
import { PageHeader } from '../../../components/PageHeader';
import { useNow } from '../../../hooks/useNow';
import { colors } from '../../../components/theme';

const NAVY = colors.purple;

/**
 * A plain link, not the real Google Calendar API — no OAuth, no API key, no
 * backend. Google's "render" endpoint pre-fills an event from URL params and
 * lets the visitor add it to their own calendar; this doesn't touch the
 * chapter's shared calendar at all.
 */
const toGCalDate = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');

const buildGoogleCalendarUrl = (event: any): string | null => {
  const start = toDate(event.startsAt);
  const end = toDate(event.endsAt);
  if (!start || !end) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title ?? '',
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export default function EventInfo() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvped, setRsvped] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(0);
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'events', id));
        setEvent(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    return onSnapshot(
      doc(db, 'rsvps', `${user.uid}_${id}`),
      (snap) => setRsvped(snap.exists()),
      (error) => console.error('Error loading RSVP status:', error),
    );
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'rsvps'), where('eventId', '==', id));
    return onSnapshot(
      q,
      (snapshot) => setRsvpCount(snapshot.size),
      (error) => console.error('Error loading RSVP count:', error),
    );
  }, [id]);

  const now = useNow();
  const eventPast = event ? isEventPast(event, now) : false;

  const toggleRsvp = async () => {
    if (!user || !id || eventPast) return;
    setRsvpError('');
    setRsvpSaving(true);
    try {
      const rsvpRef = doc(db, 'rsvps', `${user.uid}_${id}`);
      if (rsvped) {
        await deleteDoc(rsvpRef);
      } else {
        await setDoc(rsvpRef, {
          userId: user.uid,
          eventId: id,
          rsvpedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      setRsvpError('Could not update your RSVP. Please try again.');
    } finally {
      setRsvpSaving(false);
    }
  };

  const timeStr = formatTimeRange(event?.startsAt, event?.endsAt);
  const calendarUrl = event ? buildGoogleCalendarUrl(event) : null;

  return (
    <>
      <PageHeader
        title={loading ? '' : event?.title ?? 'Event not found'}
        onBack={() => router.push('/(tabs)/events')}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : !event ? (
        <View style={styles.loadingBox}>
          <Text style={styles.meta}>This event no longer exists.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Card>
            <View style={styles.iconRow}>
              <Ionicons name="calendar-outline" size={24} color={NAVY} />
              <Text style={styles.meta}>Date & Time</Text>
            </View>
            <Text style={[styles.meta, styles.marginLeft]}>
              {formatEventDate(event.startsAt)}
            </Text>
            {timeStr ? (
              <Text style={[styles.meta, styles.marginLeft]}>{timeStr}</Text>
            ) : null}
            <View style={styles.iconRow}>
              <Ionicons name="location-outline" size={24} color={NAVY} />
              <Text style={styles.meta}>Location</Text>
            </View>
            <Text style={[styles.meta, styles.marginLeft]}>{event.location ?? ''}</Text>
          </Card>

          <Card>
            <Text style={[styles.header2, styles.blue]}>About This Event</Text>
            <Text style={styles.meta}>{event.description ?? ''}</Text>
          </Card>

          <View style={styles.section}>
            <Card>
              <View style={styles.iconRow}>
                <Ionicons name="people-outline" size={22} color={NAVY} />
                <Text style={[styles.header2, styles.blue]}>RSVP</Text>
                <Text style={styles.rsvpCountInline}>· {rsvpCount} attending</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.idbutton,
                  rsvped && styles.idbuttonActive,
                  eventPast && styles.idbuttonDisabled,
                ]}
                onPress={toggleRsvp}
                disabled={rsvpSaving || eventPast}
              >
                {rsvpSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonTxt}>
                    {eventPast ? 'RSVP Closed' : rsvped ? 'Cancel RSVP' : 'RSVP Now'}
                  </Text>
                )}
              </TouchableOpacity>
              {eventPast ? (
                <Text style={styles.rsvpClosedNote}>This event has already ended.</Text>
              ) : null}
              {rsvpError ? <Text style={styles.rsvpError}>{rsvpError}</Text> : null}
            </Card>
            <TouchableOpacity
              style={styles.checkinbutton}
              onPress={() => router.push('/check-in')}
            >
              <View style={styles.iconRow}>
                <Ionicons name="scan-outline" size={20} color="#fff" />
                <Text style={styles.buttonTxt}>Check in to Event</Text>
              </View>
            </TouchableOpacity>
            {calendarUrl ? (
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => Linking.openURL(calendarUrl)}
              >
                <View style={styles.iconRow}>
                  <Ionicons name="calendar-outline" size={20} color={NAVY} />
                  <Text style={styles.calendarButtonTxt}>Add to Calendar</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  header2: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  blue: {
    color: colors.purple,
  },
  meta: {
    fontSize: 15,
    color: '#333333',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  marginLeft: {
    marginLeft: 32,
  },
  section: {
    marginBottom: 25,
  },
  idbutton: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.purple,
    marginBottom: 10,
    alignItems: 'center',
  },
  idbuttonActive: {
    backgroundColor: '#6b7280',
  },
  idbuttonDisabled: {
    backgroundColor: '#c7c7cc',
  },
  rsvpCountInline: {
    fontSize: 14,
    color: '#666666',
  },
  rsvpClosedNote: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
  rsvpError: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
  checkinbutton: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.purple,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonTxt: {
    color: '#ffffff',
  },
  calendarButton: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: NAVY,
    alignItems: 'center',
  },
  calendarButtonTxt: {
    color: NAVY,
    fontWeight: '600',
  },
});
