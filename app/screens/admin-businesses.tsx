import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type Business = {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  category: { name: string } | null;
  owner: { nickname: string } | null;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  suspended: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDIENTE',
  approved: 'APROBADA',
  rejected: 'RECHAZADA',
  suspended: 'SUSPENDIDA',
};

export default function AdminBusinessesScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id, name, status, created_at,
        category:service_categories(name),
        owner:profiles!businesses_owner_id_fkey(nickname)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) setBusinesses(data as any);
    setLoading(false);
  };

  const filtered = filter === 'all' ? businesses : businesses.filter((b) => b.status === filter);

  const counts = {
    all: businesses.length,
    pending: businesses.filter((b) => b.status === 'pending').length,
    approved: businesses.filter((b) => b.status === 'approved').length,
    rejected: businesses.filter((b) => b.status === 'rejected').length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'pending', label: `PENDIENTES (${counts.pending})` },
    { key: 'approved', label: `APROBADAS (${counts.approved})` },
    { key: 'rejected', label: `RECHAZADAS (${counts.rejected})` },
    { key: 'all', label: `TODAS (${counts.all})` },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const renderBusiness = ({ item }: { item: Business }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/screens/admin-business-detail' as any, params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[item.status]}20`, borderColor: STATUS_COLORS[item.status] }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {item.category?.name ?? '—'} · {item.owner?.nickname ?? '—'}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
          Solicitud: {formatDate(item.created_at)}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[styles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>EMPRESAS</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {/* Filtros */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.7}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  borderColor: filter === f.key ? appColors.primary : colors.border,
                  backgroundColor: filter === f.key ? `${appColors.primary}18` : colors.surface,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? appColors.primary : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={appColors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Feather name="inbox" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'pending' ? 'No hay solicitudes pendientes' : 'Sin resultados'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderBusiness}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
            onRefresh={fetchBusinesses}
            refreshing={loading}
          />
        )}
      </Animated.View>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50 },
  hamburger: { fontSize: 26 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 9, letterSpacing: 1.5, fontWeight: '600' },
  card: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  cardHeader: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '600', letterSpacing: 0.5, flex: 1 },
  cardMeta: { fontSize: 12, letterSpacing: 0.5 },
  cardDate: { fontSize: 11, letterSpacing: 0.3 },
  badge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyText: { fontSize: 14, letterSpacing: 0.5 },
});