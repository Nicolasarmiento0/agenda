import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import GlassCard from '../../../../components/GlassCard';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';
import { getGreeting } from '../../../utils/helpers';

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
  const { profile, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
          </GlassCard>

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
                    <Text style={[appStyles.wd_reviewComment, { color: colors.textSecondary }]}>"{r.comment}"</Text>
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

