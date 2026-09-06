import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import * as WebBrowser from 'expo-web-browser';
import { db, storage } from '../../firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { colors, fontSize, radius, spacing } from '../../components/theme';
import { displayName, formatGradTerm, type UserProfile } from '../../types/user';
import { formatEventDate } from '../../utils/date';
import { isResumeStale, resumeStoragePath, type ResumeDoc } from '../../types/resume';

type Row = ResumeDoc & { id: string; user: UserProfile | undefined; name: string; email: string };

const csvCell = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const buildCsv = (rows: Row[]): string => {
  const header = [
    'Name', 'Email', 'Graduation', 'School level', 'Majors', 'Seeking',
    'Work authorized in US', 'Needs visa sponsorship', 'Resume updated',
  ];
  const body = rows.map((r) =>
    [
      r.name,
      r.email,
      formatGradTerm(r.user?.gradTerm),
      r.user?.schoolLevel ?? '',
      (r.user?.majors ?? []).join('; '),
      (r.user?.seeking ?? []).join('; '),
      r.user?.workAuthorized ?? '',
      r.user?.needsSponsorship ?? '',
      r.updatedAt ? formatEventDate(r.updatedAt) : '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.map(csvCell).join(','), ...body].join('\n');
};

/** Web downloads a file; native shares the CSV text (no extra deps). */
const exportCsv = async (csv: string) => {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-book-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: csv });
  }
};

/**
 * Admin-only. Lists every member who's uploaded a resume and opens the PDF.
 * Read access is `self or isAdmin` in both firestore.rules and storage.rules,
 * matching the `users` doc rule — exec can't get here.
 */
export default function ResumeBookScreen() {
  const router = useRouter();
  const { profile, profileLoading } = useAuth();
  const [resumes, setResumes] = useState<(ResumeDoc & { id: string })[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = profile?.isAdmin === true;

  useEffect(() => {
    if (!isAdmin) return;
    const unsubResumes = onSnapshot(
      collection(db, 'resumes'),
      (snap) => {
        setResumes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ResumeDoc) })));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading resumes:', err);
        setLoading(false);
      },
    );
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const map: Record<string, UserProfile> = {};
        snap.docs.forEach((d) => (map[d.id] = d.data() as UserProfile));
        setUsers(map);
      },
      (err) => console.error('Error loading members:', err),
    );
    return () => {
      unsubResumes();
      unsubUsers();
    };
  }, [isAdmin]);

  const rows: Row[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resumes
      .map((r) => {
        const u = users[r.userId];
        return {
          ...r,
          user: u,
          name: u ? displayName(u) : 'Unknown member',
          email: u?.email ?? '',
        };
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resumes, users, search]);

  const open = async (row: Row) => {
    setOpeningId(row.id);
    try {
      const url = await getDownloadURL(ref(storage, resumeStoragePath(row.userId)));
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error('Error opening resume:', err);
    } finally {
      setOpeningId(null);
    }
  };

  if (!profileLoading && profile && !isAdmin) {
    return (
      <View style={styles.container}>
        <PageHeader title="Resume Book" onBack={() => router.back()} />
        <Text style={styles.noAccess}>Only admins can view the resume book.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Resume Book"
        subtitle="Members who've uploaded a resume"
        onBack={() => router.back()}
      />

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
        {rows.length > 0 ? (
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => exportCsv(buildCsv(rows))}
          >
            <Ionicons name="download-outline" size={16} color={colors.purple} />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.exportNote}>
        CSV has names, majors, graduation, seeking and work-auth — not the resume files.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.purple} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {resumes.length === 0
                ? 'No resumes yet. Members add theirs from the Profile tab.'
                : 'No members match that search.'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => open(item)}
              disabled={openingId === item.id}
            >
              <View style={styles.rowText}>
                <View style={styles.rowNameLine}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {isResumeStale(item.updatedAt) ? (
                    <View style={styles.staleBadge}>
                      <Text style={styles.staleBadgeText}>stale</Text>
                    </View>
                  ) : null}
                </View>
                {item.user?.gradTerm || item.user?.seeking?.length ? (
                  <Text style={styles.rowTags} numberOfLines={1}>
                    {[
                      formatGradTerm(item.user?.gradTerm) || null,
                      item.user?.seeking?.join(', ') || null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.fileName}
                  {item.updatedAt ? ` · ${formatEventDate(item.updatedAt)}` : ''}
                </Text>
              </View>
              {openingId === item.id ? (
                <ActivityIndicator size="small" color={colors.purple} />
              ) : (
                <Ionicons name="open-outline" size={20} color={colors.purple} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  noAccess: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: fontSize.body,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.purple,
    backgroundColor: colors.card,
  },
  exportText: {
    color: colors.purple,
    fontWeight: '700',
    fontSize: fontSize.label,
  },
  exportNote: {
    color: colors.textFaint,
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staleBadge: {
    backgroundColor: '#fdecea',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  staleBadgeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowTags: {
    fontSize: fontSize.label,
    color: colors.purple,
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowName: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.text,
  },
  rowMeta: {
    fontSize: fontSize.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: fontSize.body,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
});
