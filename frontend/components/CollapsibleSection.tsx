import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing } from './theme';

interface Props {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Header chrome only — title, count badge, chevron. Both consumers
 * (events.tsx, organizer.tsx) render this via SectionList's
 * renderSectionHeader; the section's own `data` array controls whether rows
 * actually render (empty when collapsed), so this component doesn't wrap or
 * hide children itself — just the toggle control.
 */
export function CollapsibleSection({ title, count, expanded, onToggle }: Props) {
  if (count === 0) return null;

  return (
    <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </View>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={20}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: '700',
    color: colors.purple,
  },
  badge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.label,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
