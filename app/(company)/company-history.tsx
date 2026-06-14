import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';
import { exportToCSV } from '../../utils/csvExporter';

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

export default function CompanyHistoryScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();
  const { range } = useLocalSearchParams<{ range?: 'day' | 'week' | 'month' }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>(range ?? 'week');
  
  // Navigation
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    const dataToExport = appointments;
    if (dataToExport.length === 0) {
      showAlert({
        title: 'Sin datos',
        message: 'No hay registros en el periodo seleccionado para exportar.',
      });
      return;
    }

    setExporting(true);
    try {
      const businessName = business?.name ? business.name.replace(/\s+/g, '_') : 'Empresa';
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `Nucora_Ingresos_${businessName}_${todayStr}.csv`;

      const headers = [
        { label: 'Servicio', key: 'service' },
        { label: 'Precio', key: 'price' },
        { label: 'Cliente', key: 'client_name' },
        { label: 'Trabajador', key: 'worker_name' },
        { label: 'Fecha', key: 'date' },
        { label: 'Hora', key: 'hour' },
      ];

      const formatHourHelper = (h: number) => {
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      };

      const mappedData = appointments.map(item => ({
        service: item.service,
        price: Number(item.price || 0),
        client_name: item.client_name,
        worker_name: item.workers?.name || 'General',
        date: item.date,
        hour: formatHourHelper(Number(item.start_hour)),
      }));

      await exportToCSV({
        data: mappedData,
        headers,
        filename,
      });

    } catch (err: any) {
      console.error('Error al exportar CSV:', err);
      showAlert({
        title: 'Error de Exportación',
        message: err.message || 'Ocurrió un error al intentar generar el archivo CSV.',
      });
    } finally {
      setExporting(false);
    }
  };

  const activeRequestToken = React.useRef<number>(0);

  const fetchHistory = useCallback(async () => {
    if (!business?.id) return;
    const token = ++activeRequestToken.current;
    setLoading(true);

    try {
      const { data: workersData } = await supabase
        .from('workers')
        .select('id, name')
        .eq('business_id', business.id);

      if (token !== activeRequestToken.current) return;
      if (workersData) setWorkers(workersData);

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

      let query = supabase
        .from('appointments')
        .select('*, workers(name)')
        .eq('business_id', business.id)
        .eq('status', 'completed');

      if (timeRange === 'day') {
        query = query.eq('date', startDateStr);
      } else {
        query = query.gte('date', startDateStr).lte('date', endDateStr);
      }

      if (selectedWorkerId !== 'all') {
        query = query.eq('worker_id', selectedWorkerId);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('start_hour', { ascending: false });

      if (token !== activeRequestToken.current) return;
      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      if (token !== activeRequestToken.current) return;
      console.error('Error fetching history:', error);
      showAlert({ title: 'Error', message: 'No se pudo cargar el historial' });
    } finally {
      if (token === activeRequestToken.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [business?.id, selectedWorkerId, timeRange, anchorDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

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

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const totalEarnings = appointments.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const renderAppointment = ({ item }: { item: any }) => (
    <GlassCard style={styles.itemCard}>
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
    </GlassCard>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader leftIcon="arrow-left" onLeft={() => router.back()} title="HISTORIAL" />

      <GlassCard style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          {`INGRESOS DEL PERIODO · ${timeRange === 'day' ? 'DIARIO' : timeRange === 'week' ? 'SEMANAL' : 'MENSUAL'}`}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
          ${totalEarnings.toLocaleString('es-CL')}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
          {`${appointments.length} servicios realizados`}
        </Text>

        <TouchableOpacity
          style={[styles.exportButton, { borderColor: colors.border }]}
          onPress={handleExportCSV}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={appColors.primary} />
          ) : (
            <>
              <Feather name="download" size={14} color={appColors.primary} />
              <Text style={[styles.exportButtonText, { color: appColors.primary }]}>EXPORTAR CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </GlassCard>

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

      <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(['day', 'week', 'month'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => changeTimeRange(r)}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  timeRange === r && { backgroundColor: appColors.primary, borderColor: appColors.primary },
                ]}
              >
                <Text style={[styles.filterChipText, { color: timeRange === r ? '#111827' : colors.textSecondary }]}>
                  {r === 'day' ? 'HOY' : r === 'week' ? 'SEMANA' : 'MES'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => setSelectedWorkerId('all')}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                selectedWorkerId === 'all' && { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary },
              ]}
            >
              <Text style={[styles.filterChipText, { color: selectedWorkerId === 'all' ? colors.background : colors.textSecondary }]}>
                TODOS
              </Text>
            </TouchableOpacity>
            {workers.map(w => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSelectedWorkerId(w.id)}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  selectedWorkerId === w.id && { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary },
                ]}
              >
                <Text style={[styles.filterChipText, { color: selectedWorkerId === w.id ? colors.background : colors.textSecondary }]}>
                  {w.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={appColors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderAppointment}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="bar-chart" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay servicios completados en este periodo.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  filtersContainer: {
    marginBottom: 12,
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
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemService: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  planLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: '80%',
  },
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  exportButtonText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
});
