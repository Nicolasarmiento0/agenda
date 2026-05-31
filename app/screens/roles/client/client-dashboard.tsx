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
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          start_hour,
          status,
          service,
          price,
          business:businesses(name, address),
          workers(name)
        `)
        .eq('client_id', profile.id)
        .in('status', ['confirmed', 'pending', 'rescheduled'])
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('start_hour', { ascending: true });

      if (error) {
        console.error('Error fetching client dashboard data:', error.message);
        setUpcomingAppointments([]);
        return;
      }

      if (data) {
        // Procesar y reconstruir start_time en memoria
        const processed = data.map((appt: any) => {
          const hours = Math.floor(appt.start_hour);
          const minutes = Math.round((appt.start_hour % 1) * 60);
          const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
          const apptDate = new Date(`${appt.date}T${timeStr}`);
          
          return {
            ...appt,
            start_time: apptDate.toISOString()
          };
        });

        // Filtrar las que son verdaderamente futuras (descartar horas pasadas de hoy)
        const now = new Date();
        const upcoming = processed.filter(
          (appt) => new Date(appt.start_time).getTime() >= now.getTime()
        );

        setUpcomingAppointments(upcoming.slice(0, 5));
      } else {
        setUpcomingAppointments([]);
      }
    } catch (err) {
      console.error('Error fetching client dashboard data:', err);
    }
  };

  const getRelativeGroup = (isoString: string) => {
    const now = new Date();
    const apptDate = new Date(isoString);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { label: 'HOY', color: '#FF4B4B', bg: '#FF4B4B15' };
    if (diffDays === 1) return { label: 'MAÑANA', color: '#FF7A00', bg: '#FF7A0015' };
    if (diffDays > 1 && diffDays <= 7) return { label: 'ESTA SEMANA', color: '#B4F736', bg: '#B4F73620' };
    if (diffDays > 7 && diffDays <= 14) return { label: 'PRÓXIMA SEMANA', color: '#00D8F6', bg: '#00D8F615' };
    return { label: 'MÁS ADELANTE', color: '#9CA3AF', bg: '#9CA3AF15' };
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

          {/* PRÓXIMAS CITAS */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary }]}>Citas Próximas</Text>
            {upcomingAppointments.length > 0 && (
              <View style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{upcomingAppointments.length}</Text>
              </View>
            )}
          </View>

          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appt) => {
              const group = getRelativeGroup(appt.start_time);
              return (
                <TouchableOpacity
                  key={appt.id}
                  activeOpacity={0.8}
                  onPress={() => router.push('/screens/global/my-appointments')}
                >
                  <GlassCard style={[appStyles.wd_card, { padding: 18, borderLeftWidth: 4, borderLeftColor: group.color }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                          {(appt.business as any)?.name || 'Negocio'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {(appt.business as any)?.address || 'Dirección no disponible'}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {/* Grupo Temporal */}
                        <View style={{ backgroundColor: group.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: group.color, letterSpacing: 0.5 }}>
                            {group.label}
                          </Text>
                        </View>
                        {/* Estado */}
                        <View style={{ backgroundColor: appt.status === 'confirmed' ? appColors.primary + '15' : '#EAB30815', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: appt.status === 'confirmed' ? appColors.primary : '#EAB308', letterSpacing: 0.5 }}>
                            {appt.status === 'confirmed' ? 'CONFIRMADA' : 'PENDIENTE'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                          {formatDateTime(appt.start_time)}
                        </Text>
                      </View>
                      
                      {appt.workers?.name && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="user" size={14} color={colors.textSecondary} />
                          <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                            {appt.workers.name.split(' ')[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })
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
