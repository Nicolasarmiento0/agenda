import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

const PLAN_LABELS: Record<string, { title: string; limit: number; color: string }> = {
  basic: { title: 'BÁSICO', limit: 1, color: '#3B82F6' }, // Blue
  premium: { title: 'PREMIUM', limit: 3, color: '#F59E0B' }, // Amber
  vip: { title: 'VIP', limit: 5, color: '#8B5CF6' }, // Violet
};

const getWeekDays = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }).map((_, i) => {
    const nd = new Date(monday);
    nd.setDate(monday.getDate() + i);
    return nd;
  });
};

const toLocalISOString = (d: Date) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

export default function ClientGymPlanScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { selectedBusiness: contextBusiness, setSelectedBusiness } = useBusiness();
  const { id: businessIdParam } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState(contextBusiness);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [gymMembership, setGymMembership] = useState<any>(null);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState({ completed: 0, noShow: 0, pending: 0, total: 0 });

  useEffect(() => {
    if (contextBusiness) {
      setBusiness(contextBusiness);
    } else if (businessIdParam) {
      supabase.from('businesses').select('*').eq('id', businessIdParam).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setBusiness(data);
            setSelectedBusiness(data);
          }
        });
    }
  }, [contextBusiness, businessIdParam, setSelectedBusiness]);

  const fetchData = useCallback(async () => {
    if (!business?.id || !profile?.id) return;
    setLoading(true);
    
    // 1. Fetch Membership
    const { data: mem } = await supabase
      .from('gym_memberships')
      .select('*')
      .eq('business_id', business.id)
      .eq('client_id', profile.id)
      .maybeSingle();

    setGymMembership(mem ?? null);

    if (mem && mem.status === 'active') {
      // 2. Fetch Weekly Classes
      const today = new Date();
      const currentWeek = getWeekDays(today);
      const weekStart = toLocalISOString(currentWeek[0]);
      const weekEnd = toLocalISOString(currentWeek[6]);
      
      const { count: weekCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('client_id', profile.id)
        .eq('service', 'CLASE')
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .in('status', ['confirmed', 'pending']);
        
      setWeeklyUsed(weekCount ?? 0);

      // 3. Fetch Monthly Stats
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const monthStart = `${y}-${m}-01`;
      const nextMonth = new Date(y, today.getMonth() + 1, 1);
      const monthEnd = toLocalISOString(new Date(nextMonth.getTime() - 86400000));

      const { data: monthAppts } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('business_id', business.id)
        .eq('client_id', profile.id)
        .eq('service', 'CLASE')
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (monthAppts) {
        let completed = 0;
        let noShow = 0;
        let pending = 0;
        monthAppts.forEach(a => {
          if (a.status === 'completed') completed++;
          if (a.status === 'no-show') noShow++;
          if (a.status === 'confirmed' || a.status === 'pending') pending++;
        });
        setMonthlyStats({ completed, noShow, pending, total: monthAppts.length });
      }
    }
    
    setLoading(false);
  }, [business?.id, profile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Mi Plan" leftIcon="arrow-left" onLeft={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      </View>
    );
  }

  if (!gymMembership) {
    return (
      <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Mi Plan" leftIcon="arrow-left" onLeft={() => router.back()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Feather name="alert-circle" size={48} color={colors.border} style={{ marginBottom: 16 }} />
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }}>Sin membresía activa</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 15, lineHeight: 22 }}>
            No encontramos un plan asociado a tu cuenta en este gimnasio. Solicita uno en la agenda.
          </Text>
        </View>
      </View>
    );
  }

  const planInfo = PLAN_LABELS[gymMembership.plan] || PLAN_LABELS['basic'];
  const limit = planInfo.limit;
  const used = Math.min(weeklyUsed, limit);
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const isFull = used >= limit;

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header con toggle de dark mode incluido (sin hideRight) */}
      <ScreenHeader title="Detalle de Mi Plan" leftIcon="arrow-left" onLeft={() => router.back()} />
      
      <ScrollView contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false}>
        
        {/* ─── Hero Banner: Tipo de Plan ─── */}
        <GlassCard style={{ padding: 24, alignItems: 'center', overflow: 'hidden' }}>
          <View style={{ 
            position: 'absolute', top: -50, right: -50, width: 120, height: 120, 
            borderRadius: 60, backgroundColor: planInfo.color, opacity: 0.1 
          }} />
          <View style={{ 
            position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, 
            borderRadius: 40, backgroundColor: appColors.primary, opacity: 0.05 
          }} />

          <View style={{ backgroundColor: planInfo.color + '1A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, marginBottom: 16 }}>
            <Text style={{ color: planInfo.color, fontWeight: '800', fontSize: 13, letterSpacing: 1.5 }}>PLAN {planInfo.title}</Text>
          </View>
          
          <Text style={{ fontSize: 40, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
            {limit} <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '600' }}>clases/sem</Text>
          </Text>

          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: gymMembership.status === 'active' ? '#10B981' : '#EF4444' }} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
              {gymMembership.status === 'active' ? 'ACTIVO' : gymMembership.status === 'suspended' ? 'SUSPENDIDO' : 'INACTIVO'}
            </Text>
          </View>
        </GlassCard>

        {gymMembership.status === 'active' && (
          <>
            {/* ─── Progreso Semanal ─── */}
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>
                Progreso Semanal
              </Text>
              <GlassCard style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isFull ? '#FEF2F2' : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'), justifyContent: 'center', alignItems: 'center' }}>
                      <Feather name="activity" size={20} color={isFull ? '#EF4444' : appColors.primary} />
                    </View>
                    <View>
                      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Clases Usadas</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>Esta semana</Text>
                    </View>
                  </View>
                  <Text style={{ color: isFull ? '#EF4444' : colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
                    {used} <Text style={{ fontSize: 15, color: colors.textSecondary }}>/ {limit}</Text>
                  </Text>
                </View>
                
                <View style={{ height: 10, backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{ 
                    height: '100%', 
                    width: `${pct}%`, 
                    backgroundColor: isFull ? '#EF4444' : appColors.primary,
                    borderRadius: 5
                  }} />
                </View>
                
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 14, fontWeight: '500' }}>
                  {isFull ? 'Has alcanzado tu límite. ¡Nos vemos la próxima semana!' : `Te quedan ${limit - used} clases disponibles.`}
                </Text>
              </GlassCard>
            </View>

            {/* ─── Resumen Mensual ─── */}
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>
                Resumen Mensual
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                
                {/* Asistidas */}
                <GlassCard style={{ flex: 1, minWidth: '40%', padding: 20 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B98120', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Feather name="check" size={22} color="#10B981" />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{monthlyStats.completed}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 }}>Asistidas</Text>
                </GlassCard>

                {/* Agendadas */}
                <GlassCard style={{ flex: 1, minWidth: '40%', padding: 20 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#3B82F620', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Feather name="calendar" size={22} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{monthlyStats.pending}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 }}>Agendadas</Text>
                </GlassCard>

                {/* No-show */}
                <GlassCard style={{ flex: 1, minWidth: '40%', padding: 20 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Feather name="x" size={22} color="#EF4444" />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{monthlyStats.noShow}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 }}>No-shows</Text>
                </GlassCard>

                {/* Totales */}
                <GlassCard style={{ flex: 1, minWidth: '40%', padding: 20 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Feather name="bar-chart-2" size={22} color={colors.textPrimary} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary }}>{monthlyStats.total}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 }}>Total Mes</Text>
                </GlassCard>

              </View>
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
});
