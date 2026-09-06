import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { displayName } from '../../types/user';
import type { CheckInDoc } from '../../types/checkIn';
import type { EventDoc } from '../../types/event';
import { calculateAge, formatEventDate, toDate } from '../../utils/date';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../components/theme';

const RED = colors.purple;

// The privacy policy is only hosted on the web deploy; native needs the
// absolute production URL.
const PRIVACY_POLICY_URL = 'https://app.nushpe.org/privacy-policy.html';

type CheckInRow = CheckInDoc & { id: string };

const ProfileScreen = () => {
  const router = useRouter();
  const { user, profile, profileLoading, logout, resetPassword } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pwModal, setPwModal] = useState<'hidden' | 'confirm' | 'sending' | 'sent'>('hidden');
  const [eventsAttended, setEventsAttended] = useState(0);
  const [points, setPoints] = useState(0);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [eventCache, setEventCache] = useState<Record<string, EventDoc>>({});
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setEventsAttended(0);
      setPoints(0);
      setCheckIns([]);
      return;
    }

    const checkInsQuery = query(
      collection(db, 'checkIns'),
      where('userId', '==', user.uid),
    );
    return onSnapshot(
      checkInsQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CheckInRow);
        setCheckIns(rows);
        setEventsAttended(rows.length);
        setPoints(
          rows.reduce((sum, r) => sum + (r.pointsAwarded ?? 0) + (r.checkOutPointsAwarded ?? 0), 0),
        );
      },
      (error) => console.error('Error loading check-ins:', error),
    );
  }, [user]);

  // One-time fetch, not onSnapshot: this modal is opened on-demand and
  // closes, not a persistently-mounted tab, and the primary numbers above
  // already stay live off the checkIns listener untouched — only the
  // supplementary event titles/dates shown in the log are fetched here, and
  // cached for the session so reopening the modal doesn't refetch.
  useEffect(() => {
    if (!historyVisible) return;
    const missingIds = [...new Set(checkIns.map((c) => c.eventId))].filter(
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
          console.error('Error loading event for attendance log:', error);
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
  }, [historyVisible, checkIns, eventCache]);

  const sortedCheckIns = [...checkIns].sort((a, b) => {
    const aTime = toDate(a.checkedInAt)?.getTime() ?? 0;
    const bTime = toDate(b.checkedInAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setPwModal('sending');
    try {
      await resetPassword(user.email);
    } catch (error) {
      // Even on failure we show "sent" — the reset endpoint doesn't reveal
      // account state, and a retry is one tap away.
      console.error('Error sending password reset:', error);
    }
    setPwModal('sent');
  };

  const roleLine =
    [profile?.schoolLevel, profile?.memberId && `ID ${profile.memberId}`]
      .filter(Boolean)
      .join(' · ') || 'Member';

  const age = profile?.birthday ? calculateAge(profile.birthday) : null;

  const detailRows: { icon: any; label: string; value: string }[] = [
    { icon: 'calendar-outline', label: 'Age', value: age != null ? String(age) : '—' },
    { icon: 'male-female-outline', label: 'Sex assigned at birth', value: profile?.sexAtBirth ?? '—' },
    { icon: 'person-outline', label: 'Gender', value: profile?.gender || '—' },
    { icon: 'chatbubble-ellipses-outline', label: 'Pronouns', value: profile?.pronouns || '—' },
    { icon: 'school-outline', label: 'School level', value: profile?.schoolLevel ?? '—' },
    { icon: 'book-outline', label: 'Major', value: profile?.majors?.length ? profile.majors.join(', ') : '—' },
    { icon: 'bookmark-outline', label: 'Minor', value: profile?.minors?.length ? profile.minors.join(', ') : '—' },
    { icon: 'card-outline', label: 'Member ID', value: profile?.memberId || '—' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f7" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          {profileLoading ? (
            <ActivityIndicator size="large" color={RED} />
          ) : (
            <>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={36} color="#fff" />
                </View>
              </View>
              <Text style={styles.userName}>{displayName(profile) || 'Member'}</Text>
              <Text style={styles.userRole}>{roleLine}</Text>
              <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
              {profile?.isAdmin ? (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                  <Text style={styles.adminBadgeText}>Organizer</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => setHistoryVisible(true)}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-clear" size={20} color={RED} />
            </View>
            <Text style={styles.statNumber}>{eventsAttended}</Text>
            <Text style={styles.statLabel}>Events{'\n'}Attended</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statCard} onPress={() => setHistoryVisible(true)}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={20} color={RED} />
            </View>
            <Text style={styles.statNumber}>{points}</Text>
            <Text style={styles.statLabel}>Points{'\n'}Earned</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <Text style={styles.settingsTitle}>Details</Text>
        <View style={[styles.card, styles.settingsCard]}>
          {detailRows.map((row, idx) => (
            <React.Fragment key={row.label}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconWrap}>
                    <Ionicons name={row.icon} size={22} color="#555" />
                  </View>
                  <Text style={styles.settingLabel}>{row.label}</Text>
                </View>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
              {idx < detailRows.length - 1 ? <View style={styles.divider} /> : null}
            </React.Fragment>
          ))}
        </View>

        {/* Settings Section */}
        <Text style={styles.settingsTitle}>Settings</Text>
        <View style={[styles.card, styles.settingsCard]}>
          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/edit-profile')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="create-outline" size={22} color="#555" />
              </View>
              <Text style={styles.settingLabel}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Careers */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/careers')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="briefcase-outline" size={22} color="#555" />
              </View>
              <Text style={styles.settingLabel}>Careers</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications-outline" size={22} color="#555" />
              </View>
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: RED }}
              thumbColor="#fff"
              ios_backgroundColor="#ccc"
            />
          </View>

          <View style={styles.divider} />

          {/* Change password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setPwModal('confirm')}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="key-outline" size={22} color="#555" />
              </View>
              <Text style={styles.settingLabel}>Change password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="lock-closed-outline" size={22} color="#555" />
              </View>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={20} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Sign Out */}
          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="log-out-outline" size={22} color={RED} />
              </View>
              <Text style={[styles.settingLabel, styles.signOutLabel]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bbb" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance History</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {sortedCheckIns.length === 0 ? (
              <Text style={styles.historyEmpty}>
                No check-ins yet — attend an event and scan its QR code to start earning points.
              </Text>
            ) : (
              <ScrollView style={styles.historyList}>
                {eventsLoading ? <ActivityIndicator style={{ marginBottom: 12 }} color={RED} /> : null}
                {sortedCheckIns.map((row) => {
                  const ev = eventCache[row.eventId];
                  const rowPoints = (row.pointsAwarded ?? 0) + (row.checkOutPointsAwarded ?? 0);
                  return (
                    <TouchableOpacity
                      key={row.id}
                      style={styles.historyRow}
                      disabled={!ev}
                      onPress={() => {
                        setHistoryVisible(false);
                        router.push(`/events-info/${row.eventId}`);
                      }}
                    >
                      <View style={styles.historyRowText}>
                        <Text style={styles.historyEventTitle} numberOfLines={1}>
                          {ev?.title ?? (eventsLoading ? 'Loading…' : 'Event unavailable')}
                        </Text>
                        <Text style={styles.historyEventDate}>
                          {formatEventDate(ev?.startsAt ?? row.checkedInAt)}
                        </Text>
                      </View>
                      <View style={styles.historyRowRight}>
                        <Text style={styles.historyPoints}>+{rowPoints} pts</Text>
                        {ev ? <Ionicons name="chevron-forward" size={16} color="#bbb" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={pwModal !== 'hidden'}
        animationType="fade"
        transparent
        onRequestClose={() => setPwModal('hidden')}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pwSheet}>
            {pwModal === 'sent' ? (
              <>
                <Text style={styles.pwTitle}>Check your inbox</Text>
                <Text style={styles.pwBody}>
                  We sent a password reset link to{'\n'}
                  <Text style={styles.pwEmail}>{user?.email}</Text>. Open it to set
                  a new password, then log in again.
                </Text>
                <TouchableOpacity
                  style={styles.pwPrimary}
                  onPress={() => setPwModal('hidden')}
                >
                  <Text style={styles.pwPrimaryText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.pwTitle}>Change password</Text>
                <Text style={styles.pwBody}>
                  We&rsquo;ll email a reset link to{'\n'}
                  <Text style={styles.pwEmail}>{user?.email}</Text>.
                </Text>
                <TouchableOpacity
                  style={styles.pwPrimary}
                  onPress={handleSendPasswordReset}
                  disabled={pwModal === 'sending'}
                >
                  {pwModal === 'sending' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.pwPrimaryText}>Send reset link</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pwCancel}
                  onPress={() => setPwModal('hidden')}
                  disabled={pwModal === 'sending'}
                >
                  <Text style={styles.pwCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Shared card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },

  // Profile
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 24,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purpleTint,
    borderWidth: 2,
    borderColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Settings
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    alignItems: 'stretch',
    padding: 0,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: '#111',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#555',
    maxWidth: 160,
    textAlign: 'right',
  },
  signOutLabel: {
    color: RED,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginLeft: 44,
  },

  // Attendance history modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  historyEmpty: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  historyList: {
    flexGrow: 0,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  historyRowText: {
    flex: 1,
    marginRight: 12,
  },
  historyEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  historyEventDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  historyPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: RED,
  },
  historyRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Change-password modal
  pwSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  pwTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  pwBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
  pwEmail: {
    fontWeight: '700',
    color: '#111',
  },
  pwPrimary: {
    backgroundColor: RED,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pwCancel: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  pwCancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ProfileScreen;
