import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { ActionButton } from '../../components/ActionButton';
import { colors } from '../../components/theme';

/**
 * Officer tools hub — just the entry points. Event management (QR codes, edit,
 * attendance count) lives on the event detail page now, gated by role, so
 * there's one events list in the app instead of two.
 */
export default function OrganizerScreen() {
  const router = useRouter();
  const { profile, profileLoading } = useAuth();

  const canAccessOrganizer = profile?.isAdmin === true || profile?.isExec === true;

  if (!profileLoading && profile && !canAccessOrganizer) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="lock-closed-outline" size={48} color="#888" />
        <Text style={styles.noAccessTitle}>Organizer access required</Text>
        <Text style={styles.noAccessBody}>
          Only SHPE organizers can use these tools.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Organizer"
        subtitle="Create events and announcements — manage an event from its own page"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
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
        </View>

        {profile?.isAdmin === true ? (
          <View style={styles.row}>
            <ActionButton
              icon="people-circle"
              label="Manage Users"
              onPress={() => router.push('/organizer/manage-users')}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
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
