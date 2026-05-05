import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import TeslaAlert from '../components/TeslaAlert';
import { AlertProvider } from '../context/AlertContext';
import { AuthProvider } from '../context/AuthContext';
import { BusinessProvider } from '../context/BusinessContext';
import { ThemeProvider } from '../context/ThemeContext';
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
      <AlertProvider>
        <BusinessProvider>
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
              <Stack.Screen name="screens/admin-dashboard" />
              <Stack.Screen name="screens/admin-businesses" />
              <Stack.Screen name="screens/admin-business-detail" />
              <Stack.Screen name="screens/business-setup" />
              <Stack.Screen name="screens/business-pending" />
              {/* Cliente */}
              <Stack.Screen name="screens/explore" />
              <Stack.Screen name="screens/my-appointments" />
              {/* Empresa */}
              <Stack.Screen name="screens/company-agenda" />
              <Stack.Screen name="screens/company-services" />
              <Stack.Screen name="screens/company-employees" />
              <Stack.Screen name="screens/company-business" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
          <TeslaAlert />
        </BusinessProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}