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
    console.log('🏠 INDEX STATE ───────────────────────');
    console.log('   loading            :', loading);
    console.log('   profileLoaded      :', profileLoaded);
    console.log('   rootNavigation.key :', rootNavigationState?.key ?? '❌ null (nav no lista)');
    console.log('   session            :', session ? `✅ ${session.user.id}` : '❌ null');
    console.log('   profile.role       :', profile?.role ?? '❌ null');
    console.log('   business.status    :', business?.status ?? 'N/A');

    if (!rootNavigationState?.key) console.log('   ⏳ BLOQUEADO → navegación no inicializada');
    else if (loading)              console.log('   ⏳ BLOQUEADO → loading=true');
    else if (!profileLoaded)       console.log('   ⏳ BLOQUEADO → profileLoaded=false');
    else if (session && !profile)  console.log('   ⏳ BLOQUEADO → session existe pero profile=null');
    else                           console.log('   ✅ INDEX LIBRE → procesando redirección...');
    console.log('─────────────────────────────────────');
  }, [loading, profileLoaded, session, profile, business, rootNavigationState?.key]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

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

  // Si hay error (y GlobalGuard dejó pasar por alguna razón), mostramos el indicador
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