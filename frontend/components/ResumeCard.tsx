import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from './theme';
import { formatEventDate } from '../utils/date';
import { useMyResume } from '../hooks/useMyResume';
import { isResumeStale } from '../types/resume';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * The member's own resume, shown on the Profile screen. Upload a PDF once and
 * it's in the resume book; officers (isAdmin) can see it, nobody else. Replace
 * or remove any time.
 */
export function ResumeCard() {
  const { resume, loading, busy, error, pickAndUpload, remove, getUrl } = useMyResume();

  const open = async () => {
    const url = await getUrl();
    if (url) await WebBrowser.openBrowserAsync(url);
  };

  const stale = resume ? isResumeStale(resume.updatedAt) : false;

  return (
    <>
      <Text style={styles.sectionTitle}>Resume</Text>
      <View style={[styles.card, styles.body]}>
        {loading ? (
          <ActivityIndicator color={colors.purple} />
        ) : resume ? (
          <>
            <View style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={22} color={colors.purple} />
              <View style={styles.fileText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {resume.fileName}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatSize(resume.size)}
                  {resume.updatedAt ? ` · updated ${formatEventDate(resume.updatedAt)}` : ''}
                </Text>
              </View>
            </View>

            {stale ? (
              <Text style={styles.staleNote}>
                This resume is over 6 months old — replace it with a current version.
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={open}
                disabled={busy !== 'idle'}
              >
                {busy === 'opening' ? (
                  <ActivityIndicator size="small" color={colors.purple} />
                ) : (
                  <Text style={styles.actionText}>View</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={pickAndUpload}
                disabled={busy !== 'idle'}
              >
                {busy === 'uploading' || busy === 'picking' ? (
                  <ActivityIndicator size="small" color={colors.purple} />
                ) : (
                  <Text style={styles.actionText}>Replace</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={remove}
                disabled={busy !== 'idle'}
              >
                {busy === 'removing' ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.emptyText}>
              Add your resume so chapter officers can share it with recruiters and
              partner companies. PDF, up to 5 MB. Only officers can see it.
            </Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickAndUpload}
              disabled={busy !== 'idle'}
            >
              {busy === 'uploading' || busy === 'picking' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadText}>Upload PDF</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  body: {
    padding: 16,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileText: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  fileMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  staleNote: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple,
  },
  removeText: {
    color: colors.danger,
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 14,
  },
  uploadBtn: {
    backgroundColor: colors.purple,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
});
