import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AdminLayout() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();

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

  if (profile?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="admin-businesses" />
      <Stack.Screen name="admin-business-detail" />
      <Stack.Screen name="admin-business-employees" />
    </Stack>
  );
}
