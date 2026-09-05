// Shared design tokens. Screens pull colors and sizing from here rather than
// hardcoding hex values — before this existed the app had three different
// navies, three different reds, and four different header heights.
//
// RESKINNING: the brand is Northwestern Purple (#4E2A84). Everything
// brand-colored resolves from the `purple*` tokens below, so changing the
// chapter's look is an edit to this block, not a hunt through 20 files.
// `danger` is deliberately separate — validation errors and destructive
// actions stay red for legibility regardless of the brand color.

export const colors = {
  // Brand — Northwestern Purple and its official tints
  purple: '#4E2A84', // primary: page banners, CTAs, selected states, accents
  purpleDeep: '#401F68', // "Purple 120" — pressed states, darker fills
  purpleTint: '#E4E0EE', // "Purple 10" — light accent backgrounds (icon circles)
  onPurple: '#ffffff', // text/icons sitting on a purple fill

  // Functional — not part of the brand palette, don't swap with it
  danger: '#C0392B', // error text, destructive ("Delete") actions

  // Surfaces
  screen: '#f0f2f5',
  card: '#ffffff',
  surfaceDark: '#25292e', // dark form screens (register, edit-profile)
  inputDark: '#3a3f47', // input fill on the dark form screens

  // Text
  text: '#25292e',
  textMuted: '#666666',
  textFaint: '#999999',

  // Lines
  border: '#e5e7eb',

  // --- Deprecated aliases. Kept so nothing breaks mid-migration; prefer the
  // names above. `navy`/`red` both map to the brand purple now.
  navy: '#4E2A84',
  red: '#4E2A84',
  onNavy: '#ffffff',
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
