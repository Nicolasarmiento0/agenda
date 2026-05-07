import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { appStyles } from '../styles/appStyles';

export default function Index() {
  const { session, profile, business, loading, profileLoaded, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    console.log('=== INDEX DEBUG ===');
    console.log('loading:', loading);
    console.log('profileLoaded:', profileLoaded);
    console.log('session:', session?.user?.id);
    console.log('profile:', profile);
    console.log('role:', profile?.role);
    console.log('business:', business);

    if (loading) return;
    if (!profileLoaded) return;

    if (session && !profile) {
      console.log('INDEX: Session exists but profile is still null');
      return;
    }

    if (!session) {
      console.log('INDEX: No session, redirecting to Home');
      setTimeout(() => {
        router.replace('/screens/global/home' as any);
      }, 0);
      return;
    }

    console.log('INDEX: Redirecting based on role:', profile?.role);
    console.log('INDEX: Business state:', business?.id, 'Status:', business?.status);

    if (!profile?.role) {
      console.log('INDEX: No role found, redirecting to Role Select');
      setTimeout(() => router.replace('/screens/global/role-select' as any), 0);
    } else if (profile.role === 'admin') {
      console.log('INDEX: Admin role, redirecting to Admin Dashboard');
      setTimeout(() => router.replace('/screens/roles/admin/admin-dashboard' as any), 0);
    } else if (profile.role === 'client') {
      console.log('INDEX: Client role, redirecting to Explore');
      setTimeout(() => router.replace('/screens/global/explore' as any), 0);
    } else if (profile.role === 'company') {
      if (!business) {
        console.log('INDEX: Company role but NO business found, redirecting to Business Setup');
        setTimeout(() => router.replace('/screens/roles/company/business-setup' as any), 0);
      } else if (business.status === 'pending' || business.status === 'rejected') {
        console.log('INDEX: Company role, business is pending/rejected, redirecting to Business Pending');
        setTimeout(() => router.replace('/screens/roles/company/business-pending' as any), 0);
      } else {
        console.log('INDEX: Company role, business is approved, redirecting to Company Agenda');
        setTimeout(() => router.replace('/screens/roles/company/company-agenda' as any), 0);
      }
    } else {
      console.log('INDEX: Unknown role, redirecting to Home');
      setTimeout(() => router.replace('/screens/global/home' as any), 0);
    }
  }, [loading, session, profile, business, profileLoaded, rootNavigationState?.key]);

  useEffect(() => {
    if (session && profileLoaded && !profile && !loading) {
      showAlert({
        title: 'Error de Conexión',
        message: 'No pudimos cargar tu perfil. Verifica tu conexión a internet.',
        buttons: [
          { 
            text: 'CERRAR SESIÓN', 
            style: 'cancel',
            onPress: () => signOut() 
          },
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

  // Si hay error, mostramos el indicador mientras el usuario decide en la alerta
  if (session && profileLoaded && !profile && !loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
    </View>
  );
}