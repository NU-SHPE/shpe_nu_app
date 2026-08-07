import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from '../../../components/Card';
import { db } from '../../../firebaseConfig';

const attendanceIcon = require('../../../assets/images/attendanceIcon.png');
const calendarIcon = require('../../../assets/images/calendarIcon.png');
const checkinIcon = require('../../../assets/images/checkinIcon.png');
const locationIcon = require('../../../assets/images/locationIcon.png');
const rsvpIcon = require('../../../assets/images/rsvpIcon.png');

export default function EventInfo() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const timeParts = [event?.startTime, event?.endTime].filter(Boolean);
  const timeStr = timeParts.length > 0 ? timeParts.join(' – ') : '';

  return (
    <>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/events')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerSubtitle}>Back to Events!</Text>
        </View>
        <Text style={styles.headerTitle}>
          {loading ? '' : event?.title ?? 'Event not found'}
        </Text>
      </View>

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
              <Image source={calendarIcon} style={styles.medIcon} />
              <Text style={styles.meta}>Date & Time</Text>
            </View>
            <Text style={[styles.meta, styles.marginLeft]}>{event.date ?? ''}</Text>
            {timeStr ? (
              <Text style={[styles.meta, styles.marginLeft]}>{timeStr}</Text>
            ) : null}
            <View style={styles.iconRow}>
              <Image source={locationIcon} style={styles.medIcon} />
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
                <Image source={rsvpIcon} style={styles.smallIcon} />
                <Text style={[styles.header2, styles.blue]}>RSVP</Text>
                <Image source={attendanceIcon} style={styles.smallIcon} />
              </View>
              {/* TODO: RSVP is not backed by Firestore yet — no rsvps collection exists. */}
              <TouchableOpacity
                style={styles.idbutton}
                onPress={() =>
                  Alert.alert('RSVP', 'RSVP is not available yet — check in at the event instead.')
                }
              >
                <Text style={styles.buttonTxt}>RSVP Now</Text>
              </TouchableOpacity>
            </Card>
            <TouchableOpacity
              style={styles.checkinbutton}
              onPress={() => router.push('/check-in')}
            >
              <View style={styles.iconRow}>
                <Image source={checkinIcon} style={styles.smallIcon} />
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
  header: {
    backgroundColor: '#001E62',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    flexDirection: 'column',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#D50032',
    fontSize: 32,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 15,
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
    marginLeft: 48,
  },
  medIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  smallIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
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
