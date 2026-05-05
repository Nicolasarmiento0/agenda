import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  clients: number;
  totalBusinesses: number;
};

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes, clientsRes, totalRes] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
        clients: clientsRes.count ?? 0,
        totalBusinesses: totalRes.count ?? 0,
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

  type StatCard = {
    label: string;
    value: number;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    onPress?: () => void;
  };

  const statCards: StatCard[] = [
    {
      label: 'PENDIENTES',
      value: stats?.pending ?? 0,
      icon: 'clock',
      color: '#F59E0B',
      onPress: () => router.push('/screens/admin-businesses' as any),
    },
    {
      label: 'APROBADAS',
      value: stats?.approved ?? 0,
      icon: 'check-circle',
      color: '#10B981',
      onPress: () => router.push('/screens/admin-businesses' as any),
    },
    {
      label: 'RECHAZADAS',
      value: stats?.rejected ?? 0,
      icon: 'x-circle',
      color: '#EF4444',
      onPress: () => router.push('/screens/admin-businesses' as any),
    },
    {
      label: 'CLIENTES',
      value: stats?.clients ?? 0,
      icon: 'users',
      color: appColors.primary,
    },
  ];

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Bienvenida */}
        <View style={styles.welcomeSection}>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: appColors.primary }]} />
            <Text style={[styles.badgeText, { color: appColors.primary }]}>PANEL DE ADMINISTRACIÓN</Text>
          </View>
          <Text style={[appStyles.title2, { color: colors.textPrimary, paddingVertical: 6 }]}>
            HOLA,{'\n'}{profile?.nickname?.toUpperCase() ?? 'ADMIN'}
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
                  style={[styles.statCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: card.color,
                  }]}
                >
                  <View style={[styles.statIcon, { backgroundColor: `${card.color}18` }]}>
                    <Feather name={card.icon} size={20} color={card.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{card.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
                  {card.onPress && (
                    <Feather name="arrow-right" size={12} color={colors.textSecondary} style={styles.statArrow} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Acceso rápido */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>ACCIONES RÁPIDAS</Text>

            {stats && stats.pending > 0 && (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[styles.actionCard, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B60' }]}
                onPress={() => router.push('/screens/admin-businesses' as any)}
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

            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/screens/admin-businesses' as any)}
            >
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47.5%', borderWidth: 1, borderLeftWidth: 3,
    borderRadius: 8, padding: 16, gap: 6, position: 'relative',
  },
  statIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  statLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '600' },
  statArrow: { position: 'absolute', top: 12, right: 12 },
  loadingBox: { paddingTop: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, letterSpacing: 0.5 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 10,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  actionSub: { fontSize: 12, letterSpacing: 0.3 },
});