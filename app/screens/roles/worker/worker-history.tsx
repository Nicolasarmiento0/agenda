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
import GlassCard from '../../../../components/GlassCard';
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
    <GlassCard style={appStyles.wh_itemCard}>
      <View style={appStyles.wh_itemHeader}>
        <Text style={[appStyles.wh_itemService, { color: colors.textPrimary }]}>{item.service}</Text>
        <Text style={[appStyles.wh_itemPrice, { color: appColors.primary }]}>
          ${Number(item.price || 0).toLocaleString('es-CL')}
        </Text>
      </View>
      <View style={appStyles.wh_itemDetails}>
        <View style={appStyles.wh_detailRow}>
          <Feather name="user" size={12} color={colors.textSecondary} />
          <Text style={[appStyles.wh_detailText, { color: colors.textSecondary }]}>{item.client_name}</Text>
        </View>
        <View style={appStyles.wh_detailRow}>
          <Feather name="scissors" size={12} color={colors.textSecondary} />
          <Text style={[appStyles.wh_detailText, { color: colors.textSecondary }]}>{item.workers?.name || 'General'}</Text>
        </View>
        <View style={appStyles.wh_detailRow}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={[appStyles.wh_detailText, { color: colors.textSecondary }]}>{item.date}</Text>
        </View>
      </View>
    </GlassCard>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={appStyles.wh_header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)}>
          <Feather name="menu" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[appStyles.wh_headerTitle, { color: colors.textSecondary }]}>HISTORIAL</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <GlassCard style={appStyles.wh_summaryCard}>
        <Text style={[appStyles.wh_summaryLabel, { color: colors.textSecondary }]}>
          INGRESOS TOTALES ({timeRange === 'day' ? 'HOY' : timeRange === 'week' ? 'ESTA SEMANA' : 'ESTE MES'})
        </Text>
        <Text style={[appStyles.wh_summaryValue, { color: colors.textPrimary }]}>
          ${totalEarnings.toLocaleString('es-CL')}
        </Text>
        <Text style={[appStyles.wh_summaryCount, { color: colors.textSecondary }]}>
          {appointments.length} {isGym ? 'asistencias registradas' : 'servicios realizados'}
        </Text>
      </GlassCard>

      {/* Filters */}
      <View style={appStyles.wh_filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={appStyles.wh_filterScroll}>
          <TouchableOpacity 
            onPress={() => setTimeRange('day')}
            style={[appStyles.wh_filterChip, timeRange === 'day' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[appStyles.wh_filterChipText, { color: timeRange === 'day' ? '#111827' : colors.textSecondary }]}>HOY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTimeRange('week')}
            style={[appStyles.wh_filterChip, timeRange === 'week' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[appStyles.wh_filterChipText, { color: timeRange === 'week' ? '#111827' : colors.textSecondary }]}>SEMANA</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTimeRange('month')}
            style={[appStyles.wh_filterChip, timeRange === 'month' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[appStyles.wh_filterChipText, { color: timeRange === 'month' ? '#111827' : colors.textSecondary }]}>MES</Text>
          </TouchableOpacity>
          
          <View style={appStyles.wh_divider} />
          <Text style={[appStyles.wh_filterChipText, { color: colors.textSecondary, marginLeft: 8 }]}>Mis Citas</Text>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={appColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={appStyles.wh_listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
          ListEmptyComponent={
            <View style={appStyles.wh_emptyContainer}>
              <Feather name="bar-chart" size={48} color={colors.textSecondary} />
              <Text style={[appStyles.wh_emptyText, { color: colors.textSecondary }]}>No hay servicios completados en este periodo.</Text>
            </View>
          }
        />
      )}

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}


