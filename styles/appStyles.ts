import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';


// ─── Glass color tokens ───────────────────────────────────────────────────────
// Fuente única de verdad para todos los rgba() de glassmorphism.
// Usar estos en lugar de strings literales en StyleSheet.create().
export const glassColors = {
  overlayHeavy: 'rgba(0,0,0,0.65)',
  overlayMedium: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.4)',
  sheetDark: 'rgba(10,10,16,0.6)',
  sheetDarkAlt: 'rgba(15,15,20,0.55)',
  sheetModalDark: 'rgba(16,16,16,0.82)',
  sheetLight: 'rgba(248,248,252,0.55)',
  sheetLightAlt: 'rgba(255,255,255,0.45)',
  sheetModalLight: 'rgba(250,250,250,0.90)',
  borderDarkStrong: 'rgba(255,255,255,0.15)',
  borderDarkMedium: 'rgba(255,255,255,0.12)',
  borderDarkSubtle: 'rgba(255,255,255,0.10)',
  borderDarkFaint: 'rgba(255,255,255,0.07)',
  borderLightStrong: 'rgba(0,0,0,0.12)',
  borderLightMedium: 'rgba(0,0,0,0.10)',
  borderLightSubtle: 'rgba(0,0,0,0.08)',
  surfaceDark: 'rgba(255,255,255,0.07)',
  surfaceDarkFaint: 'rgba(255,255,255,0.05)',
  surfaceLight: 'rgba(0,0,0,0.04)',
  surfaceLightFaint: 'rgba(0,0,0,0.03)',
  handleDark: 'rgba(255,255,255,0.25)',
  handleLight: 'rgba(0,0,0,0.18)',
  placeholderDark: 'rgba(255,255,255,0.3)',
  placeholderLight: 'rgba(0,0,0,0.3)',
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
    tint: (isDarkMode ? 'dark' : 'light') as 'dark' | 'light',
    border: isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle,
    borderStrong: isDarkMode ? glassColors.borderDarkStrong : glassColors.borderLightStrong,
    borderSubtle: isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle,
    fill: isDarkMode ? glassColors.surfaceDarkFaint : glassColors.sheetLightAlt,
    track: isDarkMode ? glassColors.borderDarkMedium : glassColors.borderLightMedium,
    sheetBg: isDarkMode ? glassColors.sheetDark : glassColors.sheetLight,
    overlayBg: glassColors.overlayMedium,
    surface: isDarkMode ? glassColors.surfaceDark : glassColors.surfaceLight,
    handle: isDarkMode ? glassColors.handleDark : glassColors.handleLight,
    placeholder: isDarkMode ? glassColors.placeholderDark : glassColors.placeholderLight,
  };
}

