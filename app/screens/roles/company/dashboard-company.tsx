import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import GlassCard from '../../../../components/GlassCard';
import RevenueBarChart from '../../../../components/company/RevenueBarChart';
import ReviewsModal from '../../../../components/company/ReviewsModal';
import ScreenHeader from '../../../../components/ScreenHeader';
import Sidebar from '../../../../components/Sidebar';
import WorkerAvatar from '../../../../components/WorkerAvatar';
import { useAuth } from '../../../../context/AuthContext';
import { useBusiness } from '../../../../context/BusinessContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useIsGym } from '../../../../hooks/useIsGym';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

const GYM_PLAN_PRICE: Record<string, number> = { basic: 15000, premium: 25000, vip: 35000 };

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

const toLocalDateStr = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
};

export default function DashboardCompanyScreen() {
  const { profile, business, refreshProfile } = useAuth();
  const { setSelectedBusiness } = useBusiness();
  const { colors } = useTheme();
  const isGym = useIsGym();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [revenueData, setRevenueData] = useState<{ label: string; value: number }[]>([]);
  const [workerData, setWorkerData] = useState<any[]>([]);

  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const [gymStats, setGymStats] = useState({ basic: 0, premium: 0, vip: 0, revenue: 0, prices: GYM_PLAN_PRICE });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchDashboardData = useCallback(async () => {
    if (!business?.id) return;

    if (isGym) {
      const { data: servicesData } = await supabase
        .from('business_services')
        .select('name, price')
        .eq('business_id', business.id);

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

    const today = new Date();
    let startDate = new Date();

    if (timeFilter === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'weekly') {
      const dow = today.getDay();
      startDate.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    } else {
      startDate.setDate(today.getDate() - 29);
    }

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, start_hour, price, worker_id')
      .eq('business_id', business.id)
      .gte('date', toLocalDateStr(startDate));

    const { data: reviews } = await supabase
      .from('reviews')
      .select('score, comment, created_at, profiles(nickname)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

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
          if (a.price && a.date === toLocalDateStr(today)) {
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
          if (a.price) { const r = newRevData.find(r => r.key === a.date); if (r) r.value += a.price; }
        });
      } else {
        [0, 1, 2, 3].forEach(i => newRevData.push({ label: `Sem ${i + 1}`, value: 0, key: i }));
        appointments.forEach(a => {
          if (a.price) {
            const diff = Math.ceil(Math.abs(today.getTime() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24));
            const idx = diff <= 7 ? 3 : diff <= 14 ? 2 : diff <= 21 ? 1 : 0;
            newRevData[idx].value += a.price;
          }
        });
      }

      setRevenueData(newRevData.map(({ label, value }) => ({ label, value })));
    }
  }, [business?.id, timeFilter, isGym]);

  const onRefresh = useCallback(async () => {
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
      <ScreenHeader title="DASHBOARD" onLeft={() => setSidebarVisible(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Bienvenido de vuelta,</Text>
            <Text style={[styles.businessName, { color: colors.textPrimary }]}>{business?.name || profile?.nickname || 'Empresa'}</Text>
          </View>

          {!isGym && (
            <GlassCard style={styles.card}>
              <View style={styles.chartHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ingresos por Citas</Text>
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
              <RevenueBarChart data={revenueData} filter={timeFilter} colors={colors} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const rangeParam = timeFilter === 'daily' ? 'day' : timeFilter === 'weekly' ? 'week' : 'month';
                  router.push(`/screens/roles/company/company-history?range=${rangeParam}` as any);
                }}
                style={[styles.historialCta, { borderTopColor: colors.border }]}
              >
                <Text style={[styles.historialCtaText, { color: appColors.primary }]}>Ver historial completo</Text>
                <Feather name="arrow-right" size={14} color={appColors.primary} />
              </TouchableOpacity>
            </GlassCard>
          )}

          {isGym && (
            <GlassCard style={styles.card}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/screens/roles/company/company-history' as any)} style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Feather name="users" size={16} color={colors.textSecondary} />
                  <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>MEMBRESÍAS MENSUALES</Text>
                  <Feather name="chevron-right" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </View>
                <Text style={[styles.scoreText, { color: colors.textPrimary }]}>${gymStats.revenue.toLocaleString('es-CL')}</Text>
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

            <GlassCard style={[styles.card, styles.flexCard]}>
              <View style={styles.cardHeader}>
                <Feather name="clock" size={16} color={colors.textSecondary} />
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>HORARIOS</Text>
              </View>
              <View style={styles.scheduleRow}>
                {SCHEDULE_DATA.map((d, i) => (
                  <View key={i} style={[styles.dayCircle, { backgroundColor: d.active ? appColors.primary + '20' : colors.border }]}>
                    <Text style={[styles.dayText, { color: d.active ? appColors.primary : colors.textSecondary }]}>{d.day}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.subText, { color: colors.textSecondary, marginTop: 12 }]}>
                Cierre a las {business?.closing_time?.slice(0, 5) || '20:00'}
              </Text>
            </GlassCard>
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
                if (!business) return;
                setSelectedBusiness(business as any);
                router.push(`/screens/roles/client/client-business-profile?id=${business.id}` as any);
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
  welcomeText: { fontSize: 14, letterSpacing: 0.5, fontFamily: 'Inter_400Regular' },
  businessName: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', letterSpacing: 1, marginTop: 4 },
  card: { borderRadius: 20, padding: 16 },
  rowGrid: { flexDirection: 'row', gap: 12 },
  flexCard: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle: { fontSize: 10, letterSpacing: 2, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterContainer: { flexDirection: 'row', borderRadius: 20, padding: 4 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  filterText: { fontSize: 10, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  scoreText: { fontSize: 32, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  subText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dateText: { fontSize: 10, marginTop: 8, fontStyle: 'italic', fontFamily: 'Inter_400Regular' },
  scheduleRow: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', alignItems: 'center' },
  dayCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 9, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  workerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
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
});
