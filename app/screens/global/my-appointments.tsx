import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../../components/GlassCard';
import Sidebar from '../../../components/Sidebar';
import { useAlert } from '../../../context/AlertContext';
import { useTheme } from '../../../context/ThemeContext';
import { appColors, appStyles } from '../../../styles/appStyles';

import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function MyAppointmentsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Refresca citas al cargar y cada vez que el usuario vuelve a esta pantalla
  useFocusEffect(useCallback(() => {
    fetchAppointments();
  }, [profile]));

  const fetchAppointments = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, businesses(name, address), workers(name)')
      .eq('client_id', profile.id)
      .order('date', { ascending: true })
      .order('start_hour', { ascending: true });

    if (data) {
      setAppointments(data);
    }
    setLoading(false);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, []);

  const handleCancel = (apptId: string) => {
    showAlert({
      title: 'CANCELAR CITA',
      message: '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar cita',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('appointments').delete().eq('id', apptId);
            if (!error) {
              fetchAppointments();
            } else {
              showAlert({
                title: 'Error',
                message: 'No se pudo cancelar la cita. Intenta nuevamente.',
              });
            }
          },
        },
      ],
    });
  };

  const formatHour = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingApps = appointments.filter(a => a.date >= todayStr && a.status !== 'completed' && a.status !== 'no-show');
  const historyApps = appointments.filter(a => a.date < todayStr || a.status === 'completed' || a.status === 'no-show');
  const displayedApps = activeTab === 'upcoming' ? upcomingApps : historyApps;

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>MIS CITAS</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], flex: 1 }]}>

          {/* Tabs */}
          <View style={[localStyles.tabs, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[localStyles.tab, activeTab === 'upcoming' && localStyles.tabActive, activeTab === 'upcoming' && { borderBottomColor: appColors.primary }]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Text style={[localStyles.tabText, { color: activeTab === 'upcoming' ? appColors.primary : colors.textSecondary }]}>PRÓXIMAS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.tab, activeTab === 'history' && localStyles.tabActive, activeTab === 'history' && { borderBottomColor: appColors.primary }]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[localStyles.tabText, { color: activeTab === 'history' ? appColors.primary : colors.textSecondary }]}>HISTORIAL</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>Cargando...</Text>
          ) : displayedApps.length === 0 ? (
            <View style={localStyles.emptyContainer}>
              <View style={[localStyles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="calendar" size={32} color={colors.textSecondary} />
              </View>
              <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>SIN CITAS</Text>
              <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'upcoming' ? 'Aún no tienes citas agendadas.\nExplora negocios y reserva una.' : 'No tienes historial de citas.'}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              {displayedApps.map(appt => {
                const apptDate = new Date(`${appt.date}T${String(Math.floor(appt.start_hour)).padStart(2, '0')}:${String(Math.round((appt.start_hour % 1) * 60)).padStart(2, '0')}:00`);
                const hoursDiff = (apptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
                const canCancel = activeTab === 'upcoming' && hoursDiff > 2;

                return (
                  <GlassCard key={appt.id} style={localStyles.apptCard}>
                    <View style={localStyles.apptHeader}>
                      <View>
                        <Text style={[localStyles.businessName, { color: colors.textPrimary }]}>{appt.businesses?.name || 'Negocio'}</Text>
                        <Text style={[localStyles.serviceName, { color: colors.textSecondary }]}>{appt.service}</Text>
                      </View>
                      <View style={[localStyles.statusBadge, appt.status === 'confirmed' ? { backgroundColor: '#EEF8F0' } : { backgroundColor: '#FFF5E5' }]}>
                        <Text style={[localStyles.statusText, appt.status === 'confirmed' ? { color: '#2E7D45' } : { color: '#A0660A' }]}>
                          {appt.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                        </Text>
                      </View>
                    </View>

                    <View style={localStyles.apptDetails}>
                      <View style={localStyles.detailRow}>
                        <Feather name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={[localStyles.detailText, { color: colors.textPrimary }]}>{appt.date}</Text>
                      </View>
                      <View style={localStyles.detailRow}>
                        <Feather name="clock" size={14} color={colors.textSecondary} />
                        <Text style={[localStyles.detailText, { color: colors.textPrimary }]}>{formatHour(appt.start_hour)}</Text>
                      </View>
                      <View style={[localStyles.detailRow, { flex: 1 }]}>
                        <Feather name="user" size={14} color={colors.textSecondary} />
                        <Text style={[localStyles.detailText, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{appt.workers?.name || 'Barbero'}</Text>
                      </View>
                    </View>

                    {canCancel && (
                      <TouchableOpacity
                        style={localStyles.cancelBtn}
                        onPress={() => handleCancel(appt.id)}
                      >
                        <Text style={localStyles.cancelBtnText}>Cancelar Cita</Text>
                      </TouchableOpacity>
                    )}
                  </GlassCard>
                );
              })}
            </View>
          )}

        </Animated.View>
      </ScrollView>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  hamburger: { fontSize: 26 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  apptCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Inter_700Bold',
  },
  serviceName: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  apptDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  cancelBtnText: {
    color: '#E24B4A',
    fontSize: 14,
    fontWeight: '600',
  }
});
