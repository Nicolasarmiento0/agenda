import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

// --- Local Date Helpers ---
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  return result;
};

const getEndOfWeek = (startDate: Date): Date => {
  const result = new Date(startDate);
  result.setDate(startDate.getDate() + 6);
  return result;
};

const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const monthsSpanish = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const monthsShortSpanish = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const daysSpanish = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const formatDateFriendly = (date: Date): string => {
  return `${daysSpanish[date.getDay()]}, ${date.getDate()} de ${monthsSpanish[date.getMonth()]} de ${date.getFullYear()}`;
};

const formatWeekFriendly = (start: Date, end: Date): string => {
  const startDay = start.getDate();
  const startMonth = monthsShortSpanish[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = monthsShortSpanish[end.getMonth()];
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${startYear}`;
  }
  return `${startDay} - ${endDay} de ${monthsSpanish[start.getMonth()]}, ${startYear}`;
};

const formatMonthFriendly = (date: Date): string => {
  return `${monthsSpanish[date.getMonth()]} ${date.getFullYear()}`;
};

export default function WorkerHistoryScreen() {
  const { business, profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { range } = useLocalSearchParams<{ range?: 'day' | 'week' | 'month' }>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>(range ?? 'day');
  const [isGym, setIsGym] = useState(false);
  
  // Navigation
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const activeRequestToken = React.useRef<number>(0);

  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;
    const token = ++activeRequestToken.current;
    setLoading(true);

    try {
      // 1. Obtener mi worker_id y business_id
      const { data: meData } = await supabase
        .from('workers')
        .select('id, business_id')
        .eq('user_id', profile.id)
        .single();
      
      if (token !== activeRequestToken.current) return;

      if (!meData) {
        setLoading(false);
        return;
      }

      // 2. Detectar si es Gimnasio
      if (meData.business_id) {
        const { data: bData } = await supabase.from('businesses').select('category_id').eq('id', meData.business_id).single();
        if (token !== activeRequestToken.current) return;
        if (bData?.category_id) {
          const { data: catData } = await supabase.from('service_categories').select('name').eq('id', bData.category_id).single();
          if (token !== activeRequestToken.current) return;
          if (catData) setIsGym(catData.name.toUpperCase().includes('GIMNASIO') || catData.name.toUpperCase().includes('FITNESS'));
        }
      }

      // 3. Definir rango de fechas locales
      let startDateStr = '';
      let endDateStr = '';

      if (timeRange === 'day') {
        startDateStr = toLocalDateString(anchorDate);
        endDateStr = startDateStr;
      } else if (timeRange === 'week') {
        const start = getStartOfWeek(anchorDate);
        const end = getEndOfWeek(start);
        startDateStr = toLocalDateString(start);
        endDateStr = toLocalDateString(end);
      } else {
        const start = getStartOfMonth(anchorDate);
        const end = getEndOfMonth(anchorDate);
        startDateStr = toLocalDateString(start);
        endDateStr = toLocalDateString(end);
      }

      // 4. Consultar citas completadas del trabajador
      let query = supabase
        .from('appointments')
        .select('*, workers(name)')
        .eq('worker_id', meData.id)
        .eq('status', 'completed');

      if (timeRange === 'day') {
        query = query.eq('date', startDateStr);
      } else {
        query = query.gte('date', startDateStr).lte('date', endDateStr);
      }

      const { data, error } = await query.order('date', { ascending: false }).order('start_hour', { ascending: false });

      if (token !== activeRequestToken.current) return;
      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      if (token !== activeRequestToken.current) return;
      console.error('Error fetching history:', error);
      showAlert({ title: 'Error', message: 'No se pudo cargar el historial: ' + (error.message || 'Error desconocido') });
    } finally {
      if (token === activeRequestToken.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profile?.id, timeRange, anchorDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    return () => {
      activeRequestToken.current = -1;
    };
  }, []);

  const changeTimeRange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
    setAnchorDate(new Date());
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const amount = direction === 'prev' ? -1 : 1;
    const newAnchor = new Date(anchorDate);
    if (timeRange === 'day') {
      newAnchor.setDate(anchorDate.getDate() + amount);
    } else if (timeRange === 'week') {
      newAnchor.setDate(anchorDate.getDate() + amount * 7);
    } else if (timeRange === 'month') {
      newAnchor.setMonth(anchorDate.getMonth() + amount);
    }
    setAnchorDate(newAnchor);
  };

  const getPeriodLabel = () => {
    if (timeRange === 'day') {
      return formatDateFriendly(anchorDate);
    } else if (timeRange === 'week') {
      const start = getStartOfWeek(anchorDate);
      const end = getEndOfWeek(start);
      return formatWeekFriendly(start, end);
    } else {
      return formatMonthFriendly(anchorDate);
    }
  };

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
      <ScreenHeader leftIcon="arrow-left" onLeft={() => router.back()} title="HISTORIAL" />

      {/* Summary Card */}
      <GlassCard style={appStyles.wh_summaryCard}>
        <Text style={[appStyles.wh_summaryLabel, { color: colors.textSecondary }]}>
          INGRESOS DEL PERIODO · {timeRange === 'day' ? 'DIARIO' : timeRange === 'week' ? 'SEMANAL' : 'MENSUAL'}
        </Text>
        <Text style={[appStyles.wh_summaryValue, { color: colors.textPrimary }]}>
          ${totalEarnings.toLocaleString('es-CL')}
        </Text>
        <Text style={[appStyles.wh_summaryCount, { color: colors.textSecondary }]}>
          {appointments.length} {isGym ? 'asistencias registradas' : 'servicios realizados'}
        </Text>
      </GlassCard>

      {/* Period Navigator */}
      <View style={[styles.navigatorContainer, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <TouchableOpacity 
          onPress={() => navigatePeriod('prev')} 
          style={[styles.navButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Feather name="chevron-left" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={[styles.periodLabel, { color: colors.textPrimary }]}>
          {getPeriodLabel().toUpperCase()}
        </Text>
        
        <TouchableOpacity 
          onPress={() => navigatePeriod('next')} 
          style={[styles.navButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
        >
          <Feather name="chevron-right" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={appStyles.wh_filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={appStyles.wh_filterScroll}>
          <TouchableOpacity 
            onPress={() => changeTimeRange('day')}
            style={[appStyles.wh_filterChip, timeRange === 'day' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[appStyles.wh_filterChipText, { color: timeRange === 'day' ? '#111827' : colors.textSecondary }]}>HOY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => changeTimeRange('week')}
            style={[appStyles.wh_filterChip, timeRange === 'week' && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          >
            <Text style={[appStyles.wh_filterChipText, { color: timeRange === 'week' ? '#111827' : colors.textSecondary }]}>SEMANA</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => changeTimeRange('month')}
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

const styles = StyleSheet.create({
  navigatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
});


