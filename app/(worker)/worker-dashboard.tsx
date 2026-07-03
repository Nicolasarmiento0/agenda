import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';
import { getGreeting } from '../../utils/helpers';

const { width } = Dimensions.get('window');

// ─── MOCK DATA FALLBACKS ──────────────────────────────────────────────
const SCHEDULE_DATA = [
  { day: 'L', active: true },
  { day: 'M', active: true },
  { day: 'X', active: true },
  { day: 'J', active: true },
  { day: 'V', active: true },
  { day: 'S', active: true },
  { day: 'D', active: false },
];

type TimeFilter = 'daily' | 'weekly' | 'monthly';

// ─── COMPONENTES ────────────────────────────────────────────────────────


export default function WorkerDashboardScreen() {
  const { profile, business, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isSuspended = business?.status === 'suspended';

  const handleSuspendedAction = () => {
    showAlert({
      title: 'Acción Bloqueada',
      message: 'El negocio al que perteneces se encuentra suspendido. Comunícate con tu administrador.',
    });
  };

  // Worker me state
  const [workerMe, setWorkerMe] = useState<{ id: string, name: string, business_id: string } | null>(null);
  const [businessName, setBusinessName] = useState<string>('');

  // Real data state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [revenueData, setRevenueData] = useState<{ label: string, value: number }[]>([]);

  // Reviews state
  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  const fetchDashboardData = useCallback(async () => {
    if (!profile?.id) return;
    setRefreshing(true);

    // 1. Obtener mi id de trabajador
    const { data: meData } = await supabase
      .from('workers')
      .select('id, name, business_id')
      .eq('user_id', profile.id)
      .single();

    if (!meData) {
      setRefreshing(false);
      return;
    }
    setWorkerMe(meData as any);

    const { data: bizData } = await supabase.from('businesses').select('name').eq('id', meData.business_id).single();
    if (bizData) setBusinessName(bizData.name);

    // 2. Determine date range for appointments based on filter
    const today = new Date();
    let startDate = new Date();

    if (timeFilter === 'daily') {
      startDate.setHours(0, 0, 0, 0); // Today only
    } else if (timeFilter === 'weekly') {
      const dow = today.getDay();
      startDate.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    } else if (timeFilter === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const dateStr = startDate.toISOString().split('T')[0];

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, start_hour, price, worker_id, status')
      .eq('worker_id', meData.id)
      .gte('date', dateStr)
      .neq('status', 'cancelled');

    // 3. Fetch Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('score, comment, created_at, profiles(nickname)')
      .eq('business_id', meData.business_id)
      .order('created_at', { ascending: false });

    if (reviews && reviews.length > 0) {
      const total = reviews.length;
      const sum = reviews.reduce((acc, r) => acc + r.score, 0);
      const avg = (sum / total).toFixed(1);

      const lastDate = new Date(reviews[0].created_at);
      const formatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

      setReviewsData({
        score: parseFloat(avg),
        total,
        lastReviewDate: formatter.format(lastDate),
      });
      setReviewsList(reviews);
    } else {
      setReviewsData({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
      setReviewsList([]);
    }

    if (appointments) {

      // Process Revenue Data
      const newRevData: { label: string, value: number, key?: string | number }[] = [];

      if (timeFilter === 'daily') {
        const blocks = [8, 10, 12, 14, 16, 18, 20];
        blocks.forEach(b => newRevData.push({ label: `${b}h`, value: 0, key: b }));

        appointments.forEach(a => {
          if (a.price && a.status === 'completed' && a.date === dateStr) {
            const hour = Math.floor(a.start_hour);
            let target = 8;
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (hour >= blocks[i]) {
                target = blocks[i];
                break;
              }
            }
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
          const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          newRevData.push({ label: dayNames[d.getDay()], value: 0, key: localStr });
        }

        appointments.forEach(a => {
          if (a.price && a.status === 'completed') {
            const r = newRevData.find(r => r.key === a.date);
            if (r) r.value += a.price;
          }
        });

      } else if (timeFilter === 'monthly') {
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

    // Próximas citas del trabajador
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: upcomingData } = await supabase
      .from('appointments')
      .select('id, date, start_hour, status, service, client_name, business_id')
      .eq('worker_id', meData.id)
      .in('status', ['confirmed', 'pending', 'rescheduled'])
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true })
      .limit(8);

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

    setRefreshing(false);
  }, [profile?.id, timeFilter]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchDashboardData();
    setRefreshing(false);
  }, [refreshProfile, fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();

    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fetchDashboardData]);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[appStyles.wd_header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={appStyles.wd_iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[appStyles.wd_headerLabel, { color: colors.textSecondary }]}>DASHBOARD</Text>
        <TouchableOpacity onPress={toggleTheme} style={appStyles.wd_iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={appStyles.wd_scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          {/* WELCOME */}
          <View style={{ marginBottom: 8 }}>
            <Text style={[appStyles.wd_welcomeText, { color: colors.textSecondary }]}>{getGreeting()}</Text>
            <Text style={[appStyles.wd_businessName, { color: colors.textPrimary }]}>{workerMe?.name || 'Trabajador'}</Text>
          </View>

          {isSuspended && (
            <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderWidth: 1.5, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: '#EF4444', marginBottom: 8 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="slash" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', fontFamily: 'Inter_700Bold', color: '#EF4444', letterSpacing: 1 }}>
                  NEGOCIO SUSPENDIDO
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>
                  El negocio al que perteneces ha sido suspendido temporalmente por el administrador. Las funciones de agendamiento y visualización de agenda están bloqueadas.
                </Text>
              </View>
            </GlassCard>
          )}

          {/* ACCESO DIRECTO AGENDA */}
          <GlassCard style={appStyles.wd_card}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => isSuspended ? handleSuspendedAction() : router.push('/calendar')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <View style={[appStyles.wd_publicBtnIcon, { backgroundColor: appColors.primary + '15' }]}>
                <Feather name="calendar" size={20} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[appStyles.wd_publicBtnTitle, { color: colors.textPrimary }]}>Mi Agenda de Citas</Text>
                <Text style={[appStyles.wd_publicBtnSub, { color: colors.textSecondary }]}>Ver tus turnos asignados y calendarización</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          {/* REVENUE CHART */}
          <GlassCard style={appStyles.wd_card}>
            <View style={appStyles.wd_chartHeaderRow}>
              <View>
                <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary, marginBottom: 4 }]}>Ingresos Totales</Text>
                <Text 
                  style={[appStyles.wd_scoreText, { color: colors.textPrimary }]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  ${revenueData.reduce((sum, item) => sum + item.value, 0).toLocaleString('es-CL')}
                </Text>
                <Text style={[appStyles.wd_subText, { color: colors.textSecondary }]}>
                  en este periodo
                </Text>
              </View>

              <View style={[appStyles.wd_filterContainer, { backgroundColor: colors.background }]}>
                {(['daily', 'weekly', 'monthly'] as TimeFilter[]).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.8}
                    onPress={() => setTimeFilter(filter)}
                    style={[
                      appStyles.wd_filterBtn,
                      timeFilter === filter && { backgroundColor: appColors.primary }
                    ]}
                  >
                    <Text style={[
                      appStyles.wd_filterText,
                      { color: timeFilter === filter ? '#111827' : colors.textSecondary }
                    ]}>
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
                router.push(`/worker-history?range=${rangeParam}` as any);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                marginTop: 16,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: appColors.primary, fontFamily: 'Inter_600SemiBold' }}>Ver historial completo</Text>
              <Feather name="arrow-right" size={14} color={appColors.primary} />
            </TouchableOpacity>
          </GlassCard>

          {/* PRÓXIMAS CITAS */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
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
                  onPress={() => {
                    if (isSuspended) {
                      handleSuspendedAction();
                    } else {
                      router.push({
                        pathname: '/calendar',
                        params: {
                          businessId: appt.business_id,
                          selectedDate: appt.date,
                          focusedApptId: appt.id
                        }
                      });
                    }
                  }}
                >
                  <GlassCard style={[appStyles.wd_card, { padding: 18, borderLeftWidth: 4, borderLeftColor: group.color }]}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Feather name="calendar" size={14} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '500', fontFamily: 'Inter_500Medium' }}>
                        {formatDateTime(appt.start_time)}
                      </Text>
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
              <Text style={{ fontSize: 15, color: colors.textPrimary, fontWeight: '600', marginBottom: 4, fontFamily: 'Inter_600SemiBold' }}>Sin citas próximas</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                Tus turnos asignados aparecerán aquí.
              </Text>
            </GlassCard>
          )}

          <View style={appStyles.wd_rowGrid}>
            {/* REVIEWS CARD */}
            <GlassCard style={[appStyles.wd_card, appStyles.wd_flexCard]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowReviewsModal(true)}
                style={{ flex: 1 }}
              >
                <View style={appStyles.wd_cardHeader}>
                  <Ionicons name="star" size={16} color="#f0c630ff" />
                  <Text style={[appStyles.wd_cardTitle, { color: colors.textSecondary }]}>REPUTACIÓN NEGOCIO</Text>
                </View>
                <Text style={[appStyles.wd_scoreText, { color: colors.textPrimary }]}>{reviewsData.score}</Text>
                <Text style={[appStyles.wd_subText, { color: colors.textSecondary }]}>{reviewsData.total} opiniones</Text>
                <Text style={[appStyles.wd_dateText, { color: colors.textSecondary }]}>Última: {reviewsData.lastReviewDate}</Text>
                <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
                  <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </GlassCard>

            {/* SCHEDULE CARD */}
            <GlassCard style={[appStyles.wd_card, appStyles.wd_flexCard]}>
              <View style={appStyles.wd_cardHeader}>
                <Feather name="clock" size={16} color={colors.textSecondary} />
                <Text style={[appStyles.wd_cardTitle, { color: colors.textSecondary }]}>HORARIOS</Text>
              </View>
              <View style={[appStyles.wd_scheduleRow, { backgroundColor: colors.background, padding: 12, borderRadius: 12, gap: 8 }]}>
                {SCHEDULE_DATA.map((d, i) => (
                  <View key={i} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: d.active ? colors.textPrimary : colors.textSecondary, fontWeight: d.active ? '700' : '500' }}>
                      {d.day}
                    </Text>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.active ? appColors.primary : 'transparent' }} />
                  </View>
                ))}
              </View>
              <Text style={[appStyles.wd_subText, { color: colors.textSecondary, marginTop: 12 }]}>
                {businessName}
              </Text>
            </GlassCard>
          </View>



        </Animated.View>
      </ScrollView>

      {/* REVIEWS LIST MODAL */}
      <Modal visible={showReviewsModal} transparent animationType="slide">
        <View style={appStyles.wd_modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowReviewsModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <BlurView
            intensity={40}
            tint={isDarkMode ? 'dark' : 'light'}
            style={[appStyles.wd_modalContent, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }]}
          >
            <View style={appStyles.wd_modalHeader}>
              <Text style={[appStyles.wd_modalTitle, { color: colors.textPrimary }]}>Opiniones de Clientes</Text>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)} style={appStyles.wd_closeBtn}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {reviewsList.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>Aún no tienes opiniones.</Text>
              ) : reviewsList.map((r, i) => (
                <View key={i} style={[appStyles.wd_reviewItem, { borderBottomColor: colors.border }]}>
                  <View style={appStyles.wd_reviewHeader}>
                    <Text style={[appStyles.wd_reviewAuthor, { color: colors.textPrimary }]}>
                      {r.profiles?.nickname || 'Cliente'}
                    </Text>
                    <Text style={[appStyles.wd_reviewDate, { color: colors.textSecondary }]}>
                      {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons key={star} name={star <= r.score ? "star" : "star-outline"} size={14} color="#F0A030" />
                    ))}
                  </View>
                  {r.comment ? (
                    <Text style={[appStyles.wd_reviewComment, { color: colors.textSecondary }]}>{`"${r.comment}"`}</Text>
                  ) : (
                    <Text style={[appStyles.wd_reviewComment, { color: colors.textSecondary, fontStyle: 'italic' }]}>Sin comentario</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

