import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from './theme';

interface Props {
  title: string;
  subtitle?: string;
  /** Renders a back arrow to the left of the title when provided. */
  onBack?: () => void;
}

/**
 * The purple banner at the top of every screen.
 *
 * Top padding comes from the device's safe-area inset rather than a fixed
 * number. A hardcoded paddingTop can't know where the notch or camera cutout
 * is — it's too much room on older phones and not enough on newer ones, which
 * is why the events header used to get sliced by the camera.
 */
export function PageHeader({ title, subtitle, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.titleRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={28} color={colors.onPurple} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.purple,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.header,
    borderBottomRightRadius: radius.header,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.onPurple,
    fontSize: fontSize.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.onPurple,
    fontSize: fontSize.body,
    marginTop: spacing.sm,
  },
});
