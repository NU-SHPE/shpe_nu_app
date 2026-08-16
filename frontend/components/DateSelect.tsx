import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
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

// A birthday can be a century back; a member's own age (13+) already covers
// most of the range one direction, and events are always near the present the
// other way. Descending so the common case (scrolling down toward a birth
// year) doesn't start past the far end of the list.
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 121 }, (_, index) => CURRENT_YEAR + 10 - index);
const YEAR_ROW_HEIGHT = 44;

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
  const [mode, setMode] = useState<'day' | 'year'>('day');
  const yearListRef = useRef<FlatList<number>>(null);

  // Reopening shouldn't strand the picker on the year list from a previous visit.
  useEffect(() => {
    if (visible) setMode('day');
  }, [visible]);

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

  const openYearList = () => {
    setMode('year');
    const index = YEARS.indexOf(year);
    if (index >= 0) {
      requestAnimationFrame(() => {
        yearListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {mode === 'year' ? (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setMode('day')} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={colors.navy} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>Select year</Text>
              <View style={styles.headerSpacer} />
            </View>
          ) : (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => step(-1)} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={colors.navy} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.monthLabelButton} onPress={openYearList} hitSlop={8}>
                <Text style={styles.monthLabel}>
                  {MONTHS[month]} {year}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.navy} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => step(1)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={22} color={colors.navy} />
              </TouchableOpacity>
            </View>
          )}

          {mode === 'year' ? (
            <FlatList
              ref={yearListRef}
              data={YEARS}
              keyExtractor={(y) => String(y)}
              style={styles.yearList}
              getItemLayout={(_, index) => ({
                length: YEAR_ROW_HEIGHT,
                offset: YEAR_ROW_HEIGHT * index,
                index,
              })}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item: y }) => (
                <TouchableOpacity
                  style={[styles.yearRow, y === year && styles.yearRowSelected]}
                  onPress={() => {
                    setYear(y);
                    setMode('day');
                  }}
                >
                  <Text style={[styles.yearText, y === year && styles.yearTextSelected]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              )}
            />
          ) : (
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
          )}

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
    maxHeight: '80%',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  headerSpacer: {
    width: 22,
  },
  monthLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  yearList: {
    maxHeight: 320,
  },
  yearRow: {
    height: YEAR_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearRowSelected: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
  },
  yearText: {
    fontSize: fontSize.body,
    color: colors.text,
  },
  yearTextSelected: {
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
