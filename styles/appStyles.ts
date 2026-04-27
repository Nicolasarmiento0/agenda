import { StyleSheet } from 'react-native';

export const appColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#0A0A0A',      // negro profundo
  surface: '#141414',         // superficie de cards/inputs
  border: '#2A2A2A',          // bordes sutiles
  primary: '#E31937',         // rojo Tesla
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  error: '#FF3B30',
};

export const appStyles = StyleSheet.create({
  forgotText: {
    color: appColors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.5,
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
    fontWeight: '700',          // Tesla usa pesos ligeros
    color: appColors.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    padding: 10,
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    color: appColors.textSecondary,
    letterSpacing: 1,
  },
  subtitleCentered: {
    fontSize: 14,
    color: appColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: appColors.textPrimary,
    backgroundColor: appColors.surface,
    letterSpacing: 0.5,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: appColors.primary,
    paddingVertical: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  primaryButton2: {
    alignSelf: 'center',
    backgroundColor: appColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 4,
    marginTop: 8,
  },
  primaryButtonText: {
    color: appColors.white,
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 4,
  },
  secondaryButtonText: {
    color: appColors.textPrimary,
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorText: {
    color: appColors.error,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});