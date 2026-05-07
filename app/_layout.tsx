import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import TeslaAlert from '../components/TeslaAlert';
import { AlertProvider, useAlert } from '../context/AlertContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { BusinessProvider } from '../context/BusinessContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

function GlobalGuard({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileLoaded, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

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

  // Si está cargando la sesión inicial (especialmente en Web tras F5), bloqueamos el renderizado de las pantallas
  // para que no se muestren vacías ni "pierdan la información del user".
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  // Si ocurrió un error (sin perfil), mostramos solo el loader de fondo mientras la alerta está visible
  if (session && profileLoaded && !profile && !loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return <>{children}</>;
}

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
      router.replace('/screens/global/resetPassword' as any);
    }
  };

  return (
    <ThemeProvider>
      <AlertProvider>
        <BusinessProvider>
          <AuthProvider>
            <GlobalGuard>
              <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="screens/dashboard" />
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
                {/* Cliente */}
                <Stack.Screen name="screens/global/explore" />
                <Stack.Screen name="screens/global/my-appointments" />
                <Stack.Screen name="screens/roles/client/client-business-profile" />
                <Stack.Screen name="screens/roles/client/client-agenda" />
                {/* Empresa */}
                <Stack.Screen name="screens/roles/company/company-agenda" />
                <Stack.Screen name="screens/roles/company/company-services" />
                <Stack.Screen name="screens/roles/company/company-employees" />
                <Stack.Screen name="screens/roles/company/company-history" />
                <Stack.Screen name="screens/roles/company/company-business" />
              </Stack>
            </GlobalGuard>
            <StatusBar style="auto" />
          </AuthProvider>
          <TeslaAlert />
        </BusinessProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}