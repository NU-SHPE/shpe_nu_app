import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { formatEventDate, formatTimeRange, isEventPast } from '../../utils/date';
import { useNow } from '../../hooks/useNow';

export default function EventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set());
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [pastExpanded, setPastExpanded] = useState(false);
  const now = useNow();

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

  useEffect(() => {
    if (!user) {
      setMyEventIds(new Set());
      return;
    }
    const q = query(collection(db, 'rsvps'), where('userId', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => setMyEventIds(new Set(snapshot.docs.map((d) => d.data().eventId))),
      (error) => console.error('Error loading your RSVPs:', error),
    );
  }, [user]);

  const visibleEvents = showMineOnly ? events.filter((ev) => myEventIds.has(ev.id)) : events;

  const upcoming = useMemo(
    () => visibleEvents.filter((ev) => !isEventPast(ev, now)),
    [visibleEvents, now],
  );
  // Source query is orderBy('startsAt','asc'), so reversing the past slice
  // gives most-recent-first without a second sort pass.
  const past = useMemo(
    () => [...visibleEvents.filter((ev) => isEventPast(ev, now))].reverse(),
    [visibleEvents, now],
  );

  const renderEventCard = (ev: any) => {
    const timeStr = formatTimeRange(ev.startsAt, ev.endsAt);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/events-info/${ev.id}`)}
      >
        <Text style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Text>
        <Text style={styles.title}>{ev.title ?? 'Untitled Event'}</Text>
        <View style={styles.iconRow}>
          <Ionicons name="calendar-outline" size={16} color="#636363" />
          <Text style={styles.info}>
            {formatEventDate(ev.startsAt)}{timeStr ? ` · ${timeStr}` : ''}
          </Text>
        </View>
        <View style={styles.iconRow}>
          <Ionicons name="location-outline" size={16} color="#636363" />
          <Text style={styles.info}>{ev.location ?? ''}</Text>
        </View>
        <Text style={styles.desc}>{ev.description ?? ''}</Text>
      </TouchableOpacity>
    );
  };

  const sections = [
    { key: 'upcoming', data: upcoming },
    { key: 'past', data: pastExpanded ? past : [] },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="Upcoming Events" />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !showMineOnly && styles.filterChipActive]}
          onPress={() => setShowMineOnly(false)}
        >
          <Text style={[styles.filterChipText, !showMineOnly && styles.filterChipTextActive]}>
            All Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showMineOnly && styles.filterChipActive]}
          onPress={() => setShowMineOnly(true)}
        >
          <Text style={[styles.filterChipText, showMineOnly && styles.filterChipTextActive]}>
            Your RSVPs
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#D40032" />
        </View>
      ) : (
        <SectionList
          style={styles.scroll}
          contentContainerStyle={styles.eventList}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          renderItem={({ item }) => renderEventCard(item)}
          renderSectionHeader={({ section }) => {
            if (section.key === 'upcoming') {
              if (upcoming.length > 0) return null;
              return (
                <Text style={[styles.desc, { marginHorizontal: 20 }]}>
                  {showMineOnly ? "You haven't RSVPed to any events yet." : 'No upcoming events.'}
                </Text>
              );
            }
            return (
              <View style={styles.pastSection}>
                <CollapsibleSection
                  title="Past Events"
                  count={past.length}
                  expanded={pastExpanded}
                  onToggle={() => setPastExpanded(!pastExpanded)}
                />
              </View>
            );
          }}
        />
      )}
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

  pastSection: {
    marginHorizontal: 20,
    marginTop: 4,
  },

  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  filterChipActive: {
    backgroundColor: '#001E62',
    borderColor: '#001E62',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636363',
  },

  filterChipTextActive: {
    color: '#fff',
  },
});