export const appStyles = StyleSheet.create({
  forgotText: {
    color: appColors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.5,
    fontFamily: 'Varien',
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
    fontFamily: 'Varien',
  },
  title2: {
    fontSize: 25,
    fontWeight: '700',
    color: appColors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: 10,
    paddingVertical: 20,
    fontFamily: 'Varien',
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
    backgroundColor: appColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: radii.full,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 420,
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

  // --- Client Business Profile ---
  clientProfileBackBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 3 }, web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' } }) },
  clientProfileContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 100 : 80, alignItems: 'center' },
  clientProfileAvatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 }, web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.1)' } }) },
  clientProfileAvatar: { width: '100%', height: '100%', borderRadius: 60 },
  clientProfileAvatarInitial: { fontSize: 32, fontWeight: 'bold' },
  clientProfileName: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
  clientProfileRatingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0A03015', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 20, gap: 4 },
  clientProfileRatingScore: { fontSize: 14, fontWeight: '700' },
  clientProfileRatingTotal: { fontSize: 12 },
  clientProfileDescription: { fontSize: 14, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  clientProfileDetailsContainer: { gap: 20, marginTop: 10, width: '100%' },
  clientProfileDetailRow: { flexDirection: 'row', alignItems: 'center' },
  clientProfileIconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  clientProfileDetailTextContainer: { flex: 1, justifyContent: 'center' },
  clientProfileDetailLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
  clientProfileDetailValue: { fontSize: 14, fontWeight: '500' },
  clientProfileFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: StyleSheet.hairlineWidth },
  /* MODAL */
  clientProfileModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  clientProfileBlurCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', borderTopWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' },
  clientProfileGlassContent: { backgroundColor: 'rgba(16,16,16,0.82)', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  clientProfileGlassContentLight: { backgroundColor: 'rgba(250,250,250,0.90)' },
  clientProfileModalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderWidth: StyleSheet.hairlineWidth },
  clientProfileModalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  clientProfileStarsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  clientProfileStarBtn: { padding: 4 },
  clientProfileReviewInput: { height: 100, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, paddingTop: 16, fontSize: 14, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },

  // --- Client Agenda ---


  // Header
  ca_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  ca_iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ca_toggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 3,
    gap: 2,
  },
  ca_toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ca_toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
  },

  // Date nav
  ca_dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  ca_navBtn: {
    padding: 12,
  },
  ca_dateLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Filters
  ca_workerFilters: {
    maxHeight: 32,
    minHeight: 32,
    marginBottom: 4,
  },
  ca_workerFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  ca_filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  ca_filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },

  // Stats
  ca_statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  ca_statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  ca_statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  ca_statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
  },

  // Grid container
  ca_gridContainer: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Worker header
  ca_workerHeader: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
  },
  ca_workerCol: {
    alignItems: 'center',
    gap: 3,
  },
  ca_workerAvatarWrapper: {
    position: 'relative',
  },
  ca_workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ca_workerActiveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  ca_workerInitials: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ca_workerName: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  ca_workerSpecialty: {
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  ca_weekDayNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ca_weekDayNumText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Grid de tiempo
  ca_grid: {
    position: 'relative',
  },
  ca_hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ca_hourLabel: {
    fontSize: 10,
    paddingTop: 0,
    paddingRight: 8,
    textAlign: 'right',
    letterSpacing: 0.2,
    marginTop: -6,
  },
  ca_hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
  },

  // Columnas de citas
  ca_columnsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  ca_workerColumn: {
    position: 'absolute',
    top: 0,
  },

  // Tarjeta de cita
  ca_apptCard: {
    position: 'absolute',
    left: 3,
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    overflow: 'hidden',
  },
  ca_apptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    flexShrink: 0,
  },
  ca_apptTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  ca_apptSub: {
    fontSize: 10,
    marginTop: 1,
  },

  // Línea "ahora"
  ca_nowLine: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  ca_nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.primary,
    marginLeft: -4,
  },
  ca_nowBar: {
    flex: 1,
    height: 1.5,
  },

  // FAB
  ca_fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    ...require('react-native').Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 3px 6px rgba(0,0,0,0.25)' },
    }),
  },

  // Bottom sheet
  ca_sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  ca_sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  ca_sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  ca_sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ca_sheetWorkerDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ca_sheetWorkerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  ca_sheetService: {
    fontSize: 16,
    fontWeight: '600',
  },
  ca_sheetClient: {
    fontSize: 13,
    marginTop: 2,
  },
  ca_sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ca_sheetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ca_sheetDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  ca_sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ca_sheetDetailText: {
    fontSize: 13,
  },
  ca_sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  ca_sheetAction: {
    alignItems: 'center',
    gap: 6,
  },
  ca_sheetActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ca_sheetActionLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Modal Form
  ca_modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  ca_modalContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  ca_modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  ca_modalLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  ca_modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  ca_modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ca_modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ca_modalChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  ca_modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  ca_modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  ca_modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Business header (Tesla style)
  ca_businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ca_businessHeaderLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 2,
  },
  ca_businessHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ca_suspensionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ca_suspensionText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Gym membership
  ca_membershipBtn: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  ca_membershipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ca_membershipBadge: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ca_membershipBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ca_membershipModalCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    marginHorizontal: 4,
  },
  ca_membershipModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  ca_membershipModalSub: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  ca_membershipInput: {
    height: 90,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    paddingTop: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  ca_membershipModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Weekly selection
  ca_weeklyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  ca_weeklyBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  ca_weeklyModalContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  ca_weeklyDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  ca_weeklyApptChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Gym classes indicator
  ca_gymClassesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ca_gymClassesLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ca_gymClassesTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ca_gymClassesFill: {
    height: '100%',
    borderRadius: 2,
  },
  ca_gymClassesWeekLabel: {
    fontSize: 11,
    flexShrink: 0,
  },


  // --- worker-history.tsx ---

  wh_header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  wh_hamburger: { fontSize: 26 },
  wh_headerTitle: { fontSize: 12, letterSpacing: 3, fontWeight: '600' },
  wh_summaryCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  wh_summaryLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  wh_summaryValue: { fontSize: 32, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: 1, marginBottom: 4 },
  wh_summaryCount: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  wh_filtersContainer: {
    marginBottom: 16,
  },
  wh_filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  wh_filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#333',
  },
  wh_filterChipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  wh_divider: { width: 1, height: 20, backgroundColor: '#333', marginHorizontal: 8 },
  wh_listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  wh_itemCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  wh_itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wh_itemService: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  wh_itemPrice: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  wh_itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  wh_detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wh_detailText: { fontSize: 11, fontWeight: '500' },
  wh_emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  wh_emptyText: { fontSize: 13, textAlign: 'center', maxWidth: '80%' },

  // --- worker-dashboard.tsx ---

  wd_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  wd_iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wd_headerLabel: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  wd_scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  wd_welcomeText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  wd_businessName: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
    marginTop: 4,
  },
  wd_card: {
    borderRadius: 20,
    padding: 16,
  },
  wd_rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  wd_flexCard: {
    flex: 1,
  },
  wd_cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  wd_cardTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  wd_sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },

  /* CHART FILTERS */
  wd_chartHeaderRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  wd_filterContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
  },
  wd_filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  wd_filterText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  /* CHART STYLES */
  wd_chartContainer: {
    height: 140,
  },
  wd_barsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  wd_barCol: {
    alignItems: 'center',
    width: 30,
    height: '100%',
  },
  wd_barTrack: {
    flex: 1,
    width: 8,
    backgroundColor: '#33333320',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  wd_barFill: {
    width: '100%',
    borderRadius: 4,
  },
  wd_barLabel: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: '500',
  },

  /* REVIEWS */
  wd_scoreText: {
    fontSize: 32,
    fontWeight: '800',
  },
  wd_subText: {
    fontSize: 12,
    marginTop: 2,
  },
  wd_dateText: {
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },

  /* MODAL REVIEWS */
  wd_modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  wd_modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  wd_modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  wd_modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  wd_closeBtn: {
    padding: 4,
  },
  wd_reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wd_reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wd_reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
  },
  wd_reviewDate: {
    fontSize: 11,
  },
  wd_reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* SCHEDULE */
  wd_scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wd_dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wd_dayText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* WORKERS */
  wd_workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  wd_avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wd_avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  wd_workerInfo: {
    flex: 1,
  },
  wd_workerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  wd_workerRole: {
    fontSize: 12,
    marginTop: 2,
  },
  wd_workerStats: {
    alignItems: 'flex-end',
  },
  wd_workerServices: {
    fontSize: 16,
    fontWeight: '700',
  },
  wd_workerServicesLabel: {
    fontSize: 10,
  },

  /* PUBLIC BTN */
  wd_publicBtn: {
    padding: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  wd_publicBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wd_publicBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  wd_publicBtnSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  // --- worker-agenda.tsx ---


  // Header
  wa_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  wa_iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_toggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 3,
    gap: 2,
  },
  wa_toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  wa_toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.2,
  },

  // Date nav
  wa_dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  wa_navBtn: {
    padding: 12,
  },
  wa_dateLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Filters
  wa_workerFilters: {
    maxHeight: 32,
    minHeight: 32,
    marginBottom: 4,
  },
  wa_workerFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  wa_filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  wa_filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },

  // Stats
  wa_statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  wa_statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  wa_statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  wa_statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
  },

  // Grid container
  wa_gridContainer: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Worker header
  wa_workerHeader: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
  },
  wa_workerCol: {
    alignItems: 'center',
    gap: 3,
  },
  wa_workerAvatarWrapper: {
    position: 'relative',
  },
  wa_workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_workerActiveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  wa_workerInitials: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  wa_workerName: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  wa_workerApptCount: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Worker profile modal
  wa_profileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  wa_profileCard: {
    width: 260,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  wa_profileCardInner: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  wa_profileClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  wa_profileInitials: {
    fontSize: 24,
    fontWeight: '700',
  },
  wa_profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wa_profileDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  wa_profileStats: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  wa_profileStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  wa_profileStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wa_profileStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    fontWeight: '500',
  },
  wa_profileFilterBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  wa_profileFilterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  wa_weekDayNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  wa_weekDayNumText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Grid de tiempo
  wa_grid: {
    position: 'relative',
  },
  wa_hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wa_hourLabel: {
    fontSize: 10,
    paddingTop: 0,
    paddingRight: 8,
    textAlign: 'right',
    letterSpacing: 0.2,
    marginTop: -6,
  },
  wa_hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
  },

  // Columnas de citas
  wa_columnsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  wa_workerColumn: {
    position: 'absolute',
    top: 0,
  },

  // Tarjeta de cita
  wa_apptCard: {
    position: 'absolute',
    left: 3,
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    overflow: 'hidden',
  },
  wa_apptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    flexShrink: 0,
  },
  wa_apptTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  wa_apptSub: {
    fontSize: 10,
    marginTop: 1,
  },

  // Línea "ahora"
  wa_nowLine: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  wa_nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.primary,
    marginLeft: -4,
  },
  wa_nowBar: {
    flex: 1,
    height: 1.5,
  },

  // FAB
  wa_fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Bottom sheet
  wa_sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  wa_sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  wa_sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  wa_sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  wa_sheetWorkerDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_sheetWorkerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  wa_sheetService: {
    fontSize: 16,
    fontWeight: '600',
  },
  wa_sheetClient: {
    fontSize: 13,
    marginTop: 2,
  },
  wa_sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  wa_sheetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  wa_sheetDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  wa_sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wa_sheetDetailText: {
    fontSize: 13,
  },
  wa_sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  wa_sheetAction: {
    alignItems: 'center',
    gap: 6,
  },
  wa_sheetActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_sheetActionLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Modal Form
  wa_modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  wa_modalContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  wa_modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  wa_modalLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  wa_modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  wa_modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wa_modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wa_modalChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  wa_modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  wa_modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  wa_modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  wa_suspendedBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  wa_suspendedBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.error,
  },

  // --- worker-agenda.tsx formStyles ---

  wa_form_sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  wa_form_handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  wa_form_header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wa_form_title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  wa_form_closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_form_label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  wa_form_blockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  wa_form_checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_form_blockToggleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  wa_form_serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wa_form_serviceChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  wa_form_workerRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  wa_form_workerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wa_form_workerInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wa_form_workerName: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  wa_form_quickDates: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  wa_form_quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  wa_form_quickChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  wa_form_slotChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 58,
  },
  wa_form_durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  wa_form_durationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  wa_form_durationDisplay: {
    alignItems: 'center',
    minWidth: 64,
  },
  wa_form_durationValue: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  wa_form_durationUnit: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: -2,
  },
  wa_form_saveBtn: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  wa_form_saveBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  wa_form_successCard: {
    width: 200,
    height: 200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wa_form_successTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  wa_form_successSub: {
    fontSize: 13,
    letterSpacing: 0.5,
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
    title: { fontSize: 38, fontWeight: '700', color: colors.textPrimary, letterSpacing: 4, textTransform: 'uppercase', padding: 10, paddingVertical: 20, fontFamily: 'Varien' },
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
