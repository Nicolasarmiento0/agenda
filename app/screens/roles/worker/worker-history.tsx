import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

export default function WorkerHistoryScreen() {
  const { business, profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [isGym, setIsGym] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      // 1. Obtener mi worker_id y business_id
      const { data: meData } = await supabase
        .from('workers')
        .select('id, business_id')
        .eq('user_id', profile.id)
        .single();
      
      if (!meData) {
        setLoading(false);
        return;
      }

      // 2. Detectar si es Gimnasio
      if (meData.business_id) {
        const { data: bData } = await supabase.from('businesses').select('category_id').eq('id', meData.business_id).single();
        if (bData?.category_id) {
          const { data: catData } = await supabase.from('service_categories').select('name').eq('id', bData.category_id).single();
          if (catData) setIsGym(catData.name.toUpperCase().includes('GIMNASIO') || catData.name.toUpperCase().includes('FITNESS'));
        }
      }

      // 3. Definir rango de fechas
      const now = new Date();
      let startDate = new Date();
      if (timeRange === 'day') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === 'week') {
        const day = now.getDay() || 7;
        startDate.setDate(now.getDate() - day + 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }

      // 4. Consultar citas completadas del trabajador
      const query = supabase
        .from('appointments')
        .select('*, workers(name)')
        .eq('worker_id', meData.id)
        .eq('status', 'completed')
        .gte('date', startDate.toISOString().split('T')[0]);

      const { data, error } = await query.order('date', { ascending: false }).order('start_hour', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      showAlert({ title: 'Error', message: 'No se pudo cargar el historial: ' + (error.message || 'Error desconocido') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const totalEarnings = appointments.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.itemService, { color: colors.textPrimary }]}>{item.service}</Text>
        <Text style={[styles.itemPrice, { color: appColors.primary }]}>
          ${Number(item.price || 0).toLocaleString('es-CL')}
        </Text>
      </View>
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Feather name="user" size={12} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.client_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="scissors" size={12} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.workers?.name || 'General'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.date}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
          <Feather name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>HISTORIAL</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          INGRESOS TOTALES ({timeRange === 'day' ? 'HOY' : timeRange === 'week' ? 'ESTA SEMANA' : 'ESTE MES'})
        </Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
          ${totalEarnings.toLocaleString('es-CL')}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
          {appointments.length} {isGym ? 'asistencias registradas' : 'servicios realizados'}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            onPress={() => setTimeRange('day')}
            style={[styles.filterChip, timeRange === 'day' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[styles.filterChipText, { color: timeRange === 'day' ? '#fff' : colors.textSecondary }]}>HOY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTimeRange('week')}
            style={[styles.filterChip, timeRange === 'week' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[styles.filterChipText, { color: timeRange === 'week' ? '#fff' : colors.textSecondary }]}>SEMANA</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTimeRange('month')}
            style={[styles.filterChip, timeRange === 'month' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[styles.filterChipText, { color: timeRange === 'month' ? '#fff' : colors.textSecondary }]}>MES</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          <Text style={[styles.filterChipText, { color: colors.textSecondary, marginLeft: 8 }]}>Mis Citas</Text>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={appColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="bar-chart" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No hay servicios completados en este periodo.</Text>
            </View>
          }
        />
      )}

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  hamburger: { fontSize: 26 },
  headerTitle: { fontSize: 12, letterSpacing: 3, fontWeight: '600' },
  summaryCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '600', marginBottom: 8 },
  summaryValue: { fontSize: 32, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  summaryCount: { fontSize: 12, fontWeight: '500' },
  filtersContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  divider: { width: 1, height: 20, backgroundColor: '#333', marginHorizontal: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  itemCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemService: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  itemPrice: { fontSize: 15, fontWeight: '700' },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: { fontSize: 11, fontWeight: '500' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: '80%' },
});
