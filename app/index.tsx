import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';


export default function Index() {
  const { session, profile, business, loading, profileLoaded } = useAuth();

  useEffect(() => {
    console.log('=== INDEX DEBUG ===');
    console.log('loading:', loading);
    console.log('profileLoaded:', profileLoaded);
    console.log('session:', session?.user?.id);
    console.log('profile:', profile);
    console.log('role:', profile?.role);
    console.log('business:', business);

    if (loading) return;

    if (!session) {
      router.replace('/screens/home' as any);
      return;
    }

    if (!profileLoaded) return;

    if (!profile?.role) {
      router.replace('/screens/role-select' as any);
    } else if (profile.role === 'admin') {
      router.replace('/screens/admin-dashboard' as any);
    } else if (profile.role === 'company') {
      if (!business) {
        router.replace('/screens/business-setup' as any);
      } else if (business.status === 'pending' || business.status === 'rejected') {
        router.replace('/screens/business-pending' as any);
      } else {
        router.replace('/screens/dashboard-company' as any);
      }
    } else {
      router.replace('/screens/dashboard' as any);
    }
  }, [loading, session, profile, business, profileLoaded]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}