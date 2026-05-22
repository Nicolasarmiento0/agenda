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
import ScreenHeader from '../../../../components/ScreenHeader';
import Gauge from '../../../../components/ui/Gauge';
import MiniBars from '../../../../components/ui/MiniBars';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles, useGlassTokens } from '../../../../styles/appStyles';

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

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const glass = useGlassTokens();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
    stats && stats.totalBusinesses > 0
      ? Math.round((stats.approved / stats.totalBusinesses) * 100)
      : 0;

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ADMIN" onLeft={() => setSidebarVisible(true)} leftIcon="menu" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Bienvenida */}
        <View style={{ gap: 0 }}>
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
          <View style={appStyles.centerFlex}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando métricas...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Stats grid */}
            <Text style={[appStyles.sectionTitle, { color: colors.textSecondary }]}>RESUMEN DE PLATAFORMA</Text>
            <View style={styles.statsGrid}>
              {statCards.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  activeOpacity={card.onPress ? 0.75 : 1}
                  onPress={card.onPress}
                  style={[appStyles.glassCard, styles.statCardWrap, { borderColor: glass.border }]}
                >
                  <BlurView intensity={36} tint={glass.tint} style={[appStyles.glassInner, { backgroundColor: glass.fill }]}>
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

            {/* Métricas */}
            <Text style={[appStyles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>MÉTRICAS</Text>
            <View style={[appStyles.glassCard, { borderColor: glass.border }]}>
              <BlurView intensity={36} tint={glass.tint} style={[appStyles.glassInner, { backgroundColor: glass.fill, padding: 18 }]}>
                <View style={styles.metricRow}>
                  <View style={styles.gaugeBox}>
                    <Gauge
                      value={approvalRate}
                      trackColor={glass.track}
                      textColor={colors.textPrimary}
                      subColor={colors.textSecondary}
                    />
                    <Text style={[styles.gaugeCaption, { color: colors.textSecondary }]}>TASA DE APROBACIÓN</Text>
                  </View>
                  <View style={[styles.metricDivider, { backgroundColor: glass.border }]} />
                  <View style={styles.miniStatsCol}>
                    {[
                      { icon: 'briefcase', label: 'EMPRESAS', value: stats?.totalBusinesses ?? 0 },
                      { icon: 'user-check', label: 'TRABAJADORES', value: stats?.workers ?? 0 },
                      { icon: 'calendar', label: 'CITAS TOTALES', value: stats?.totalAppointments ?? 0 },
                    ].map((m) => (
                      <View key={m.label} style={styles.miniStat}>
                        <Feather name={m.icon as any} size={15} color={appColors.primary} />
                        <View>
                          <Text style={[styles.miniStatValue, { color: colors.textPrimary }]}>{m.value}</Text>
                          <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Actividad semanal */}
            <View style={[appStyles.glassCard, { borderColor: glass.border, marginTop: 12 }]}>
              <BlurView intensity={36} tint={glass.tint} style={[appStyles.glassInner, { backgroundColor: glass.fill, padding: 18 }]}>
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
            <Text style={[appStyles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>ACCIONES RÁPIDAS</Text>

            {stats && stats.pending > 0 && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.actionCard, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B60' }]}
                onPress={goBusinesses}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B30' }]}>
                  <Feather name="alert-circle" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.actionTitle, { color: '#F59E0B' }]}>
                    {stats.pending} EMPRESA{stats.pending !== 1 ? 'S' : ''} PENDIENTE{stats.pending !== 1 ? 'S' : ''}
                  </Text>
                  <Text style={[styles.actionSub, { color: '#F59E0B99' }]}>Revisar solicitudes de aprobación</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#F59E0B" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[appStyles.glassCard, { borderColor: glass.border }]}
              onPress={goBusinesses}
            >
              <BlurView intensity={36} tint={glass.tint} style={[appStyles.glassInner, styles.actionGlass, { backgroundColor: glass.fill }]}>
                <View style={[styles.actionIcon, { backgroundColor: `${appColors.primary}20` }]}>
                  <Feather name="shield" size={22} color={appColors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
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
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 10, letterSpacing: 2.5, fontWeight: '600' },
  loadingText: { fontSize: 13, letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  statCardWrap: { width: '47.7%' },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  statLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '600', marginTop: 2 },

  metricRow: { flexDirection: 'row', alignItems: 'center' },
  gaugeBox: { alignItems: 'center', gap: 10, flex: 1 },
  gaugeCaption: { fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  metricDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: 14 },
  miniStatsCol: { gap: 16, flex: 1 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniStatValue: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 8, letterSpacing: 1.5, fontWeight: '600' },

  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  chartTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  chartSub: { fontSize: 11, letterSpacing: 0.3, marginTop: 2 },
  chartTotal: { fontSize: 26, fontWeight: '700', letterSpacing: -1 },

  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 10,
  },
  actionGlass: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  actionSub: { fontSize: 12, letterSpacing: 0.3 },
});
