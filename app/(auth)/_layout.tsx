import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AuthLayout() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();

  if (loading || !profileLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  // Si ya tiene sesión, redirigir al index para que haga la redirección basada en su rol
  if (session && profile?.role) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgotPassword" />
      <Stack.Screen name="resetPassword" />
      <Stack.Screen name="role-select" />
    </Stack>
  );
}
