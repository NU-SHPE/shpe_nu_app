// Shared design tokens. Screens should pull colors and sizing from here rather
// than hardcoding hex values — before this existed the app had three different
// navies, three different reds, and four different header heights.

export const colors = {
  navy: '#1B2A6B',
  red: '#ff003c',

  screen: '#f0f2f5',
  card: '#ffffff',

  text: '#25292e',
  textMuted: '#666666',
  textFaint: '#999999',
  onNavy: '#ffffff',

  border: '#e5e7eb',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const radius = {
  card: 12,
  header: 26,
} as const;

export const fontSize = {
  title: 30,
  heading: 22,
  body: 15,
  label: 13,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
