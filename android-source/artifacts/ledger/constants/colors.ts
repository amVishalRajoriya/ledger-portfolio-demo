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
    // Legacy aliases (kept for backward compatibility)
    text: '#173A2E',
    tint: '#255E47',

    // Core surfaces
    background: '#F5F5EF',
    foreground: '#142B24',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#142B24',

    // Primary action color (buttons, links, active states)
    primary: '#255E47',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E9EEE7',
    secondaryForeground: '#234334',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EAECE5',
    mutedForeground: '#758077',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DDF28A',
    accentForeground: '#183328',

    // Destructive actions (delete, error states)
    destructive: '#C35248',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#E3E6DE',
    input: '#D7DDD3',
    positive: '#287A55',
    warning: '#B78131',
    chart1: '#255E47',
    chart2: '#D79B3E',
    chart3: '#5C8B9D',
    chart4: '#9C6F84',
    chart5: '#8B9A4B',
    chart6: '#AD7154',
    chart7: '#69778D',
    chart8: '#67A293',
  },
  dark: {
    text: '#F1F3EC',
    tint: '#BADD64',
    background: '#111C17',
    foreground: '#F1F3EC',
    card: '#1C2A23',
    cardForeground: '#F1F3EC',
    primary: '#BADD64',
    primaryForeground: '#15241B',
    secondary: '#29382F',
    secondaryForeground: '#E8EEE4',
    muted: '#29352E',
    mutedForeground: '#A0ADA2',
    accent: '#314238',
    accentForeground: '#D9F18E',
    destructive: '#EC8175',
    destructiveForeground: '#281614',
    border: '#314138',
    input: '#405248',
    positive: '#82CC9D',
    warning: '#E6B766',
    chart1: '#BADD64',
    chart2: '#E6B766',
    chart3: '#72B4C7',
    chart4: '#CF91AB',
    chart5: '#B6CA6A',
    chart6: '#D78D6A',
    chart7: '#A4B4CE',
    chart8: '#70C0A8',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
