import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { appStyles } from '../styles/appStyles';

export default function Index() {
  const { session, profile, business, loading, profileLoaded, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
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
      router.replace('/screens/home' as any);
      return;
    }

    console.log('INDEX: Redirecting based on role:', profile?.role);
    console.log('INDEX: Business state:', business?.id, 'Status:', business?.status);

    if (!profile?.role) {
      console.log('INDEX: No role found, redirecting to Role Select');
      router.replace('/screens/role-select' as any);
    } else if (profile.role === 'admin') {
      console.log('INDEX: Admin role, redirecting to Admin Dashboard');
      router.replace('/screens/admin-dashboard' as any);
    } else if (profile.role === 'client') {
      console.log('INDEX: Client role, redirecting to Explore');
      router.replace('/screens/explore' as any);
    } else if (profile.role === 'company') {
      if (!business) {
        console.log('INDEX: Company role but NO business found, redirecting to Business Setup');
        router.replace('/screens/business-setup' as any);
      } else if (business.status === 'pending' || business.status === 'rejected') {
        console.log('INDEX: Company role, business is pending/rejected, redirecting to Business Pending');
        router.replace('/screens/business-pending' as any);
      } else {
        console.log('INDEX: Company role, business is approved, redirecting to Company Agenda');
        router.replace('/screens/company-agenda' as any);
      }
    } else {
      console.log('INDEX: Unknown role, redirecting to Home');
      router.replace('/screens/home' as any);
    }
  }, [loading, session, profile, business, profileLoaded]);

  if (session && profileLoaded && !profile && !loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={[appStyles.title, { color: colors.textPrimary, textAlign: 'center', fontSize: 20 }]}>
          Error de Conexión
        </Text>
        {/* ✅ Corregido: appStyles.subtitle no existe, se usa subtitleCentered */}
        <Text style={[appStyles.subtitleCentered, { color: colors.textSecondary, marginBottom: 24 }]}>
          No pudimos cargar tu perfil. Verifica tu conexión a internet.
        </Text>
        <TouchableOpacity
          style={[appStyles.primaryButton, { width: '100%', marginBottom: 12 }]}
          onPress={() => refreshProfile()}
        >
          <Text style={appStyles.primaryButtonText}>REINTENTAR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[appStyles.secondaryButton, { width: '100%' }]}
          onPress={() => signOut()}
        >
          <Text style={appStyles.secondaryButtonText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
    </View>
  );
}