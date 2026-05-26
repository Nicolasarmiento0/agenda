import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TeslaAlert from '../components/TeslaAlert';
import { AlertProvider, useAlert } from '../context/AlertContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { BusinessProvider } from '../context/BusinessContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

function GlobalGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileLoaded, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  // Latch: becomes true once the first cold-start load completes, never resets.
  // This prevents GlobalGuard from unmounting <Stack> on subsequent auth events
  // (TOKEN_REFRESHED, re-login, etc.), preserving navigation history.
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  useEffect(() => {
    if (!loading && profileLoaded && !hasBootstrapped) {
      setHasBootstrapped(true);
    }
  }, [loading, profileLoaded, hasBootstrapped]);

  useEffect(() => {
    console.log('🛡️  GLOBALGUARD STATE ─────────────────');
    console.log('   loading         :', loading);
    console.log('   profileLoaded   :', profileLoaded);
    console.log('   hasBootstrapped :', hasBootstrapped);
    console.log('   session         :', session ? `✅ ${session.user.id}` : '❌ null');
    console.log('   profile         :', profile ? `✅ role=${profile.role}` : '❌ null');
    if (!hasBootstrapped) console.log('   ⏳ BLOQUEADO → cold start inicial');
    if (hasBootstrapped)  console.log('   ✅ GUARD OK → renderizando hijos');
    console.log('─────────────────────────────────────');
  }, [loading, profileLoaded, session, profile, hasBootstrapped]);

  useEffect(() => {
    if (session && profileLoaded && !profile && !loading) {
      showAlert({
        title: 'Error de Conexión',
        message: 'No pudimos cargar tu perfil. Verifica tu conexión a internet.',
        buttons: [
          { text: 'CERRAR SESIÓN', style: 'cancel', onPress: () => signOut() },
          {
            text: 'RECARGAR',
            onPress: () => {
              if (Platform.OS === 'web') {
                window.location.reload();
              } else {
                refreshProfile();
              }
            }
          }
        ]
      });
    }
  }, [session, profileLoaded, profile, loading]);

  if (!hasBootstrapped) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}

function DeepLinkHandler() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url.includes('access_token')) return;
      const fragment = url.split('#')[1] ?? '';
      const query = url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment || query);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Solo redirigir a resetPassword si es un flujo de recuperación de contraseña
        if (type === 'recovery') {
          router.replace('/screens/global/resetPassword' as any);
        }
        // OAuth (Google, etc.) → onAuthStateChange se encarga del routing
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (fontsLoaded) {
    (Text as any).defaultProps = (Text as any).defaultProps ?? {};
    (Text as any).defaultProps.style = { fontFamily: 'Inter_400Regular' };
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
    <ThemeProvider>
      <AlertProvider>
        <ToastProvider>
        <BusinessProvider>
          <AuthProvider>
            {/* DeepLinkHandler dentro de AuthProvider para poder setSession */}
            <DeepLinkHandler />
            <GlobalGuard>
              <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="screens/global/home" />
                <Stack.Screen name="screens/global/loginscreen" />
                <Stack.Screen name="screens/global/signup" />
                <Stack.Screen name="screens/global/forgotPassword" />
                <Stack.Screen name="screens/global/resetPassword" />
                <Stack.Screen name="screens/global/role-select" />
                <Stack.Screen name="screens/roles/company/dashboard-company" />
                <Stack.Screen name="screens/global/profile" />
                <Stack.Screen name="screens/global/privacy" />
                <Stack.Screen name="screens/roles/admin/admin-dashboard" />
                <Stack.Screen name="screens/roles/admin/admin-businesses" />
                <Stack.Screen name="screens/roles/admin/admin-business-detail" />
                <Stack.Screen name="screens/roles/company/business-setup" />
                <Stack.Screen name="screens/roles/company/business-pending" />
                {/* Calendario unificado */}
                <Stack.Screen name="screens/global/calendar" options={{ headerShown: false }} />
                {/* Cliente */}
                <Stack.Screen name="screens/global/explore" />
                <Stack.Screen name="screens/global/my-appointments" />
                <Stack.Screen name="screens/roles/client/client-business-profile" />
                {/* Empresa */}
                <Stack.Screen name="screens/roles/company/company-services" />
                <Stack.Screen name="screens/roles/company/company-employees" />
                <Stack.Screen name="screens/roles/company/company-history" />
                <Stack.Screen name="screens/roles/company/company-business" />
                <Stack.Screen name="screens/roles/company/company-members" options={{ headerShown: false }} />
                <Stack.Screen name="screens/roles/company/company-booking-window" options={{ headerShown: false }} />
                {/* Trabajador */}
                <Stack.Screen name="screens/roles/worker/worker-dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="screens/roles/worker/worker-history" options={{ headerShown: false }} />
                {/* Admin */}
                <Stack.Screen name="screens/roles/admin/admin-business-employees" options={{ headerShown: false }} />
                {/* Global */}
                <Stack.Screen name="screens/global/inbox" options={{ headerShown: false }} />
              </Stack>
            </GlobalGuard>
            <TeslaAlert />
            <StatusBar style="auto" />
          </AuthProvider>
        </BusinessProvider>
        </ToastProvider>
      </AlertProvider>
    </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
