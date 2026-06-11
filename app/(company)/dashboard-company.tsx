import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReviewsModal from '../../components/company/ReviewsModal';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import WorkerAvatar from '../../components/WorkerAvatar';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useIsGym } from '../../hooks/useIsGym';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';
import { getGreeting } from '../../utils/helpers';

const GYM_PLAN_PRICE: Record<string, number> = { basic: 15000, premium: 25000, vip: 35000 };

type TimeFilter = 'daily' | 'weekly' | 'monthly';

const toLocalDateStr = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
};

export default function DashboardCompanyScreen() {
  const { profile, business, refreshProfile } = useAuth();
  const { setSelectedBusiness } = useBusiness();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const isGym = useIsGym();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSuspended = business?.status === 'suspended';

  const handleSuspendedAction = () => {
    showAlert({
      title: 'Acción Bloqueada',
      message: 'Tu negocio se encuentra suspendido. Comunícate con el administrador para reactivar tu cuenta.',
    });
  };

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([]);
  const [workerData, setWorkerData] = useState<any[]>([]);

  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const [gymStats, setGymStats] = useState({ basic: 0, premium: 0, vip: 0, revenue: 0, prices: GYM_PLAN_PRICE });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const activeRequestToken = useRef<number>(0);

  const getRelativeGroup = (isoString: string) => {
    const now = new Date();
    const apptDate = new Date(isoString);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'HOY', color: '#FF4B4B', bg: '#FF4B4B15' };
    if (diffDays === 1) return { label: 'MAÑANA', color: '#FF7A00', bg: '#FF7A0015' };
    if (diffDays <= 7) return { label: 'ESTA SEMANA', color: '#B4F736', bg: '#B4F73620' };
    if (diffDays <= 14) return { label: 'PRÓXIMA SEMANA', color: '#00D8F6', bg: '#00D8F615' };
    return { label: 'MÁS ADELANTE', color: '#9CA3AF', bg: '#9CA3AF15' };
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} a las ${timeStr}`;
  };

  const SCHEDULE_DATA = React.useMemo(() => {
    const days = [
      { id: '1', day: 'L' }, { id: '2', day: 'M' }, { id: '3', day: 'X' },
      { id: '4', day: 'J' }, { id: '5', day: 'V' }, { id: '6', day: 'S' }, { id: '7', day: 'D' }
    ];

    if ((business as any)?.schedule) {
      return days.map(d => ({
        day: d.day,
        active: Array.isArray(((business as any).schedule)[d.id]) && ((business as any).schedule)[d.id].length > 0
      }));
    }

    // Fallback if no schedule
    return days.map(d => ({ day: d.day, active: d.day !== 'D' }));
  }, [(business as any)?.schedule]);

  const [filter, setFilter] = useState<TimeFilter>('daily');

  const fetchDashboardData = useCallback(async () => {
    if (!business?.id) return;
    const token = ++activeRequestToken.current;

    if (isGym) {
      const { data: servicesData } = await supabase
        .from('business_services')
        .select('name, price')
        .eq('business_id', business.id);

      if (token !== activeRequestToken.current) return;

      const currentPrices = {
        basic: servicesData?.find((s: any) => s.name === 'Plan Básico')?.price || GYM_PLAN_PRICE.basic,
        premium: servicesData?.find((s: any) => s.name === 'Plan Premium')?.price || GYM_PLAN_PRICE.premium,
        vip: servicesData?.find((s: any) => s.name === 'Plan VIP')?.price || GYM_PLAN_PRICE.vip,
      };

      const { data: members } = await supabase
        .from('gym_memberships')
        .select('plan')
        .eq('business_id', business.id)
        .eq('status', 'active');

      if (token !== activeRequestToken.current) return;

      const stats = { basic: 0, premium: 0, vip: 0, revenue: 0, prices: currentPrices };
      (members ?? []).forEach((m: any) => {
        if (m.plan === 'basic') stats.basic++;
        else if (m.plan === 'premium') stats.premium++;
        else if (m.plan === 'vip') stats.vip++;
        if (m.plan in currentPrices) stats.revenue += currentPrices[m.plan as keyof typeof currentPrices];
      });
      setGymStats(stats);
    }

    const { data: workers } = await supabase
      .from('workers')
      .select('*, profiles(avatar_url)')
      .eq('business_id', business.id)
      .eq('active', true);

    if (token !== activeRequestToken.current) return;

    const today = new Date();
    let startDate = new Date();

    if (timeFilter === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'weekly') {
      const dow = today.getDay();
      startDate.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, start_hour, price, worker_id, status')
      .eq('business_id', business.id)
      .gte('date', toLocalDateStr(startDate));

    if (token !== activeRequestToken.current) return;

    const { data: reviews } = await supabase
      .from('reviews')
      .select('score, comment, created_at, profiles(nickname)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (token !== activeRequestToken.current) return;

    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.score, 0);
      const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
      setReviewsData({
        score: parseFloat((sum / reviews.length).toFixed(1)),
        total: reviews.length,
        lastReviewDate: formatter.format(new Date(reviews[0].created_at)),
      });
      setReviewsList(reviews);
    } else {
      setReviewsData({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
      setReviewsList([]);
    }

    if (workers && appointments) {
      setWorkerData(workers.map((w: any) => ({
        id: w.id,
        name: w.name,
        role: w.specialty || 'Especialista',
        services: appointments.filter(a => a.worker_id === w.id).length,
        color: w.color || '#3B7BE0',
        avatar_url: w.profiles?.avatar_url ?? null,
      })));

      const newRevData: { label: string; value: number; key?: string | number }[] = [];

      if (timeFilter === 'daily') {
        const blocks = [8, 10, 12, 14, 16, 18, 20];
        blocks.forEach(b => newRevData.push({ label: `${b}h`, value: 0, key: b }));
        appointments.forEach(a => {
          if (a.price && a.status === 'completed' && a.date === toLocalDateStr(today)) {
            const hour = Math.floor(a.start_hour);
            let target = 8;
            for (let i = blocks.length - 1; i >= 0; i--) { if (hour >= blocks[i]) { target = blocks[i]; break; } }
            const idx = newRevData.findIndex(r => r.key === target);
            if (idx !== -1) newRevData[idx].value += a.price;
          }
        });
      } else if (timeFilter === 'weekly') {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          newRevData.push({ label: dayNames[d.getDay()], value: 0, key: toLocalDateStr(d) });
        }
        appointments.forEach(a => {
          if (a.price && a.status === 'completed') {
            const r = newRevData.find(r => r.key === a.date);
            if (r) r.value += a.price;
          }
        });
      } else {
        [1, 2, 3, 4, 5].forEach(i => newRevData.push({ label: `Sem ${i}`, value: 0, key: i }));
        appointments.forEach(a => {
          if (a.price && a.status === 'completed') {
            const dayOfMonth = parseInt(a.date.split('-')[2], 10);
            const weekOfMonth = Math.ceil(dayOfMonth / 7);
            const idx = newRevData.findIndex(r => r.key === Math.min(weekOfMonth, 5));
            if (idx !== -1) newRevData[idx].value += a.price;
          }
        });
      }

      setRevenueData(newRevData.map(({ label, value }) => ({ label, value })));
    }

    // Próximas citas del negocio
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: upcomingData } = await supabase
      .from('appointments')
      .select('id, date, start_hour, status, service, client_name, workers(name)')
      .eq('business_id', business.id)
      .in('status', ['confirmed', 'pending', 'rescheduled'])
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true })
      .limit(8);

    if (token !== activeRequestToken.current) return;

    if (upcomingData) {
      const now = new Date();
      const processed = upcomingData
        .map((appt: any) => {
          const hours = Math.floor(appt.start_hour);
          const minutes = Math.round((appt.start_hour % 1) * 60);
          const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
          return { ...appt, start_time: new Date(`${appt.date}T${timeStr}`).toISOString() };
        })
        .filter((appt) => new Date(appt.start_time).getTime() >= now.getTime());
      setUpcomingAppointments(processed.slice(0, 5));
    } else {
      setUpcomingAppointments([]);
    }
  }, [business?.id, timeFilter, isGym]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchDashboardData();
    setRefreshing(false);
  }, [refreshProfile, fetchDashboardData]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  useEffect(() => {
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    return () => {
      activeRequestToken.current = -1;
    };
  }, []);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="DASHBOARD" onLeft={() => setSidebarVisible(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[styles.businessName, { color: colors.textPrimary }]}>{business?.name || profile?.nickname || 'Empresa'}</Text>
          </View>

          {isSuspended && (
            <GlassCard style={[styles.suspendedBanner, { borderColor: '#EF4444' }]}>
              <View style={styles.suspendedIconContainer}>
                <Feather name="slash" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.suspendedTitle, { color: '#EF4444' }]}>
                  EMPRESA SUSPENDIDA
                </Text>
                <Text style={[styles.suspendedText, { color: colors.textSecondary }]}>
                  Tu cuenta comercial ha sido suspendida temporalmente por el administrador. Todas las funciones de agendamiento y administración se encuentran bloqueadas. Comunícate con soporte para reactivarla.
                </Text>
              </View>
            </GlassCard>
          )}

          {/* ACCESO DIRECTO AGENDA */}
          <GlassCard style={styles.publicBtn}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => isSuspended ? handleSuspendedAction() : router.push('/calendar')}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}
            >
              <View style={[styles.publicBtnIcon, { backgroundColor: appColors.primary + '15' }]}>
                <Feather name="calendar" size={20} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.publicBtnTitle, { color: colors.textPrimary }]}>Agenda de Citas</Text>
                <Text style={[styles.publicBtnSub, { color: colors.textSecondary }]}>Gestiona turnos, reservas y bloqueos</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          {!isGym && (
            <GlassCard style={styles.card}>
              <View style={styles.chartHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 4 }]}>Ingresos Totales</Text>
                  <Text
                    style={[styles.scoreText, { color: colors.textPrimary }]}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    ${revenueData.reduce((sum, item) => sum + item.value, 0).toLocaleString('es-CL')}
                  </Text>
                  <Text style={[styles.subText, { color: colors.textSecondary }]}>
                    en este periodo
                  </Text>
                </View>
                <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
                  {(['daily', 'weekly', 'monthly'] as TimeFilter[]).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      activeOpacity={0.8}
                      onPress={() => setTimeFilter(filter)}
                      style={[styles.filterBtn, timeFilter === filter && { backgroundColor: appColors.primary }]}
                    >
                      <Text style={[styles.filterText, { color: timeFilter === filter ? '#111827' : colors.textSecondary }]}>
                        {filter === 'daily' ? 'Diario' : filter === 'weekly' ? 'Semanal' : 'Mensual'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (isSuspended) {
                    handleSuspendedAction();
                    return;
                  }
                  const rangeParam = timeFilter === 'daily' ? 'day' : timeFilter === 'weekly' ? 'week' : 'month';
                  router.push(`/company-history?range=${rangeParam}` as any);
                }}
                style={[styles.historialCta, { borderTopColor: colors.border, marginTop: 16 }]}
              >
                <Text style={[styles.historialCtaText, { color: appColors.primary }]}>Ver historial completo</Text>
                <Feather name="arrow-right" size={14} color={appColors.primary} />
              </TouchableOpacity>
            </GlassCard>
          )}

          {isGym && (
            <GlassCard style={styles.card}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/company-history')} style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Feather name="users" size={16} color={colors.textSecondary} />
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>MEMBRESÍAS MENSUALES</Text>
                  <Feather name="chevron-right" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </View>
                <Text
                  style={[styles.scoreText, { color: colors.textPrimary }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  ${gymStats.revenue.toLocaleString('es-CL')}
                </Text>
                <Text style={[styles.subText, { color: colors.textSecondary }]}>ingresos estimados del mes</Text>
                <View style={{ gap: 6, marginTop: 12 }}>
                  {gymStats.basic > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.subText, { color: colors.textSecondary }]}>Básico × {gymStats.basic}</Text>
                      <Text style={[styles.subText, { color: colors.textPrimary, fontWeight: '600' }]}>${(gymStats.basic * gymStats.prices.basic).toLocaleString('es-CL')}</Text>
                    </View>
                  )}
                  {gymStats.premium > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.subText, { color: colors.textSecondary }]}>Premium × {gymStats.premium}</Text>
                      <Text style={[styles.subText, { color: colors.textPrimary, fontWeight: '600' }]}>${(gymStats.premium * gymStats.prices.premium).toLocaleString('es-CL')}</Text>
                    </View>
                  )}
                  {gymStats.vip > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[styles.subText, { color: colors.textSecondary }]}>VIP × {gymStats.vip}</Text>
                      <Text style={[styles.subText, { color: colors.textPrimary, fontWeight: '600' }]}>${(gymStats.vip * gymStats.prices.vip).toLocaleString('es-CL')}</Text>
                    </View>
                  )}
                  {gymStats.basic === 0 && gymStats.premium === 0 && gymStats.vip === 0 && (
                    <Text style={[styles.subText, { color: colors.textSecondary, fontStyle: 'italic' }]}>Sin miembros activos aún.</Text>
                  )}
                </View>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* PRÓXIMAS CITAS */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Citas Próximas</Text>
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
                  onPress={() => isSuspended ? handleSuspendedAction() : router.push('/calendar')}
                >
                  <GlassCard style={[styles.card, { padding: 18, borderLeftWidth: 4, borderLeftColor: group.color }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2, fontFamily: 'Inter_700Bold' }} numberOfLines={1}>
                          {appt.client_name || 'Cliente'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {appt.service || 'Servicio'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <View style={{ backgroundColor: group.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: group.color, letterSpacing: 0.5 }}>{group.label}</Text>
                        </View>
                        <View style={{ backgroundColor: appt.status === 'confirmed' ? appColors.primary + '15' : '#EAB30815', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: appt.status === 'confirmed' ? appColors.primary : '#EAB308', letterSpacing: 0.5 }}>
                            {appt.status === 'confirmed' ? 'CONFIRMADA' : appt.status === 'rescheduled' ? 'REPROG.' : 'PENDIENTE'}
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
                      {(appt.workers as any)?.name && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="user" size={14} color={colors.textSecondary} />
                          <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                            {(appt.workers as any).name.split(' ')[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })
          ) : (
            <GlassCard style={[styles.card, { padding: 24, alignItems: 'center' }]}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
              </View>
              <Text style={{ fontSize: 15, color: colors.textPrimary, fontWeight: '600', marginBottom: 4, fontFamily: 'Inter_600SemiBold' }}>Sin citas próximas</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                Las reservas confirmadas aparecerán aquí.
              </Text>
            </GlassCard>
          )}

          <View style={styles.rowGrid}>
            <GlassCard style={[styles.card, styles.flexCard]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowReviewsModal(true)} style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Ionicons name="star" size={16} color="#f0c630ff" />
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>REPUTACIÓN NEGOCIO</Text>
                </View>
                <Text style={[styles.scoreText, { color: colors.textPrimary }]}>{reviewsData.score}</Text>
                <Text style={[styles.subText, { color: colors.textSecondary }]}>{reviewsData.total} opiniones</Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>Última: {reviewsData.lastReviewDate}</Text>
                <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </GlassCard>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.card, styles.flexCard]}
              onPress={() => isSuspended ? handleSuspendedAction() : router.push('/edit-schedule')}
            >
              <GlassCard style={{ padding: 16, borderRadius: 24, flex: 1 }}>
                <View style={[styles.cardHeader, { marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="clock" size={16} color={colors.textSecondary} />
                    <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>HORARIOS</Text>
                  </View>
                  <Feather name="edit-2" size={14} color={colors.textSecondary} />
                </View>
                <View style={[styles.scheduleRow, { backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12 }]}>
                  {SCHEDULE_DATA.map((d, i) => (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 10, color: d.active ? colors.textPrimary : colors.textSecondary, fontWeight: d.active ? '700' : '500' }}>
                        {d.day}
                      </Text>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.active ? appColors.primary : 'transparent' }} />
                    </View>
                  ))}
                </View>
                <Text style={[styles.subText, { color: colors.textSecondary, marginTop: 12 }]}>
                  Horario: {business?.opening_time?.slice(0, 5) || '10:00'} - {business?.closing_time?.slice(0, 5) || '20:00'}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Rendimiento del Equipo</Text>
            {workerData.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>No hay trabajadores registrados o citas recientes.</Text>
            ) : workerData.map((worker, i) => (
              <View key={worker.id} style={[styles.workerRow, i < workerData.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <WorkerAvatar avatarUrl={worker.avatar_url} name={worker.name} color={worker.color} size={44} showDot={false} />
                <View style={styles.workerInfo}>
                  <Text style={[styles.workerName, { color: colors.textPrimary }]}>{worker.name}</Text>
                  <Text style={[styles.workerRole, { color: colors.textSecondary }]}>{worker.role}</Text>
                </View>
                <View style={styles.workerStats}>
                  <Text style={[styles.workerServices, { color: colors.textPrimary }]}>{worker.services}</Text>
                  <Text style={[styles.workerServicesLabel, { color: colors.textSecondary }]}>citas</Text>
                </View>
              </View>
            ))}
          </GlassCard>

          <GlassCard style={styles.publicBtn}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (isSuspended) {
                  handleSuspendedAction();
                  return;
                }
                if (!business) return;
                setSelectedBusiness(business as any);
                router.push(`/client-business-profile?id=${business.id}` as any);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}
            >
              <View style={[styles.publicBtnIcon, { backgroundColor: appColors.primary + '15' }]}>
                <Feather name="external-link" size={20} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.publicBtnTitle, { color: colors.textPrimary }]}>Vista Previa Pública</Text>
                <Text style={[styles.publicBtnSub, { color: colors.textSecondary }]}>Mira cómo te ven tus clientes</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

        </Animated.View>
      </ScrollView>

      <ReviewsModal
        visible={showReviewsModal}
        reviews={reviewsList}
        onClose={() => setShowReviewsModal(false)}
        colors={colors}
      />

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  welcomeText: { fontSize: 14, letterSpacing: 0.5, fontFamily: 'Varien', },
  businessName: { fontSize: 28, fontWeight: '800', fontFamily: 'Varien', letterSpacing: 1, marginTop: 4 },
  card: { borderRadius: 20, padding: 16 },
  rowGrid: { flexDirection: 'row', gap: 12 },
  flexCard: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle: { fontSize: 10, letterSpacing: 2, fontWeight: '700', fontFamily: 'Varien', },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Varien', letterSpacing: 0.5 },
  chartHeaderRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  filterContainer: { flexDirection: 'row', borderRadius: 20, padding: 4 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  filterText: { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  scoreText: { fontSize: 32, fontWeight: '800', fontFamily: 'Varien', },
  subText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dateText: { fontSize: 10, marginTop: 8, fontStyle: 'italic', fontFamily: 'Inter_400Regular' },
  scheduleRow: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center' },
  dayCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  workerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '600', fontFamily: 'Varien', },
  workerRole: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  workerStats: { alignItems: 'flex-end' },
  workerServices: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  workerServicesLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  publicBtn: { padding: 16, borderRadius: 20, marginTop: 4 },
  publicBtnIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  publicBtnTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  publicBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  historialCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  historialCtaText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, fontFamily: 'Inter_600SemiBold' },
  suspendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderWidth: 1.5,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginBottom: 8,
  },
  suspendedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendedTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  suspendedText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
});
