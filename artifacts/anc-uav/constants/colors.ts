/**
 * ANC UAV field theme. Day = glare-proof ink on paper. Night = low-emission near-black.
 * `signal` (amber) is for FILLS only. `primary` is for text/icons and flips per mode for contrast.
 */
const base = { signal: '#FFB400', onSignal: '#0A0A08', hazardDark: '#0A0A08' };
const colors = {
  light: {
    ...base, text: '#0A0A08', foreground: '#0A0A08', background: '#FBFAF4', card: '#EDEDE6', cardForeground: '#0A0A08',
    tint: '#0A0A08', primary: '#0A0A08', primaryForeground: '#FFB400', secondary: '#DCDCD2', secondaryForeground: '#0A0A08',
    muted: '#EDEDE6', mutedForeground: '#3B3B36', accent: '#FFB400', accentForeground: '#0A0A08',
    destructive: '#C40000', destructiveForeground: '#FBFAF4', go: '#007A33', goForeground: '#FBFAF4',
    border: '#0A0A08', input: '#0A0A08', ink: '#0A0A08',
  },
  dark: {
    ...base, text: '#F4F1E8', foreground: '#F4F1E8', background: '#070708', card: '#15161A', cardForeground: '#F4F1E8',
    tint: '#FFB400', primary: '#FFB400', primaryForeground: '#0A0A08', secondary: '#23252B', secondaryForeground: '#F4F1E8',
    muted: '#15161A', mutedForeground: '#A9A79D', accent: '#FFB400', accentForeground: '#0A0A08',
    destructive: '#FF4A3D', destructiveForeground: '#0A0A08', go: '#2BE06E', goForeground: '#0A0A08',
    border: '#3A3C44', input: '#F4F1E8', ink: '#F4F1E8',
  },
  radius: 0,
};
export default colors;
