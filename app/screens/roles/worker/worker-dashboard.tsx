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
    <View style={styles.chartContainer}>
      <View style={styles.barsWrapper}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <View key={index} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${heightPercent}%`, backgroundColor: appColors.primary }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
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
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>DASHBOARD</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          {/* WELCOME */}
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Bienvenido de vuelta,</Text>
            <Text style={[styles.businessName, { color: colors.textPrimary }]}>{workerMe?.name || 'Trabajador'}</Text>
          </View>

          {/* REVENUE CHART */}
          <GlassCard style={styles.card}>
            <View style={styles.chartHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ingresos</Text>

              <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
                {(['daily', 'weekly', 'monthly'] as TimeFilter[]).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.8}
                    onPress={() => setTimeFilter(filter)}
                    style={[
                      styles.filterBtn,
                      timeFilter === filter && { backgroundColor: appColors.primary }
                    ]}
                  >
                    <Text style={[
                      styles.filterText,
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

          <View style={styles.rowGrid}>
            {/* REVIEWS CARD */}
            <GlassCard style={[styles.card, styles.flexCard]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowReviewsModal(true)}
                style={{ flex: 1 }}
              >
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

            {/* SCHEDULE CARD */}
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
                {businessName}
              </Text>
            </GlassCard>
          </View>

          {/* PUBLIC PROFILE BTN */}
          <GlassCard style={styles.publicBtn}>
            <TouchableOpacity
              activeOpacity={0.8}
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

      {/* REVIEWS LIST MODAL */}
      <Modal visible={showReviewsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowReviewsModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <BlurView
            intensity={40}
            tint={isDarkMode ? 'dark' : 'light'}
            style={[styles.modalContent, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Opiniones de Clientes</Text>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {reviewsList.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>Aún no tienes opiniones.</Text>
              ) : reviewsList.map((r, i) => (
                <View key={i} style={[styles.reviewItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewAuthor, { color: colors.textPrimary }]}>
                      {r.profiles?.nickname || 'Cliente'}
                    </Text>
                    <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                      {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons key={star} name={star <= r.score ? "star" : "star-outline"} size={14} color="#F0A030" />
                    ))}
                  </View>
                  {r.comment ? (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>"{r.comment}"</Text>
                  ) : (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary, fontStyle: 'italic' }]}>Sin comentario</Text>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  businessName: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  flexCard: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },

  /* CHART FILTERS */
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },

  /* CHART STYLES */
  chartContainer: {
    height: 140,
  },
  barsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    alignItems: 'center',
    width: 30,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: 8,
    backgroundColor: '#33333320',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: '500',
  },

  /* REVIEWS */
  scoreText: {
    fontSize: 32,
    fontWeight: '800',
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  dateText: {
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },

  /* MODAL REVIEWS */
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 11,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* SCHEDULE */
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* WORKERS */
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  workerRole: {
    fontSize: 12,
    marginTop: 2,
  },
  workerStats: {
    alignItems: 'flex-end',
  },
  workerServices: {
    fontSize: 16,
    fontWeight: '700',
  },
  workerServicesLabel: {
    fontSize: 10,
  },

  /* PUBLIC BTN */
  publicBtn: {
    padding: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  publicBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  publicBtnSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});