import React, { useMemo } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from './theme';

/** Minutes between options. 15 gives 96 choices across the day. */
const STEP_MINUTES = 15;
const ROW_HEIGHT = 48;
/**
 * The list starts here instead of midnight, so it opens on a reasonable
 * hour for a college event and wraps around through the night at the end —
 * same 96 options, just rotated so evening times aren't a long scroll away.
 */
const START_HOUR = 6;

interface Props {
  visible: boolean;
  /** Currently selected time as `HH:MM`, or '' for none. */
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  title?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `17:00` → `5:00 PM`. Stored 24-hour, shown 12-hour. */
export const formatTimeLabel = (value: string): string => {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${suffix}`;
};

const buildTimes = (): string[] => {
  const out: string[] = [];
  const startMinutes = START_HOUR * 60;
  const totalSlots = (24 * 60) / STEP_MINUTES;
  for (let i = 0; i < totalSlots; i++) {
    const minutes = (startMinutes + i * STEP_MINUTES) % (24 * 60);
    out.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  return out;
};

/**
 * Tap-to-pick time list. Typing times was the old approach and it let people
 * enter "5:00 PM" into a field that only parsed "17:00" — a whole class of bug
 * that disappears when the value can't be typed.
 */
export function TimeSelect({ visible, value, onSelect, onClose, title }: Props) {
  const times = useMemo(buildTimes, []);
  const selectedIndex = Math.max(0, times.indexOf(value));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title ?? 'Pick a time'}</Text>

          <FlatList
            data={times}
            keyExtractor={(item) => item}
            style={styles.list}
            initialScrollIndex={selectedIndex}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            renderItem={({ item }) => {
              const isSelected = item === value;
              return (
                <TouchableOpacity
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                    {formatTimeLabel(item)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    width: '100%',
    maxWidth: 340,
    maxHeight: '75%',
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.purple,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  rowSelected: {
    backgroundColor: colors.purple,
  },
  rowText: {
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: 'center',
  },
  rowTextSelected: {
    color: colors.onPurple,
    fontWeight: '700',
  },
  cancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
