import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { categoryLabel } from '../../types/event';
import { formatEventDate, formatTimeRange, isEventPast } from '../../utils/date';
import { useNow } from '../../hooks/useNow';

function PastEventCard({
  ev,
  isAdmin,
  canManage,
  count,
  onNeedCount,
  onEdit,
}: {
  ev: any;
  isAdmin: boolean;
  canManage: boolean;
  count: number | undefined;
  onNeedCount: (eventId: string) => void;
  onEdit: () => void;
}) {
  useEffect(() => {
    if (isAdmin && count === undefined) onNeedCount(ev.id);
  }, [ev.id, isAdmin, count]);

  const timeStr = formatTimeRange(ev.startsAt, ev.endsAt);
  const category = categoryLabel(ev.category);

  return (
    <View style={[styles.card, styles.pastCard]}>
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
      <View style={styles.pastCardActions}>
        {isAdmin ? (
          <View style={styles.attendanceBadge}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={styles.attendanceBadgeText}>{count === undefined ? '…' : count}</Text>
          </View>
        ) : null}
        {canManage ? (
          <TouchableOpacity
            style={[styles.qrButton, styles.qrButtonEdit, styles.pastEditButton]}
            onPress={onEdit}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function OrganizerScreen() {
  const router = useRouter();
  const { user, profile, profileLoading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const now = useNow();

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
  // Admin manages every event; exec only the ones they created themselves —
  // mirrors the ownership check in firestore.rules' events update/delete rule.
  const canManageEvent = (ev: any) => profile?.isAdmin === true || ev.createdBy === user?.uid;

  const activeEvents = useMemo(
    () => events.filter((ev) => !isEventPast(ev, now)),
    [events, now],
  );
  // Source query is orderBy('startsAt','asc'), so reversing gives
  // most-recent-first without a second sort pass.
  const pastEvents = useMemo(
    () => [...events.filter((ev) => isEventPast(ev, now))].reverse(),
    [events, now],
  );

  // Lazy, aggregation-based, and admin-only: firestore.rules only grants
  // checkIns read to isAdmin(), not isExec(). Each past card requests its
  // own count on mount (see PastEventCard below) instead of the parent
  // firing every query at once on expand — SectionList only mounts the
  // visible window regardless of how many past events exist in total, so
  // the read count tracks what's actually scrolled into view. The in-flight
  // guard stops a row re-rendering mid-fetch from firing a duplicate
  // request for the same event; the cache itself lives here so a recycled
  // (unmounted then remounted) row doesn't refetch what it already has.
  const inFlightRef = useRef<Set<string>>(new Set());
  const requestAttendanceCount = (eventId: string) => {
    if (inFlightRef.current.has(eventId)) return;
    inFlightRef.current.add(eventId);
    getCountFromServer(query(collection(db, 'checkIns'), where('eventId', '==', eventId)))
      .then((snap) => {
        setAttendanceCounts((prev) => ({ ...prev, [eventId]: snap.data().count }));
      })
      .catch((error) => {
        console.error('Error loading attendance count:', error);
      })
      .finally(() => {
        inFlightRef.current.delete(eventId);
      });
  };

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

  const sections = [
    { key: 'active', data: activeEvents },
    { key: 'past', data: pastExpanded ? pastEvents : [] },
  ];

  return (
    <View style={styles.container}>
      <PageHeader
        title="Organizer"
        subtitle="Show the check-in code when an event starts, check-out when it ends"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D50032" />
        </View>
      ) : (
        <SectionList
          contentContainerStyle={styles.scrollContent}
          stickySectionHeadersEnabled={false}
          keyExtractor={(item) => item.id}
          sections={sections}
          ListHeaderComponent={
            <View style={styles.actionsRow}>
              <ActionButton
                icon="add-circle"
                label="Create Event"
                onPress={() => router.push('/organizer/create-event')}
              />
              <ActionButton
                icon="megaphone"
                label="Post Announcement"
                onPress={() => router.push('/organizer/create-announcement')}
              />
              {profile?.isAdmin === true ? (
                <ActionButton
                  icon="people-circle"
                  label="Manage Users"
                  onPress={() => router.push('/organizer/manage-users')}
                />
              ) : (
                <View style={styles.actionSpacer} />
              )}
            </View>
          }
          renderSectionHeader={({ section }) => {
            if (section.key === 'active') {
              return (
                <>
                  <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  {activeEvents.length === 0 ? (
                    <Text style={styles.emptyText}>No events yet.</Text>
                  ) : null}
                </>
              );
            }
            return (
              <View style={styles.pastSection}>
                <CollapsibleSection
                  title="Past Events"
                  count={pastEvents.length}
                  expanded={pastExpanded}
                  onToggle={() => setPastExpanded(!pastExpanded)}
                />
              </View>
            );
          }}
          renderItem={({ item: ev, section }) => {
            if (section.key === 'past') {
              return (
                <PastEventCard
                  ev={ev}
                  isAdmin={profile?.isAdmin === true}
                  canManage={canManageEvent(ev)}
                  count={attendanceCounts[ev.id]}
                  onNeedCount={requestAttendanceCount}
                  onEdit={() => router.push(`/organizer/edit-event/${ev.id}`)}
                />
              );
            }

            const timeStr = formatTimeRange(ev.startsAt, ev.endsAt);
            const category = categoryLabel(ev.category);
            return (
              <View style={styles.card}>
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

                  {canManageEvent(ev) ? (
                    <TouchableOpacity
                      style={[styles.qrButton, styles.qrButtonEdit]}
                      onPress={() => router.push(`/organizer/edit-event/${ev.id}`)}
                    >
                      <Ionicons name="pencil" size={20} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </View>
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
  qrButtonEdit: {
    backgroundColor: '#6b7280',
  },
  pastSection: {
    marginTop: 4,
  },
  pastCard: {
    opacity: 0.85,
  },
  pastCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 0,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attendanceBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
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
