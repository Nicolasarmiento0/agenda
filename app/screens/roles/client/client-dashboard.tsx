import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
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
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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
          workers(name, profiles(avatar_url))
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

        const slicedUpcoming = upcoming.slice(0, 5);
        setUpcomingAppointments(slicedUpcoming);
        
        // Auto-seleccionar la cita más próxima si no hay ninguna seleccionada
        if (slicedUpcoming.length > 0) {
          setSelectedApptId((prev) => {
            const exists = slicedUpcoming.some(u => u.id === prev);
            return exists ? prev : slicedUpcoming[0].id;
          });
        } else {
          setSelectedApptId(null);
        }
      } else {
        setUpcomingAppointments([]);
        setSelectedApptId(null);
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
    if (selectedApptId) {
      try {
        const { data } = await supabase
          .from('appointment_activities')
          .select('*')
          .eq('appointment_id', selectedApptId)
          .order('created_at', { ascending: true });
        if (data) setActivities(data);
      } catch (e) {
        console.error('Error refreshing activities:', e);
      }
    }
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

  useEffect(() => {
    const fetchActivities = async () => {
      if (!selectedApptId) {
        setActivities([]);
        return;
      }
      setActivitiesLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointment_activities')
          .select('*')
          .eq('appointment_id', selectedApptId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching activities:', error.message);
          setActivities([]);
        } else if (data) {
          setActivities(data);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchActivities();
  }, [selectedApptId]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Citas Próximas</Text>
              {upcomingAppointments.length > 0 && (
                <View style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>{upcomingAppointments.length}</Text>
                </View>
              )}
            </View>
            {upcomingAppointments.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/screens/global/my-appointments')} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent, fontFamily: 'Inter_600SemiBold' }}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appt) => {
              const group = getRelativeGroup(appt.start_time);
              const isSelected = selectedApptId === appt.id;
              return (
                <TouchableOpacity
                  key={appt.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedApptId(appt.id)}
                >
                  <GlassCard style={[
                    appStyles.wd_card, 
                    { 
                      padding: 18, 
                      borderLeftWidth: 4, 
                      borderLeftColor: group.color,
                      borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
                      borderColor: isSelected ? group.color : colors.border
                    }
                  ]}>
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

          {/* DETALLE DE CITA RASTREADOR */}
          {(() => {
            if (upcomingAppointments.length === 0 || !selectedApptId) return null;
            const appt = upcomingAppointments.find(a => a.id === selectedApptId);
            if (!appt) return null;

            // Formateadores de fecha y hora
            const formatDetailDate = (isoString: string) => {
              try {
                const d = new Date(isoString);
                const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
                const day = d.getDate();
                const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
                const year = d.getFullYear();
                const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                return `${capitalizedWeekday}, ${day} ${month} ${year}`;
              } catch (e) {
                return appt.date;
              }
            };

            const formatDetailTime = (isoString: string) => {
              try {
                const d = new Date(isoString);
                let hours = d.getHours();
                const minutes = d.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                const minutesStr = String(minutes).padStart(2, '0');
                return `${hours}:${minutesStr} ${ampm}`;
              } catch (e) {
                return String(appt.start_hour);
              }
            };

            const getInitials = (name: string) => {
              if (!name) return 'CM';
              return name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            };

            const workerName = appt.workers?.name || 'Carlos Méndez';
            const initials = getInitials(workerName);

            // Determinar estados del Timeline
            const isPending = appt.status === 'pending';
            const isConfirmed = appt.status === 'confirmed' || appt.status === 'rescheduled';
            const isCompleted = appt.status === 'completed';

            const step1Active = true;
            const step1Color = '#FF9F0A'; // Orange/Yellow
            
            const step2Active = isConfirmed || isCompleted;
            const step2Color = '#30D158'; // Green

            const step3Active = isCompleted;
            const step3Color = '#636366'; // Gray standard

            return (
              <View style={{ gap: 16, marginTop: 8 }}>
                <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Detalle de Cita</Text>
                
                <GlassCard style={{ padding: 20 }}>
                  <View style={{ gap: 20 }}>
                    {/* Header de Cita: Barber info & Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {/* Avatar con Glow */}
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          shadowColor: '#3B82F6',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 10,
                          elevation: 5,
                        }}>
                          {appt.workers?.profiles?.avatar_url ? (
                            <Image
                              source={{ uri: appt.workers.profiles.avatar_url }}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                borderWidth: 2,
                                borderColor: '#3B82F6',
                              }}
                            />
                          ) : (
                            <View style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              backgroundColor: '#1E3A8A',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 2,
                              borderColor: '#3B82F6',
                            }}>
                              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' }}>{initials}</Text>
                            </View>
                          )}
                        </View>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }}>{workerName}</Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>Barbero · Agenda App</Text>
                        </View>
                      </View>
                      
                      {/* Badge */}
                      <View style={{
                        backgroundColor: isCompleted ? 'rgba(255,255,255,0.06)' : isConfirmed ? '#EEF8F015' : '#FFF5E515',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isCompleted ? colors.border : isConfirmed ? '#30D15840' : '#FF9F0A40',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isCompleted ? colors.textSecondary : isConfirmed ? '#30D158' : '#FF9F0A',
                          fontFamily: 'Inter_700Bold',
                        }}>
                          {isCompleted ? 'Completado' : isConfirmed ? 'Confirmado' : 'Pendiente'}
                        </Text>
                      </View>
                    </View>

                    {/* Grid de Servicio, Precio, Fecha, Hora */}
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>SERVICIO</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>{appt.service}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>PRECIO</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }}>
                            {(() => {
                              const priceNum = parseFloat(appt.price || 0);
                              return priceNum % 1 === 0 ? `$${Math.round(priceNum)}` : `$${priceNum.toFixed(2)}`;
                            })()}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>FECHA</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>{formatDetailDate(appt.start_time)}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, letterSpacing: 1, fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>HORA</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }}>{formatDetailTime(appt.start_time)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Estado de la Cita Timeline */}
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
                      <Text style={{ fontSize: 11, letterSpacing: 1.5, color: colors.textSecondary, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>ESTADO DE LA CITA</Text>
                      
                      <View>
                        {/* Step 1: Solicitud enviada */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: 65 }}>
                          <View style={{ alignItems: 'center', marginRight: 16, width: 32 }}>
                            <View style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: step1Active ? step1Color + '20' : 'transparent',
                              borderWidth: 2,
                              borderColor: step1Active ? step1Color : colors.border,
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: step1Active ? step1Color : 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.8,
                              shadowRadius: 6,
                              elevation: step1Active ? 4 : 0,
                            }}>
                              <Ionicons name="sparkles" size={14} color={step1Active ? step1Color : colors.textSecondary} />
                            </View>
                            <View style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: step2Active ? step1Color : colors.border,
                              marginVertical: 4,
                              minHeight: 25,
                            }} />
                          </View>
                          <View style={{ flex: 1, paddingTop: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Inter_700Bold' }}>Solicitud enviada</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1, fontFamily: 'Inter_400Regular' }}>Esperando confirmación del barbero</Text>
                          </View>
                        </View>

                        {/* Step 2: Confirmado */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: 65 }}>
                          <View style={{ alignItems: 'center', marginRight: 16, width: 32 }}>
                            <View style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: step2Active ? step2Color + '20' : 'transparent',
                              borderWidth: 2,
                              borderColor: step2Active ? step2Color : colors.border,
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: step2Active ? step2Color : 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.8,
                              shadowRadius: 6,
                              elevation: step2Active ? 4 : 0,
                            }}>
                              <Ionicons name="checkmark" size={16} color={step2Active ? step2Color : colors.textSecondary} />
                            </View>
                            <View style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: step3Active ? step2Color : colors.border,
                              marginVertical: 4,
                              minHeight: 25,
                            }} />
                          </View>
                          <View style={{ flex: 1, paddingTop: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: step2Active ? colors.textPrimary : colors.textSecondary, fontFamily: 'Inter_700Bold' }}>Confirmado</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1, fontFamily: 'Inter_400Regular' }}>El barbero aceptó tu cita</Text>
                          </View>
                        </View>

                        {/* Step 3: Completado */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <View style={{ alignItems: 'center', marginRight: 16, width: 32 }}>
                            <View style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: step3Active ? 'rgba(255,255,255,0.06)' : 'transparent',
                              borderWidth: 2,
                              borderColor: step3Active ? colors.textSecondary : colors.border,
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: step3Active ? colors.textSecondary : 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.8,
                              shadowRadius: 6,
                              elevation: step3Active ? 4 : 0,
                            }}>
                              <Ionicons name="star" size={14} color={step3Active ? colors.textSecondary : colors.textSecondary} />
                            </View>
                          </View>
                          <View style={{ flex: 1, paddingTop: 4 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: step3Active ? colors.textPrimary : colors.textSecondary, fontFamily: 'Inter_700Bold' }}>Completado</Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1, fontFamily: 'Inter_400Regular' }}>Servicio realizado con éxito</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Actividad Log List */}
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }}>
                      <Text style={{ fontSize: 11, letterSpacing: 1.5, color: colors.textSecondary, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 16 }}>ACTIVIDAD</Text>
                      
                      {activitiesLoading ? (
                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>Cargando actividad...</Text>
                      ) : activities.length > 0 ? (
                        <View>
                          {activities.map((act, idx) => {
                            const isLast = idx === activities.length - 1;
                            
                            // Formatear fecha y hora relativa
                            const formatActivityTimestamp = (isoString: string) => {
                              try {
                                const actDate = new Date(isoString);
                                const nowVal = new Date();
                                
                                const todayVal = new Date(nowVal.getFullYear(), nowVal.getMonth(), nowVal.getDate());
                                const yesterdayVal = new Date(todayVal);
                                yesterdayVal.setDate(yesterdayVal.getDate() - 1);
                                
                                const targetVal = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
                                
                                let datePartVal = '';
                                if (targetVal.getTime() === todayVal.getTime()) {
                                  datePartVal = 'Hoy';
                                } else if (targetVal.getTime() === yesterdayVal.getTime()) {
                                  datePartVal = 'Ayer';
                                } else {
                                  datePartVal = actDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
                                }
                                
                                let hr = actDate.getHours();
                                const min = actDate.getMinutes();
                                const ap = hr >= 12 ? 'PM' : 'AM';
                                hr = hr % 12;
                                hr = hr ? hr : 12;
                                const minStr = String(min).padStart(2, '0');
                                
                                return `${datePartVal}, ${hr}:${minStr} ${ap}`;
                              } catch (e) {
                                return '';
                              }
                            };

                            return (
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: 50 }} key={act.id}>
                                <View style={{ alignItems: 'center', marginRight: 12, width: 12 }}>
                                  <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#3b82f6',
                                    marginTop: 6,
                                    shadowColor: '#3b82f6',
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.8,
                                    shadowRadius: 4,
                                    elevation: 3,
                                  }} />
                                  {!isLast && (
                                    <View style={{
                                      width: 1,
                                      flex: 1,
                                      backgroundColor: colors.border,
                                      marginVertical: 4,
                                      minHeight: 30,
                                    }} />
                                  )}
                                </View>
                                <View style={{ flex: 1, paddingBottom: 12 }}>
                                  <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                                    {act.title}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, fontFamily: 'Inter_400Regular' }}>
                                    {formatActivityTimestamp(act.created_at)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>Sin registros de actividad.</Text>
                      )}
                    </View>
                  </View>
                </GlassCard>
              </View>
            );
          })()}

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
