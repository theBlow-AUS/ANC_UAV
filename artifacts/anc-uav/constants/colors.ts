/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#15252C',
    tint: '#087D76',
    background: '#EFF4F1',
    foreground: '#15252C',
    card: '#FFFFFF',
    cardForeground: '#15252C',
    primary: '#087D76',
    primaryForeground: '#FFFFFF',
    secondary: '#DDE9E5',
    secondaryForeground: '#183934',
    muted: '#E4ECE8',
    mutedForeground: '#526761',
    accent: '#F1D18A',
    accentForeground: '#392A0D',
    destructive: '#A63D36',
    destructiveForeground: '#ffffff',
    border: '#C9D9D3',
    input: '#C9D9D3',
  },
  dark: {
    text: '#EAF3EF',
    tint: '#70D2C1',
    background: '#0B171C',
    foreground: '#EAF3EF',
    card: '#15252B',
    cardForeground: '#EAF3EF',
    primary: '#54C2B0',
    primaryForeground: '#0A211D',
    secondary: '#25373C',
    secondaryForeground: '#E4EFEB',
    muted: '#1B2B30',
    mutedForeground: '#A7BBB5',
    accent: '#EBC46D',
    accentForeground: '#392A0D',
    destructive: '#C95D53',
    destructiveForeground: '#FFFFFF',
    border: '#31464B',
    input: '#31464B',
  },
  radius: 14,
};

export default colors;
