import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ─── Glass color tokens ───────────────────────────────────────────────────────
// Fuente única de verdad para todos los rgba() de glassmorphism.
// Usar estos en lugar de strings literales en StyleSheet.create().
export const glassColors = {
  overlayHeavy:       'rgba(0,0,0,0.65)',
  overlayMedium:      'rgba(0,0,0,0.6)',
  overlayLight:       'rgba(0,0,0,0.4)',
  sheetDark:          'rgba(10,10,16,0.6)',
  sheetDarkAlt:       'rgba(15,15,20,0.55)',
  sheetModalDark:     'rgba(16,16,16,0.82)',
  sheetLight:         'rgba(248,248,252,0.55)',
  sheetLightAlt:      'rgba(255,255,255,0.45)',
  sheetModalLight:    'rgba(250,250,250,0.90)',
  borderDarkStrong:   'rgba(255,255,255,0.15)',
  borderDarkMedium:   'rgba(255,255,255,0.12)',
  borderDarkSubtle:   'rgba(255,255,255,0.10)',
  borderDarkFaint:    'rgba(255,255,255,0.07)',
  borderLightStrong:  'rgba(0,0,0,0.12)',
  borderLightMedium:  'rgba(0,0,0,0.10)',
  borderLightSubtle:  'rgba(0,0,0,0.08)',
  surfaceDark:        'rgba(255,255,255,0.07)',
  surfaceDarkFaint:   'rgba(255,255,255,0.05)',
  surfaceLight:       'rgba(0,0,0,0.04)',
  surfaceLightFaint:  'rgba(0,0,0,0.03)',
  handleDark:         'rgba(255,255,255,0.25)',
  handleLight:        'rgba(0,0,0,0.18)',
  placeholderDark:    'rgba(255,255,255,0.3)',
  placeholderLight:   'rgba(0,0,0,0.3)',
} as const;

export const appColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#0B0E14',
  surface: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  primary: '#B4F736',
  primaryText: '#111827',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  error: '#FF4B4B',
};

export const radii = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
};

export function useGlassTokens() {
  const { isDarkMode } = useTheme();
  return {
    tint:         (isDarkMode ? 'dark' : 'light') as 'dark' | 'light',
    border:       isDarkMode ? glassColors.borderDarkSubtle  : glassColors.borderLightSubtle,
    borderStrong: isDarkMode ? glassColors.borderDarkStrong  : glassColors.borderLightStrong,
    borderSubtle: isDarkMode ? glassColors.borderDarkSubtle  : glassColors.borderLightSubtle,
    fill:         isDarkMode ? glassColors.surfaceDarkFaint  : glassColors.sheetLightAlt,
    track:        isDarkMode ? glassColors.borderDarkMedium  : glassColors.borderLightMedium,
    sheetBg:      isDarkMode ? glassColors.sheetDark         : glassColors.sheetLight,
    overlayBg:    glassColors.overlayMedium,
    surface:      isDarkMode ? glassColors.surfaceDark       : glassColors.surfaceLight,
    handle:       isDarkMode ? glassColors.handleDark        : glassColors.handleLight,
    placeholder:  isDarkMode ? glassColors.placeholderDark   : glassColors.placeholderLight,
  };
}

export const appStyles = StyleSheet.create({
  forgotText: {
    color: appColors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.5,
    fontFamily: 'Inter_400Regular',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: appColors.background,
    gap: 22,
  },
  screenContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 22,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 50,
  },
  back2: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  screenCentered: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.background,
    gap: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    color: appColors.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    padding: 10,
    paddingVertical: 20,
    fontFamily: 'Inter_700Bold',
  },
  title2: {
    fontSize: 25,
    fontWeight: '700',
    color: appColors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: 10,
    paddingVertical: 20,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: appColors.textSecondary,
    letterSpacing: 1,
    fontFamily: 'Inter_400Regular',
  },
  subtitle2: {
    fontSize: 6,
    color: appColors.textSecondary,
    letterSpacing: 1,
    fontFamily: 'Inter_400Regular',
  },
  subtitleCentered: {
    fontSize: 14,
    color: appColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: appColors.textPrimary,
    backgroundColor: appColors.surface,
    letterSpacing: 0.5,
    fontFamily: 'Inter_400Regular',
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: appColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: radii.full,
    marginTop: 8,
  },
  primaryButton2: {
    alignSelf: 'center',
    backgroundColor: appColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: radii.full,
    marginTop: 8,
  },
  primaryButtonText: {
    color: appColors.primaryText,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: radii.full,
  },
  secondaryButtonText: {
    color: appColors.textPrimary,
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    color: appColors.error,
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: 'Inter_600SemiBold',
  },
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassInner: {
    padding: 16,
  },
  glassModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glassModalCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassModalContent: {
    backgroundColor: 'rgba(16,16,16,0.82)',
    padding: 24,
    gap: 16,
  },
  glassModalContentLight: {
    backgroundColor: 'rgba(250,250,250,0.90)',
  },
  glassModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  glassModalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  glassModalBtnText: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});

export const useAppStyles = () => {
  const { colors } = useTheme();
  return StyleSheet.create({
    forgotText: { color: colors.textSecondary, textAlign: 'center', fontSize: 14, letterSpacing: 0.5, fontFamily: 'Inter_400Regular' },
    screen: { flex: 1, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: colors.background, gap: 22 },
    screenContent: { flex: 1, justifyContent: 'center', gap: 22 },
    back: { alignSelf: 'flex-start', paddingVertical: 50 },
    back2: { alignSelf: 'flex-start', paddingVertical: 10 },
    screenCentered: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: 12 },
    title: { fontSize: 38, fontWeight: '700', color: colors.textPrimary, letterSpacing: 4, textTransform: 'uppercase', padding: 10, paddingVertical: 20, fontFamily: 'Inter_700Bold' },
    subtitle: { fontSize: 14, color: colors.textSecondary, letterSpacing: 1, fontFamily: 'Inter_400Regular' },
    subtitleCentered: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', letterSpacing: 1, fontFamily: 'Inter_400Regular' },
    input: { alignSelf: 'stretch', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface, letterSpacing: 0.5, fontFamily: 'Inter_400Regular' },
    primaryButton: { alignSelf: 'stretch', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radii.full, marginTop: 8 },
    primaryButton2: { alignSelf: 'center', backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 60, borderRadius: radii.full, marginTop: 8 },
    primaryButtonText: { color: colors.primaryText, textAlign: 'center', fontWeight: '600', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold' },
    secondaryButton: { alignSelf: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent', paddingVertical: 14, paddingHorizontal: 60, borderRadius: radii.full },
    secondaryButtonText: { color: colors.textPrimary, textAlign: 'center', fontWeight: '400', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Inter_400Regular' },
    errorText: { color: colors.error, fontSize: 12, letterSpacing: 0.5, fontFamily: 'Inter_400Regular' },
  });
};
