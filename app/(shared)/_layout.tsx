import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SharedLayout() {
  const { session, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();

  if (loading || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  // Rutas públicas que no requieren estar autenticado
  const publicRoutes = ['/terms', '/privacy'];
  const isPublic = publicRoutes.some(route => pathname.startsWith(route));

  if (!session && !isPublic) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="calendar" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="support" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
