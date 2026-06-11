import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ClientLayout() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();

  if (loading || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  // Rutas exclusivas del rol client
  const clientOnlyRoutes = ['/client-dashboard', '/my-appointments', '/client-gym-plan'];
  // Rutas compartidas: cualquier usuario autenticado puede acceder (profile, inbox, calendar)
  const authRequiredRoutes = ['/profile', '/inbox', '/calendar'];

  const isClientOnly = clientOnlyRoutes.some(route => pathname.startsWith(route));
  const isAuthRequired = authRequiredRoutes.some(route => pathname.startsWith(route));

  if (isClientOnly) {
    if (!session) {
      return <Redirect href="/login" />;
    }
    if (profile?.role && profile.role !== 'client') {
      return <Redirect href="/" />;
    }
  }

  if (isAuthRequired) {
    if (!session) {
      return <Redirect href="/login" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="client-dashboard" />
      <Stack.Screen name="client-business-profile" />
      <Stack.Screen name="client-gym-plan" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="my-appointments" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="support" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
