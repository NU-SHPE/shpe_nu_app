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
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from '../../../components/Card';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { formatEventDate, formatTimeRange } from '../../../utils/date';
import { PageHeader } from '../../../components/PageHeader';

const NAVY = '#001E62';

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

  const toggleRsvp = async () => {
    if (!user || !id) return;
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

  return (
    <>
      <PageHeader
        title={loading ? '' : event?.title ?? 'Event not found'}
        onBack={() => router.push('/(tabs)/events')}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#D50032" />
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
                style={[styles.idbutton, rsvped && styles.idbuttonActive]}
                onPress={toggleRsvp}
                disabled={rsvpSaving}
              >
                {rsvpSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonTxt}>{rsvped ? 'Cancel RSVP' : 'RSVP Now'}</Text>
                )}
              </TouchableOpacity>
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
    color: '#001E62',
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
    backgroundColor: '#001E62',
    marginBottom: 10,
    alignItems: 'center',
  },
  idbuttonActive: {
    backgroundColor: '#6b7280',
  },
  rsvpCountInline: {
    fontSize: 14,
    color: '#666666',
  },
  rsvpError: {
    color: '#D50032',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
  checkinbutton: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#D50032',
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonTxt: {
    color: '#ffffff',
  },
});
