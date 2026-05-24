import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../../../components/GlassCard';
import ScreenHeader from '../../../../components/ScreenHeader';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';
import { getGreeting } from '../../../../utils/helpers';

export default function ClientDashboardScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          business:businesses(name, address)
        `)
        .eq('client_id', profile.id)
        .in('status', ['scheduled', 'pending'])
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNextAppointment(data);
      } else {
        setNextAppointment(null);
      }
    } catch (err) {
      console.error('Error fetching client dashboard data:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [profile?.id]);

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} a las ${timeStr}`;
  };

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="DASHBOARD" onLeft={() => setSidebarVisible(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          {/* WELCOME */}
          <View style={{ marginBottom: 8 }}>
            <Text style={[appStyles.wd_welcomeText, { color: colors.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[appStyles.wd_businessName, { color: colors.textPrimary }]}>{profile?.nickname || 'Cliente'}</Text>
          </View>

          {/* PRÓXIMA CITA */}
          <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary, marginTop: 8 }]}>Próxima Cita</Text>
          {nextAppointment ? (
            <GlassCard style={[appStyles.wd_card, { padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, fontFamily: 'Inter_700Bold' }}>
                    {(nextAppointment.business as any)?.name || 'Negocio'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>
                    {(nextAppointment.business as any)?.address || 'Dirección no disponible'}
                  </Text>
                </View>
                <View style={{ backgroundColor: nextAppointment.status === 'scheduled' ? appColors.primary + '20' : '#EAB30820', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: nextAppointment.status === 'scheduled' ? appColors.primary : '#EAB308' }}>
                    {nextAppointment.status === 'scheduled' ? 'CONFIRMADA' : 'PENDIENTE'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Feather name="calendar" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                  {formatDateTime(nextAppointment.start_time)}
                </Text>
              </View>

              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/screens/global/my-appointments')}
                style={{ backgroundColor: colors.surface, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, letterSpacing: 1 }}>VER DETALLES</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <GlassCard style={[appStyles.wd_card, { padding: 24, alignItems: 'center' }]}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
              </View>
              <Text style={{ fontSize: 15, color: colors.textPrimary, fontWeight: '600', marginBottom: 4, fontFamily: 'Inter_600SemiBold' }}>No tienes citas próximas</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                Explora negocios y reserva tu próxima sesión ahora.
              </Text>
            </GlassCard>
          )}

          {/* ACCIONES RÁPIDAS */}
          <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary, marginTop: 16 }]}>Acciones Rápidas</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/screens/global/explore')}
              style={{ flex: 1 }}
            >
              <GlassCard style={[appStyles.wd_card, { padding: 20, alignItems: 'center', minHeight: 140, justifyContent: 'center' }]}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: appColors.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Feather name="search" size={24} color={appColors.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>Nueva Cita</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>Descubrir negocios</Text>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/screens/global/my-appointments')}
              style={{ flex: 1 }}
            >
              <GlassCard style={[appStyles.wd_card, { padding: 20, alignItems: 'center', minHeight: 140, justifyContent: 'center' }]}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                  <Feather name="list" size={24} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>Mis Reservas</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>Historial y agendadas</Text>
              </GlassCard>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}
