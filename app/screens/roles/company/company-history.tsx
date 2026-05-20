import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

const GYM_KEYWORDS = ['gym', 'gimnasio', 'gimnasios', 'fitness'];
const GYM_PLAN_PRICE: Record<string, number> = { basic: 15000, premium: 25000, vip: 35000 };
const PLAN_LABELS: Record<string, string> = { basic: 'BÁSICO', premium: 'PREMIUM', vip: 'VIP' };

type GymMember = {
  id: string;
  plan: 'basic' | 'premium' | 'vip';
  profiles: { nickname: string; avatar_url: string | null } | null;
  price: number;
};

export default function CompanyHistoryScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { range } = useLocalSearchParams<{ range?: 'day' | 'week' | 'month' }>();

  const isGym = GYM_KEYWORDS.some(kw =>
    business?.category_name?.toLowerCase().includes(kw)
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Non-gym
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>(range ?? 'week');

  // Gym
  const [gymMembers, setGymMembers] = useState<GymMember[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);

    try {
      if (isGym) {
        const [servicesRes, membersRes] = await Promise.all([
          supabase
            .from('business_services')
            .select('name, price')
            .eq('business_id', business.id),
          supabase
            .from('gym_memberships')
            .select('id, plan, status, profiles(nickname, avatar_url)')
            .eq('business_id', business.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
        ]);

        const prices = {
          basic: servicesRes.data?.find((s: any) => s.name === 'Plan Básico')?.price ?? GYM_PLAN_PRICE.basic,
          premium: servicesRes.data?.find((s: any) => s.name === 'Plan Premium')?.price ?? GYM_PLAN_PRICE.premium,
          vip: servicesRes.data?.find((s: any) => s.name === 'Plan VIP')?.price ?? GYM_PLAN_PRICE.vip,
        };

        if (membersRes.error) throw membersRes.error;

        setGymMembers(
          (membersRes.data ?? []).map((m: any) => ({
            ...m,
            price: prices[m.plan as keyof typeof prices] ?? 0,
          })) as GymMember[]
        );
      } else {
        const { data: workersData } = await supabase
          .from('workers')
          .select('id, name')
          .eq('business_id', business.id);
        if (workersData) setWorkers(workersData);

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

        let query = supabase
          .from('appointments')
          .select('*, workers(name)')
          .eq('business_id', business.id)
          .eq('status', 'completed')
          .gte('date', startDate.toISOString().split('T')[0]);

        if (selectedWorkerId !== 'all') {
          query = query.eq('worker_id', selectedWorkerId);
        }

        const { data, error } = await query
          .order('date', { ascending: false })
          .order('start_hour', { ascending: false });

        if (error) throw error;
        setAppointments(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching history:', error);
      showAlert({ title: 'Error', message: 'No se pudo cargar el historial' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business?.id, business?.category_name, selectedWorkerId, timeRange, isGym]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const totalEarnings = isGym
    ? gymMembers.reduce((sum, m) => sum + m.price, 0)
    : appointments.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const renderAppointment = ({ item }: { item: any }) => (
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

  const renderGymMember = ({ item }: { item: GymMember }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.memberAvatar} />
          ) : (
            <View style={[styles.memberAvatarFallback, { backgroundColor: appColors.primary + '20' }]}>
              <Text style={[styles.memberAvatarInitial, { color: appColors.primary }]}>
                {item.profiles?.nickname?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.itemService, { color: colors.textPrimary }]}>
              {item.profiles?.nickname ?? 'Miembro'}
            </Text>
            <Text style={[styles.planLabel, { color: colors.textSecondary }]}>
              {PLAN_LABELS[item.plan] ?? item.plan}
            </Text>
          </View>
        </View>
        <Text style={[styles.itemPrice, { color: appColors.primary }]}>
          ${item.price.toLocaleString('es-CL')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>HISTORIAL</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          {isGym
            ? 'INGRESOS MENSUALES'
            : `INGRESOS TOTALES · ${timeRange === 'day' ? 'HOY' : timeRange === 'week' ? 'ESTA SEMANA' : 'ESTE MES'}`}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
          ${totalEarnings.toLocaleString('es-CL')}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
          {isGym
            ? `${gymMembers.length} miembros activos`
            : `${appointments.length} servicios realizados`}
        </Text>
      </View>

      {!isGym && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(['day', 'week', 'month'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setTimeRange(r)}
                style={[
                  styles.filterChip,
                  timeRange === r && { backgroundColor: appColors.primary, borderColor: appColors.primary },
                ]}
              >
                <Text style={[styles.filterChipText, { color: timeRange === r ? '#fff' : colors.textSecondary }]}>
                  {r === 'day' ? 'HOY' : r === 'week' ? 'SEMANA' : 'MES'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            <TouchableOpacity
              onPress={() => setSelectedWorkerId('all')}
              style={[
                styles.filterChip,
                selectedWorkerId === 'all' && { backgroundColor: '#444', borderColor: '#444' },
              ]}
            >
              <Text style={[styles.filterChipText, { color: selectedWorkerId === 'all' ? '#fff' : colors.textSecondary }]}>
                TODOS
              </Text>
            </TouchableOpacity>
            {workers.map(w => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSelectedWorkerId(w.id)}
                style={[
                  styles.filterChip,
                  selectedWorkerId === w.id && { backgroundColor: '#444', borderColor: '#444' },
                ]}
              >
                <Text style={[styles.filterChipText, { color: selectedWorkerId === w.id ? '#fff' : colors.textSecondary }]}>
                  {w.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={appColors.primary} style={{ marginTop: 40 }} />
      ) : isGym ? (
        <FlatList
          data={gymMembers}
          keyExtractor={item => item.id}
          renderItem={renderGymMember}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay miembros activos aún.
              </Text>
            </View>
          }
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '500',
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
    borderColor: '#333',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
    letterSpacing: 0.3,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
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
});
