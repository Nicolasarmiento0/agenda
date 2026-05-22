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

const BarChart = ({ data, colors, filter }: { data: { label: string, value: number }[], colors: any, filter: TimeFilter }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={appStyles.wd_chartContainer}>
      <View style={appStyles.wd_barsWrapper}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <View key={index} style={appStyles.wd_barCol}>
              <View style={appStyles.wd_barTrack}>
                <View style={[appStyles.wd_barFill, { height: `${heightPercent}%`, backgroundColor: appColors.primary }]} />
              </View>
              <Text style={[appStyles.wd_barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

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
      startDate.setDate(today.getDate() - 6); // Last 7 days
    } else if (timeFilter === 'monthly') {
      startDate.setDate(today.getDate() - 29); // Last 30 days
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
        // Group by blocks of 2 hours: 08-10, 10-12, 12-14, 14-16, 16-18, 18-20, 20-22
        const blocks = [8, 10, 12, 14, 16, 18, 20];
        blocks.forEach(b => newRevData.push({ label: `${b}h`, value: 0, key: b }));

        appointments.forEach(a => {
          if (a.price && a.date === today.toISOString().split('T')[0]) {
            const hour = Math.floor(a.start_hour);
            // Find the closest block <= hour
            let targetBlock = 8;
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (hour >= blocks[i]) {
                targetBlock = blocks[i];
                break;
              }
            }
            const blockIndex = newRevData.findIndex(r => r.key === targetBlock);
            if (blockIndex !== -1) newRevData[blockIndex].value += a.price;
          }
        });
      } else if (timeFilter === 'weekly') {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          newRevData.push({ label: dayNames[d.getDay()], value: 0, key: d.toISOString().split('T')[0] });
        }
        appointments.forEach(a => {
          if (a.price) {
            const existing = newRevData.find(r => r.key === a.date);
            if (existing) existing.value += a.price;
          }
        });
      } else if (timeFilter === 'monthly') {
        // Group by 4 weeks (Semana 1, 2, 3, 4)
        newRevData.push({ label: 'Sem 1', value: 0, key: 0 });
        newRevData.push({ label: 'Sem 2', value: 0, key: 1 });
        newRevData.push({ label: 'Sem 3', value: 0, key: 2 });
        newRevData.push({ label: 'Sem 4', value: 0, key: 3 });

        appointments.forEach(a => {
          if (a.price) {
            const apptDate = new Date(a.date);
            const diffTime = Math.abs(today.getTime() - apptDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Map 0-7 days to Sem 4, 8-14 to Sem 3, etc.
            if (diffDays <= 7) newRevData[3].value += a.price;
            else if (diffDays <= 14) newRevData[2].value += a.price;
            else if (diffDays <= 21) newRevData[1].value += a.price;
            else newRevData[0].value += a.price;
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
            <Text style={[appStyles.wd_welcomeText, { color: colors.textSecondary }]}>Bienvenido de vuelta,</Text>
            <Text style={[appStyles.wd_businessName, { color: colors.textPrimary }]}>{workerMe?.name || 'Trabajador'}</Text>
          </View>

          {/* REVENUE CHART */}
          <GlassCard style={appStyles.wd_card}>
            <View style={appStyles.wd_chartHeaderRow}>
              <Text style={[appStyles.wd_sectionTitle, { color: colors.textPrimary }]}>Ingresos</Text>

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
            <BarChart data={revenueData} colors={colors} filter={timeFilter} />
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
              <View style={appStyles.wd_scheduleRow}>
                {SCHEDULE_DATA.map((d, i) => (
                  <View key={i} style={[appStyles.wd_dayCircle, { backgroundColor: d.active ? appColors.primary + '20' : colors.border }]}>
                    <Text style={[appStyles.wd_dayText, { color: d.active ? appColors.primary : colors.textSecondary }]}>{d.day}</Text>
                  </View>
                ))}
              </View>
              <Text style={[appStyles.wd_subText, { color: colors.textSecondary, marginTop: 12 }]}>
                {businessName}
              </Text>
            </GlassCard>
          </View>

          {/* PUBLIC PROFILE BTN */}
          <GlassCard style={appStyles.wd_publicBtn}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}
            >
              <View style={[appStyles.wd_publicBtnIcon, { backgroundColor: appColors.primary + '15' }]}>
                <Feather name="external-link" size={20} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[appStyles.wd_publicBtnTitle, { color: colors.textPrimary }]}>Vista Previa Pública</Text>
                <Text style={[appStyles.wd_publicBtnSub, { color: colors.textSecondary }]}>Mira cómo te ven tus clientes</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

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

