import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';
import { PageHeader } from '../../components/PageHeader';

const minicalendarIcon = require('../../assets/images/mini-calendarIcon.png');
const minilocationIcon = require('../../assets/images/mini-locationIcon.png');

export default function EventPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <View style={styles.container}>
      <PageHeader title="Upcoming Events" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.eventList}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#D40032" />
          </View>
        ) : events.length === 0 ? (
          <Text style={[styles.desc, { marginHorizontal: 20 }]}>No upcoming events.</Text>
        ) : (
          events.map((ev) => {
            const timeParts = [ev.startTime, ev.endTime].filter(Boolean);
            const timeStr = timeParts.length > 0 ? timeParts.join(' – ') : '';
            return (
              <TouchableOpacity
                key={ev.id}
                style={styles.card}
                onPress={() => router.push(`/events-info/${ev.id}`)}
              >
                <Text style={styles.arrow}>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </Text>
                <Text style={styles.title}>{ev.title ?? 'Untitled Event'}</Text>
                <View style={styles.iconRow}>
                  <Image source={minicalendarIcon} style={styles.smallIcon} />
                  <Text style={styles.info}>
                    {ev.date ?? ''}{timeStr ? ` · ${timeStr}` : ''}
                  </Text>
                </View>
                <View style={styles.iconRow}>
                  <Image source={minilocationIcon} style={styles.smallIcon} />
                  <Text style={styles.info}>{ev.location ?? ''}</Text>
                </View>
                <Text style={styles.desc}>{ev.description ?? ''}</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F2F2F2',
  },

  eventList: {
    paddingTop: 20,
    paddingBottom: 40,
  },

  loadingBox: {
    flexGrow: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },

  arrow: {
    position: 'absolute',
    top: 15,
    right: 15,
    fontSize: 24,
    color: '#D40032',
  },

  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'navy',
    marginBottom: 6,
  },

  info: {
    fontSize: 14,
    color: '#636363',
    marginBottom: 3,
    textAlign: 'center',
  },

  desc: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },

  scroll: {
    flex: 1,
  },

  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },

  smallIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
});
