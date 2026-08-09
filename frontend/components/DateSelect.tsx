import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, radius, spacing } from './theme';
import { toDateInput } from '../utils/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  /** Currently selected date as `YYYY-MM-DD`, or '' for none. */
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

/**
 * Month-grid calendar. Built here rather than using a native picker so web and
 * phone behave identically — the community date picker has no usable web build,
 * which is what left browsers with a text field nobody could type correctly.
 */
export function DateSelect({ visible, value, onSelect, onClose }: Props) {
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const initial = selected ?? new Date();

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const today = new Date();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const dayCount = daysInMonth(year, month);

  const step = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step(-1)} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.navy} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity onPress={() => step(1)} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={colors.navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>
                {day}
              </Text>
            ))}

            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <View key={`blank-${index}`} style={styles.cell} />
            ))}

            {Array.from({ length: dayCount }).map((_, index) => {
              const day = index + 1;
              const date = new Date(year, month, day);
              const isSelected = selected ? isSameDate(date, selected) : false;
              const isToday = isSameDate(date, today);

              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => {
                    onSelect(toDateInput(date));
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textFaint,
    marginBottom: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: colors.navy,
    borderRadius: 21,
  },
  dayText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  dayToday: {
    color: colors.red,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: colors.onNavy,
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
