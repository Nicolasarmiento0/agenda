import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  clients: number;
  totalBusinesses: number;
  workers: number;
  totalAppointments: number;
  weekly: number[];
  weeklyLabels: string[];
};

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/* ── Gauge circular estilo Tesla (ticks radiales, sin SVG) ── */
function Gauge({
  value,
  size = 128,
  trackColor,
  textColor,
  subColor,
}: {
  value: number;
  size?: number;
  trackColor: string;
  textColor: string;
  subColor: string;
}) {
  const TICKS = 40;
  const active = Math.round((value / 100) * TICKS);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: TICKS }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            alignItems: 'center',
            transform: [{ rotate: `${(360 / TICKS) * i}deg` }],
          }}
        >
          <View
            style={{
              width: 3,
              height: 13,
              borderRadius: 2,
              backgroundColor: i < active ? appColors.primary : trackColor,
            }}
          />
        </View>
      ))}
      <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, color: textColor }}>
        {value}
        <Text style={{ fontSize: 15, color: subColor }}>%</Text>
      </Text>
    </View>
  );
}

/* ── Mini gráfica de barras (actividad 7 días) ── */
function MiniBars({
  data,
  labels,
  labelColor,
}: {
  data: number[];
  labels: string[];
  labelColor: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.barsRow}>
      {data.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={[styles.barValue, { color: labelColor }]}>{v > 0 ? v : ''}</Text>
          <View style={[styles.barTrack, { backgroundColor: `${appColors.primary}14` }]}>
            <View
              style={{
                width: '100%',
                height: `${Math.max(6, (v / max) * 100)}%`,
                borderRadius: 5,
                backgroundColor: v > 0 ? appColors.primary : `${appColors.primary}30`,
              }}
            />
          </View>
          <Text style={[styles.barLabel, { color: labelColor }]}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const glassTint = isDarkMode ? 'dark' : 'light';
  const glassBorder = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const glassFill = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)';
  const trackColor = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().slice(0, 10);

      const [pendingRes, approvedRes, rejectedRes, clientsRes, totalRes, workersRes, apptRes, weekRes] =
        await Promise.all([
          supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
          supabase.from('businesses').select('id', { count: 'exact', head: true }),
          supabase.from('workers').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('date').gte('date', startStr),
        ]);

      // Conteo por día (últimos 7 días)
      const weekly: number[] = [];
      const weeklyLabels: string[] = [];
      const counts = new Map<string, number>();
      (weekRes.data ?? []).forEach((row: { date: string | null }) => {
        if (!row.date) return;
        counts.set(row.date, (counts.get(row.date) ?? 0) + 1);
      });
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        weekly.push(counts.get(key) ?? 0);
        weeklyLabels.push(DAY_LETTERS[d.getDay()]);
      }

      setStats({
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        totalBusinesses: totalRes.count ?? 0,
        workers: workersRes.count ?? 0,
        totalAppointments: apptRes.count ?? 0,
        weekly,
        weeklyLabels,
      });

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

  type StatCard = {
    label: string;
    value: number;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    onPress?: () => void;
  };

  const goBusinesses = () => router.push('/screens/roles/admin/admin-businesses' as any);

  const statCards: StatCard[] = [
    { label: 'PENDIENTES', value: stats?.pending ?? 0, icon: 'clock', color: '#F59E0B', onPress: goBusinesses },
    { label: 'APROBADAS', value: stats?.approved ?? 0, icon: 'check-circle', color: '#10B981', onPress: goBusinesses },
    { label: 'RECHAZADAS', value: stats?.rejected ?? 0, icon: 'x-circle', color: '#EF4444', onPress: goBusinesses },
    { label: 'CLIENTES', value: stats?.clients ?? 0, icon: 'users', color: appColors.primary },
  ];

  const approvalRate =
    stats && stats.totalBusinesses > 0 ? Math.round((stats.approved / stats.totalBusinesses) * 100) : 0;

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[styles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>ADMIN</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Bienvenida */}
        <View style={styles.welcomeSection}>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: appColors.primary }]} />
            <Text style={[styles.badgeText, { color: appColors.primary }]}>PANEL DE ADMINISTRACIÓN</Text>
          </View>
          <Text style={[appStyles.title2, { color: colors.textPrimary, paddingVertical: 6 }]}>
            HOLA,{'\n'}
            {profile?.nickname?.toUpperCase() ?? 'ADMIN'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando métricas...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Stats grid */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RESUMEN DE PLATAFORMA</Text>
            <View style={styles.statsGrid}>
              {statCards.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  activeOpacity={card.onPress ? 0.75 : 1}
                  onPress={card.onPress}
                  style={[styles.statCardWrap, { borderColor: glassBorder }]}
                >
                  <BlurView intensity={36} tint={glassTint} style={[styles.glassInner, { backgroundColor: glassFill }]}>
                    <View style={[styles.statAccent, { backgroundColor: card.color }]} />
                    <View style={styles.statTop}>
                      <View style={[styles.statIcon, { backgroundColor: `${card.color}1F` }]}>
                        <Feather name={card.icon} size={18} color={card.color} />
                      </View>
                      {card.onPress && <Feather name="arrow-up-right" size={14} color={colors.textSecondary} />}
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{card.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </View>

            {/* Métricas: gauge + secundarias */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>MÉTRICAS</Text>
            <View style={[styles.glassCard, { borderColor: glassBorder }]}>
              <BlurView intensity={36} tint={glassTint} style={[styles.glassInner, { backgroundColor: glassFill, padding: 18 }]}>
                <View style={styles.metricRow}>
                  <View style={styles.gaugeBox}>
                    <Gauge
                      value={approvalRate}
                      trackColor={trackColor}
                      textColor={colors.textPrimary}
                      subColor={colors.textSecondary}
                    />
                    <Text style={[styles.gaugeCaption, { color: colors.textSecondary }]}>
                      TASA DE APROBACIÓN
                    </Text>
                  </View>
                  <View style={[styles.metricDivider, { backgroundColor: glassBorder }]} />
                  <View style={styles.miniStatsCol}>
                    <View style={styles.miniStat}>
                      <Feather name="briefcase" size={15} color={appColors.primary} />
                      <View>
                        <Text style={[styles.miniStatValue, { color: colors.textPrimary }]}>
                          {stats?.totalBusinesses ?? 0}
                        </Text>
                        <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>EMPRESAS</Text>
                      </View>
                    </View>
                    <View style={styles.miniStat}>
                      <Feather name="user-check" size={15} color={appColors.primary} />
                      <View>
                        <Text style={[styles.miniStatValue, { color: colors.textPrimary }]}>
                          {stats?.workers ?? 0}
                        </Text>
                        <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>TRABAJADORES</Text>
                      </View>
                    </View>
                    <View style={styles.miniStat}>
                      <Feather name="calendar" size={15} color={appColors.primary} />
                      <View>
                        <Text style={[styles.miniStatValue, { color: colors.textPrimary }]}>
                          {stats?.totalAppointments ?? 0}
                        </Text>
                        <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>CITAS TOTALES</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Actividad semanal */}
            <View style={[styles.glassCard, { borderColor: glassBorder, marginTop: 12 }]}>
              <BlurView intensity={36} tint={glassTint} style={[styles.glassInner, { backgroundColor: glassFill, padding: 18 }]}>
                <View style={styles.chartHeader}>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>ACTIVIDAD</Text>
                    <Text style={[styles.chartSub, { color: colors.textSecondary }]}>Citas · últimos 7 días</Text>
                  </View>
                  <Text style={[styles.chartTotal, { color: appColors.primary }]}>
                    {(stats?.weekly ?? []).reduce((a, b) => a + b, 0)}
                  </Text>
                </View>
                <MiniBars
                  data={stats?.weekly ?? []}
                  labels={stats?.weeklyLabels ?? []}
                  labelColor={colors.textSecondary}
                />
              </BlurView>
            </View>

            {/* Acciones rápidas */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>ACCIONES RÁPIDAS</Text>

            {stats && stats.pending > 0 && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.actionCard, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B60' }]}
                onPress={goBusinesses}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B30' }]}>
                  <Feather name="alert-circle" size={22} color="#F59E0B" />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: '#F59E0B' }]}>
                    {stats.pending} EMPRESA{stats.pending !== 1 ? 'S' : ''} PENDIENTE{stats.pending !== 1 ? 'S' : ''}
                  </Text>
                  <Text style={[styles.actionSub, { color: '#F59E0B99' }]}>Revisar solicitudes de aprobación</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#F59E0B" />
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.85} style={[styles.glassCard, { borderColor: glassBorder }]} onPress={goBusinesses}>
              <BlurView intensity={36} tint={glassTint} style={[styles.glassInner, styles.actionGlass, { backgroundColor: glassFill }]}>
                <View style={[styles.actionIcon, { backgroundColor: `${appColors.primary}20` }]}>
                  <Feather name="shield" size={22} color={appColors.primary} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>GESTIONAR EMPRESAS</Text>
                  <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                    {stats?.totalBusinesses ?? 0} empresas registradas en total
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50 },
  hamburger: { fontSize: 26 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  welcomeSection: { gap: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 10, letterSpacing: 2.5, fontWeight: '600' },
  sectionTitle: { fontSize: 10, letterSpacing: 3, marginBottom: 12 },

  /* glass base */
  glassCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  glassInner: { padding: 16 },

  /* stat grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  statCardWrap: { width: '47.7%', borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  statLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '600', marginTop: 2 },

  loadingBox: { paddingTop: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, letterSpacing: 0.5 },

  /* métricas */
  metricRow: { flexDirection: 'row', alignItems: 'center' },
  gaugeBox: { alignItems: 'center', gap: 10, flex: 1 },
  gaugeCaption: { fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  metricDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: 14 },
  miniStatsCol: { gap: 16, flex: 1 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStatValue: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },

  /* chart */
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  chartSub: { fontSize: 11, letterSpacing: 0.3, marginTop: 2 },
  chartTotal: { fontSize: 26, fontWeight: '700', letterSpacing: -1 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barValue: { fontSize: 9, fontWeight: '600', height: 12 },
  barTrack: { width: '100%', height: 56, borderRadius: 5, justifyContent: 'flex-end' },
  barLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '600' },

  /* acciones */
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 10,
  },
  actionGlass: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  actionSub: { fontSize: 12, letterSpacing: 0.3 },
});
