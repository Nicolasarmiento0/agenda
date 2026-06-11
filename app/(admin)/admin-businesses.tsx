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
import EmptyState from '../../components/EmptyState';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import { STATUS_COLORS, STATUS_LABELS } from '../../constants/businessStatus';
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
  workers?: { count: number }[];
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminBusinessesScreen() {
  const { colors } = useTheme();
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
        owner:profiles!businesses_owner_id_fkey(nickname),
        workers:workers(count)
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

  const renderBusiness = ({ item }: { item: Business }) => {
    const workerCount = item.workers?.[0]?.count ?? 0;
    return (
      <GlassCard style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() =>
            router.push({
              pathname: '/admin-business-detail',
              params: { id: item.id },
            })
          }
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
        >
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <StatusBadge status={item.status} colors={STATUS_COLORS} labels={STATUS_LABELS} />
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {item.category?.name ?? '—'} · {item.owner?.nickname ?? '—'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                Solicitud: {formatDate(item.created_at)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="users" size={12} color={appColors.primary} />
                <Text style={[styles.cardWorkers, { color: colors.textSecondary }]}>
                  {workerCount} {workerCount === 1 ? 'trabajador' : 'trabajadores'}
                </Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </GlassCard>
    );
  };

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="EMPRESAS" onLeft={() => setSidebarVisible(true)} leftIcon="menu" />

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
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f.key ? appColors.primary : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={appStyles.centerFlex}>
            <ActivityIndicator size="large" color={appColors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={appStyles.centerFlex}>
            <EmptyState
              icon="inbox"
              title={filter === 'pending' ? 'SIN PENDIENTES' : 'SIN RESULTADOS'}
              subtitle={
                filter === 'pending'
                  ? 'No hay solicitudes pendientes de revisión'
                  : 'No se encontraron empresas con este filtro'
              }
            />
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  filterText: { fontSize: 9, letterSpacing: 1.5, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  card: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14 },
  cardBody: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, flex: 1 },
  cardMeta: { fontSize: 12, letterSpacing: 0.5, fontFamily: 'Inter_400Regular' },
  cardDate: { fontSize: 11, letterSpacing: 0.3, fontFamily: 'Inter_400Regular' },
  cardWorkers: { fontSize: 11, letterSpacing: 0.3, fontFamily: 'Inter_400Regular' },
});
