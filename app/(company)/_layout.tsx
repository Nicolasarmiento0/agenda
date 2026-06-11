import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function CompanyLayout() {
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

  if (profile?.role !== 'company') {
    return <Redirect href="/" />;
  }

  if (business?.status === 'suspended') {
    const isDashboard = pathname === '/dashboard-company';
    if (!isDashboard) {
      return <Redirect href="/dashboard-company" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard-company" />
      <Stack.Screen name="business-setup" />
      <Stack.Screen name="business-pending" />
      <Stack.Screen name="company-services" />
      <Stack.Screen name="company-employees" />
      <Stack.Screen name="company-history" />
      <Stack.Screen name="company-business" />
      <Stack.Screen name="company-members" />
      <Stack.Screen name="company-booking-window" />
      <Stack.Screen name="edit-schedule" />
    </Stack>
  );
}
