import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext'; // agrega este import
import { supabase } from '../lib/supabase';


export default function RootLayout() {

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (url: string) => {
    if (!url.includes('access_token')) return;
    const params = new URLSearchParams(url.split('#')[1]);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      router.replace('/screens/resetPassword' as any);
    }
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/home" />
          <Stack.Screen name="screens/loginscreen" />
          <Stack.Screen name="screens/signup" />
          <Stack.Screen name="screens/forgotPassword" />
          <Stack.Screen name="screens/emailConfirmation" />
          <Stack.Screen name="screens/resetPassword" />
          <Stack.Screen name="screens/role-select" />
          <Stack.Screen name="screens/dashboard-company" />
          <Stack.Screen name="screens/dashboard" />
          <Stack.Screen name="screens/profile" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}