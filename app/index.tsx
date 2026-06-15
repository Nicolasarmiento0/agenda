import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { appStyles } from '../styles/appStyles';

const PENDING_BOOKING_KEY = 'pendingBooking';

export default function Index() {
  const { session, profile, business, loading, profileLoaded, refreshProfile, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    if (loading) return;
    if (!profileLoaded) return;

    if (session && !profile) {
      return;
    }

    if (!session) {
      setTimeout(() => {
        router.replace('/home');
      }, 0);
      return;
    }

    if (!profile?.role) {
      setTimeout(() => router.replace('/role-select'), 0);
    } else if (profile.role === 'admin') {
      setTimeout(() => router.replace('/admin-dashboard'), 0);
    } else if (profile.role === 'client') {
      // Redirect to pending booking if the user came from a public business landing
      AsyncStorage.getItem(PENDING_BOOKING_KEY).then((raw) => {
        if (raw) {
          try {
            const { businessId } = JSON.parse(raw);
            AsyncStorage.removeItem(PENDING_BOOKING_KEY);
            setTimeout(() => router.replace(`/calendar?businessId=${businessId}` as any), 0);
          } catch {
            setTimeout(() => router.replace('/client-dashboard'), 0);
          }
        } else {
          setTimeout(() => router.replace('/client-dashboard'), 0);
        }
      });
    } else if (profile.role === 'company') {
      if (!business) {
        setTimeout(() => router.replace('/business-setup'), 0);
      } else if (business.status === 'pending' || business.status === 'rejected') {
        setTimeout(() => router.replace('/business-pending'), 0);
      } else {
        setTimeout(() => router.replace('/dashboard-company'), 0);
      }
    } else if (profile.role === 'worker') {
      setTimeout(() => router.replace('/worker-dashboard'), 0);
    } else {
      setTimeout(() => router.replace('/home'), 0);
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