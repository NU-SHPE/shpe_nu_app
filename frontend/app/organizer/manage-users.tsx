import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../components/theme';
import { displayName, type UserProfile } from '../../types/user';
import type { CheckInDoc } from '../../types/checkIn';
import type { EventDoc } from '../../types/event';
import { calculateAge, formatEventDate, toDate } from '../../utils/date';

type UserRow = UserProfile & { id: string };
type CheckInRow = CheckInDoc & { id: string };

export default function ManageUsersScreen() {
  const router = useRouter();
  const { profile, profileLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Bulk read, grouped client-side: isAdmin() can already read every checkIns
  // doc (see firestore.rules), this is just the first screen that actually
  // uses that permission chapter-wide. A per-member point *total* needs the
  // real pointsAwarded/checkOutPointsAwarded fields summed, not a count, so
  // an aggregation query (getCountFromServer, used on the organizer screen)
  // can't answer this — it only counts docs, it can't sum a field. One query
  // for the whole collection is cheaper than one query per member.
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [eventCache, setEventCache] = useState<Record<string, EventDoc>>({});
  const [eventsLoading, setEventsLoading] = useState(false);

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

  useEffect(() => {
    return onSnapshot(
      collection(db, 'checkIns'),
      (snapshot) => {
        setCheckIns(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CheckInRow));
      },
      (error) => console.error('Error loading check-ins:', error),
    );
  }, []);

  const checkInsByUser = useMemo(() => {
    const map = new Map<string, CheckInRow[]>();
    for (const c of checkIns) {
      const list = map.get(c.userId) ?? [];
      list.push(c);
      map.set(c.userId, list);
    }
    return map;
  }, [checkIns]);

  const pointsByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const [userId, rows] of checkInsByUser) {
      const total = rows.reduce((sum, r) => sum + (r.pointsAwarded ?? 0) + (r.checkOutPointsAwarded ?? 0), 0);
      map.set(userId, total);
    }
    return map;
  }, [checkInsByUser]);

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => (displayName(u) || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q),
    );
  }, [users, searchText]);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
  const selectedCheckIns = selectedUserId ? (checkInsByUser.get(selectedUserId) ?? []) : [];
  const sortedSelectedCheckIns = [...selectedCheckIns].sort((a, b) => {
    const aTime = toDate(a.checkedInAt)?.getTime() ?? 0;
    const bTime = toDate(b.checkedInAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  // Same one-time-fetch exception as the profile page's attendance modal:
  // opened on-demand, closes, and only fetches event titles/dates missing
  // from the cache — the point totals above stay live off the onSnapshot
  // listener untouched.
  useEffect(() => {
    if (!selectedUserId) return;
    const missingIds = [...new Set(selectedCheckIns.map((c) => c.eventId))].filter(
      (id) => !(id in eventCache),
    );
    if (missingIds.length === 0) return;

    setEventsLoading(true);
    Promise.all(
      missingIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'events', id));
          return snap.exists() ? ([id, snap.data() as EventDoc] as const) : null;
        } catch (error) {
          console.error('Error loading event for member detail:', error);
          return null;
        }
      }),
    ).then((results) => {
      setEventCache((prev) => {
        const next = { ...prev };
        for (const result of results) {
          if (result) next[result[0]] = result[1];
        }
        return next;
      });
      setEventsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, selectedCheckIns.length]);

  if (!profileLoading && profile && profile.isAdmin !== true) {
    return (
      <View style={styles.container}>
        <PageHeader title="Manage Users" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only admins can manage users.</Text>
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

  const selectedAge = selectedUser?.birthday ? calculateAge(selectedUser.birthday) : null;

  return (
    <View style={styles.container}>
      <PageHeader
        title="Manage Users"
        subtitle="Tap a member for their full profile and attendance history"
        onBack={() => router.back()}
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor={colors.textFaint}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <Text style={styles.emptyText}>No members found.</Text>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item: row }) => (
            <View style={styles.card}>
              <TouchableOpacity style={styles.info} onPress={() => setSelectedUserId(row.id)}>
                <Text style={styles.name}>{displayName(row) || row.email}</Text>
                <Text style={styles.email}>{row.email}</Text>
                <Text style={styles.major}>{row.majors?.length ? row.majors.join(', ') : '—'}</Text>
                <View style={styles.pointsRow}>
                  <Ionicons name="trophy" size={12} color={colors.red} />
                  <Text style={styles.points}>{pointsByUser.get(row.id) ?? 0} pts</Text>
                </View>
                {row.isAdmin ? <Text style={styles.adminBadge}>Admin</Text> : null}
              </TouchableOpacity>
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
          )}
        />
      )}

      <Modal
        visible={selectedUser != null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedUserId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedUser ? displayName(selectedUser) : ''}</Text>
              <TouchableOpacity onPress={() => setSelectedUserId(null)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedUser ? (
              <FlatList
                data={sortedSelectedCheckIns}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                  <View style={styles.detailSection}>
                    <View style={styles.detailPointsRow}>
                      <Ionicons name="trophy" size={18} color={colors.red} />
                      <Text style={styles.detailPoints}>
                        {pointsByUser.get(selectedUser.id) ?? 0} total points
                      </Text>
                    </View>
                    {[
                      ['Email', selectedUser.email],
                      ['Age', selectedAge != null ? String(selectedAge) : '—'],
                      ['Sex assigned at birth', selectedUser.sexAtBirth ?? '—'],
                      ['Gender', selectedUser.gender || '—'],
                      ['Pronouns', selectedUser.pronouns || '—'],
                      ['School level', selectedUser.schoolLevel ?? '—'],
                      ['Major', selectedUser.majors?.length ? selectedUser.majors.join(', ') : '—'],
                      ['Minor', selectedUser.minors?.length ? selectedUser.minors.join(', ') : '—'],
                      ['Member ID', selectedUser.memberId || '—'],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                    <Text style={styles.historyTitle}>Attendance History</Text>
                    {sortedSelectedCheckIns.length === 0 ? (
                      <Text style={styles.historyEmpty}>No check-ins yet.</Text>
                    ) : eventsLoading ? (
                      <ActivityIndicator style={{ marginBottom: 8 }} color={colors.red} />
                    ) : null}
                  </View>
                }
                renderItem={({ item: row }) => {
                  const ev = eventCache[row.eventId];
                  const rowPoints = (row.pointsAwarded ?? 0) + (row.checkOutPointsAwarded ?? 0);
                  return (
                    <View style={styles.historyRow}>
                      <View style={styles.historyRowText}>
                        <Text style={styles.historyEventTitle} numberOfLines={1}>
                          {ev?.title ?? (eventsLoading ? 'Loading…' : 'Event unavailable')}
                        </Text>
                        <Text style={styles.historyEventDate}>
                          {formatEventDate(ev?.startsAt ?? row.checkedInAt)}
                        </Text>
                      </View>
                      <Text style={styles.historyPoints}>+{rowPoints} pts</Text>
                    </View>
                  );
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
  },
  listContent: {
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
  major: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  points: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
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

  // Detail modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  detailSection: {
    marginBottom: spacing.sm,
  },
  detailPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  historyEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyRowText: {
    flex: 1,
    marginRight: 12,
  },
  historyEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyEventDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.red,
  },
});
