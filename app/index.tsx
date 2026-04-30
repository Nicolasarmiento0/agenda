import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';


export default function Index() {
  const { session, profile, loading, profileLoaded } = useAuth();

  useEffect(() => {
    console.log('=== INDEX DEBUG ===');
    console.log('loading:', loading);
    console.log('profileLoaded:', profileLoaded);
    console.log('session:', session?.user?.id);
    console.log('profile:', profile);
    console.log('role:', profile?.role);

    if (loading) return;

    if (!session) {
      router.replace('/screens/home');
      return;
    }

    if (!profileLoaded) return;

    if (!profile?.role) {
      router.replace('/screens/role-select');
    } else if (profile.role === 'company') {
      router.replace('/screens/dashboard-company');
    } else {
      router.replace('/screens/dashboard');
    }
  }, [loading, session, profile, profileLoaded]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}