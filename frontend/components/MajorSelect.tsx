import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { colors, fontSize, radius, spacing } from './theme';
import { MAJOR_OPTIONS } from '../types/user';

/** Selecting this hands back a blank, user-typed chip instead of a list value. */
export const OTHER = 'Other';

interface Props {
  visible: boolean;
  /** Majors already added, hidden here so the same one can't be picked twice. */
  exclude: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

/** Picker for MAJOR_OPTIONS, plus "Other" for anything not on the list. */
export function MajorSelect({ visible, exclude, onSelect, onClose }: Props) {
  const options = MAJOR_OPTIONS.filter((option) => !exclude.includes(option));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Add a major</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.row}
                onPress={() => onSelect(option)}
              >
                <Text style={styles.rowText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.row} onPress={() => onSelect(OTHER)}>
              <Text style={styles.rowText}>Other</Text>
            </TouchableOpacity>
          </ScrollView>

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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.purple,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  rowText: {
    fontSize: fontSize.body,
    color: colors.text,
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
