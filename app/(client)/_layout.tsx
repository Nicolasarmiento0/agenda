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

  // Rutas que son exclusivas de cliente
  const clientOnlyRoutes = ['/client-dashboard', '/my-appointments'];

  const isClientOnly = clientOnlyRoutes.some(route => pathname.startsWith(route));

  if (isClientOnly) {
    if (!session) {
      return <Redirect href="/login" />;
    }
    if (profile?.role && profile.role !== 'client') {
      return <Redirect href="/" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="client-dashboard" />
      <Stack.Screen name="client-business-profile" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="my-appointments" />
    </Stack>
  );
}
