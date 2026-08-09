import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, shadow, spacing } from './theme';

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
}

/** The icon-in-a-red-circle cards used on the home and organizer screens. */
export function ActionButton({ icon, label, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={colors.card} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    height: 140,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    justifyContent: 'flex-start',
    ...shadow.card,
  },
  iconCircle: {
    backgroundColor: colors.red,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
