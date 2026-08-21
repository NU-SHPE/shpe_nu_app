import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing } from './theme';

interface Props {
  title: string;
  count: number;
  /** Starting state when uncontrolled. Defaults closed — that's the point. */
  defaultExpanded?: boolean;
  /** Pass both to control expansion from the parent (e.g. to trigger a fetch on first open). */
  expanded?: boolean;
  onToggle?: (next: boolean) => void;
  children: React.ReactNode;
}

/**
 * Toggle chrome only — title, count badge, chevron. Item rendering stays with
 * the caller: events.tsx and organizer.tsx render different card shapes, so a
 * renderItem prop would just be indirection over passing children.
 */
export function CollapsibleSection({
  title,
  count,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  children,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? internalExpanded;

  const toggle = () => {
    const next = !expanded;
    if (onToggle) onToggle(next);
    if (controlledExpanded === undefined) setInternalExpanded(next);
  };

  if (count === 0) return null;

  return (
    <View>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
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
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
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
    color: colors.navy,
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
  content: {
    marginTop: spacing.xs,
  },
});
