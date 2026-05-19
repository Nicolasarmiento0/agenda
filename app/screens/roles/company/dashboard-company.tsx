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

const toLocalDateStr = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
};

const formatCurrency = (v: number): string => {
  if (v === 0) return '';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v}`;
};

const BarChart = ({ data, colors, filter }: { data: { label: string, value: number }[], colors: any, filter: TimeFilter }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View>
      {/* Total del período */}
      <View style={styles.chartTotalRow}>
        <Text style={[styles.chartTotalValue, { color: colors.textPrimary }]}>
          {total > 0 ? `$${total.toLocaleString('es-AR')}` : '$0'}
        </Text>
        <Text style={[styles.chartTotalLabel, { color: colors.textSecondary }]}>
          {filter === 'daily' ? 'hoy' : filter === 'weekly' ? 'esta semana' : 'últimos 30 días'}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.barsWrapper}>
          {data.map((item, index) => {
            const heightPercent = (item.value / maxValue) * 100;
            const isMax = item.value === maxValue && item.value > 0;
            return (
              <View key={index} style={styles.barCol}>
                <Text style={[styles.barValue, { color: item.value > 0 ? appColors.primary : 'transparent' }]}>
                  {formatCurrency(item.value)}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: isMax ? appColors.primary : appColors.primary + '70',
                    }
                  ]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default function DashboardCompanyScreen() {
  const { profile, business, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Real data state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [revenueData, setRevenueData] = useState<{ label: string, value: number }[]>([]);
  const [workerData, setWorkerData] = useState<any[]>([]);

  // Reviews state
  const [reviewsData, setReviewsData] = useState({ score: 0, total: 0, lastReviewDate: 'Sin reseñas' });
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchDashboardData = useCallback(async () => {
    if (!business?.id) return;

    // 1. Fetch Workers
    const { data: workers } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true);

    // 2. Determine date range for appointments based on filter
    const today = new Date();
    let startDate = new Date();

    if (timeFilter === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'weekly') {
      const dow = today.getDay();
      const daysToMonday = dow === 0 ? 6 : dow - 1;
      startDate.setDate(today.getDate() - daysToMonday);
    } else if (timeFilter === 'monthly') {
      startDate.setDate(today.getDate() - 29);
    }

    const dateStr = toLocalDateStr(startDate);

    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, start_hour, price, worker_id')
      .eq('business_id', business.id)
      .gte('date', dateStr);

    // 3. Fetch Reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('score, comment, created_at, profiles(nickname)')
      .eq('business_id', business.id)
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

    if (workers && appointments) {
      // Process Workers Data
      const processedWorkers = workers.map(w => {
        const workerAppts = appointments.filter(a => a.worker_id === w.id).length;
        return {
          id: w.id,
          name: w.name,
          role: w.specialty || 'Especialista',
          services: workerAppts,
          color: w.color || '#3B7BE0',
        };
      });
      setWorkerData(processedWorkers);

      // Process Revenue Data
      const newRevData: { label: string, value: number, key?: string | number }[] = [];

      if (timeFilter === 'daily') {
        // Group by blocks of 2 hours: 08-10, 10-12, 12-14, 14-16, 16-18, 18-20, 20-22
        const blocks = [8, 10, 12, 14, 16, 18, 20];
        blocks.forEach(b => newRevData.push({ label: `${b}h`, value: 0, key: b }));

        appointments.forEach(a => {
          if (a.price && a.date === toLocalDateStr(today)) {
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
        const weekStart = new Date(today);
        const dow = today.getDay();
        weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          newRevData.push({ label: dayNames[d.getDay()], value: 0, key: toLocalDateStr(d) });
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
  }, [business?.id, timeFilter]);

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
            <Text style={[styles.businessName, { color: colors.textPrimary }]}>{business?.name || profile?.nickname || 'Empresa'}</Text>
          </View>

          {/* REVENUE CHART */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                      { color: timeFilter === filter ? '#fff' : colors.textSecondary }
                    ]}>
                      {filter === 'daily' ? 'Diario' : filter === 'weekly' ? 'Semanal' : 'Mensual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <BarChart data={revenueData} colors={colors} filter={timeFilter} />
          </View>

          <View style={styles.rowGrid}>
            {/* REVIEWS CARD */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowReviewsModal(true)}
              style={[styles.card, styles.flexCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="star" size={16} color="#f0c630ff" />
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>REPUTACIÓN NEGOCIO</Text>
              </View>
              <Text style={[styles.scoreText, { color: colors.textPrimary }]}>{reviewsData.score}</Text>
              <Text style={[styles.subText, { color: colors.textSecondary }]}>{reviewsData.total} opiniones</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>Última: {reviewsData.lastReviewDate}</Text>

              {/* Indicador de que es clickeable */}
              <View style={{ position: 'absolute', bottom: 12, right: 12 }}>
                <Feather name="chevron-right" size={16} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* SCHEDULE CARD */}
            <View style={[styles.card, styles.flexCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            </View>
          </View>

          {/* WORKERS ACTIVITY */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>Rendimiento del Equipo</Text>
            {workerData.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No hay trabajadores registrados o citas recientes.</Text>
            ) : workerData.map((worker, i) => (
              <View key={worker.id} style={[styles.workerRow, i < workerData.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: worker.color + '20', borderColor: worker.color }]}>
                  <Text style={[styles.avatarInitials, { color: worker.color }]}>{worker.name.substring(0, 2).toUpperCase()}</Text>
                </View>
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
          </View>

          {/* PUBLIC PROFILE BTN */}
          <TouchableOpacity
            style={[styles.publicBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
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
    letterSpacing: 1,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 16,
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  /* CHART STYLES */
  chartTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  chartTotalValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  chartTotalLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
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
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0,
  },
  barTrack: {
    width: 8,
    height: 90,
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
    marginTop: 6,
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
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 9,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
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
  },
  publicBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
});