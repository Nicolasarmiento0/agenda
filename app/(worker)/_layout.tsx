import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function WorkerLayout() {
  const { session, profile, business, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();
  const pathname = usePathname();

  if (loading || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (profile?.role !== 'worker') {
    return <Redirect href="/" />;
  }

  if (business?.status === 'suspended') {
    const isDashboard = pathname === '/worker-dashboard';
    if (!isDashboard) {
      return <Redirect href="/worker-dashboard" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="worker-dashboard" />
      <Stack.Screen name="worker-history" />
    </Stack>
  );
}
