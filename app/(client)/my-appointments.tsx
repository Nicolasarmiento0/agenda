import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
import GlassCard from '../../components/GlassCard';
import Skeleton from '../../components/ui/Skeleton';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { appColors, appStyles } from '../../styles/appStyles';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

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

    if (error) {
      showAlert({ title: 'Error', message: 'No se pudieron cargar tus citas.' });
    } else if (data) {
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
      title: 'CANCELAR O ELIMINAR CITA',
      message: '¿Qué deseas hacer con esta cita?',
      buttons: [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Marcar como Cancelada',
          style: 'default',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .update({ status: 'cancelled' })
              .eq('id', apptId);
            if (!error) {
              fetchAppointments();
            } else {
              showAlert({ title: 'Error', message: 'No se pudo cancelar la cita. Intenta nuevamente.' });
            }
          },
        },
        {
          text: 'Eliminar permanentemente',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('appointments')
              .delete()
              .eq('id', apptId);
            if (!error) {
              fetchAppointments();
            } else {
              showAlert({ title: 'Error', message: 'No se pudo eliminar la cita. Intenta nuevamente.' });
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

  const ACTIVE_STATUSES = ['pending', 'confirmed', 'rescheduled'];
  const PAST_STATUSES = ['completed', 'no-show', 'cancelled'];
  const upcomingApps = appointments.filter(a => a.date >= todayStr && ACTIVE_STATUSES.includes(a.status));
  const historyApps = appointments.filter(a => a.date < todayStr || PAST_STATUSES.includes(a.status));
  const displayedApps = activeTab === 'upcoming' ? upcomingApps : historyApps;

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/client-dashboard');
            }
          }}
          activeOpacity={0.7}
          style={{ width: 40, padding: 4 }}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>MIS CITAS</Text>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            toggleTheme();
          }} 
          activeOpacity={0.7} 
          style={{ width: 40, alignItems: 'flex-end' }}
        >
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
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('upcoming');
              }}
            >
              <Text style={[localStyles.tabText, { color: activeTab === 'upcoming' ? appColors.primary : colors.textSecondary }]}>PRÓXIMAS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[localStyles.tab, activeTab === 'history' && localStyles.tabActive, activeTab === 'history' && { borderBottomColor: appColors.primary }]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveTab('history');
              }}
            >
              <Text style={[localStyles.tabText, { color: activeTab === 'history' ? appColors.primary : colors.textSecondary }]}>HISTORIAL</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} style={localStyles.apptCard}>
                  <View style={localStyles.apptHeader}>
                    <View style={{ gap: 4 }}>
                      <Skeleton width={140} height={16} />
                      <Skeleton width={80} height={12} />
                    </View>
                    <Skeleton width={70} height={18} borderRadius={8} />
                  </View>
                  <View style={localStyles.apptDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="calendar" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      <Skeleton width={70} height={13} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="clock" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      <Skeleton width={50} height={13} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Feather name="user" size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      <Skeleton width={80} height={13} />
                    </View>
                  </View>
                  <View style={[localStyles.actionsRow, { borderTopColor: colors.border, paddingTop: 12, gap: 12, justifyContent: 'space-around' }]}>
                    <Skeleton width={90} height={14} />
                    <View style={{ width: 1, height: 14, backgroundColor: colors.border }} />
                    <Skeleton width={90} height={14} />
                  </View>
                </GlassCard>
              ))}
            </View>
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
                      {(() => {
                        const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
                          confirmed:   { bg: '#EEF8F0', text: '#2E7D45', label: 'Confirmado' },
                          pending:     { bg: '#FFF5E5', text: '#A0660A', label: 'Pendiente' },
                          rescheduled: { bg: '#FFF5E5', text: '#F39C12', label: 'Reprogramado' },
                          completed:   { bg: '#F0F0F0', text: '#555555', label: 'Completado' },
                          'no-show':   { bg: '#FDEAEB', text: '#D00024', label: 'No asistió' },
                          cancelled:   { bg: '#F0F0F0', text: '#888888', label: 'Cancelado' },
                        };
                        const s = STATUS_MAP[appt.status] ?? STATUS_MAP.pending;
                        return (
                          <View style={[localStyles.statusBadge, { backgroundColor: s.bg }]}>
                            <Text style={[localStyles.statusText, { color: s.text }]}>{s.label}</Text>
                          </View>
                        );
                      })()}
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
                      <View style={[localStyles.actionsRow, { borderTopColor: colors.border }]}>
                        {(!appt.reschedule_count || appt.reschedule_count < 1) && (
                          <TouchableOpacity
                            style={[localStyles.actionBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}
                            onPress={() => {
                              router.push({
                                pathname: '/calendar',
                                params: {
                                  businessId: appt.business_id,
                                  rescheduleApptId: appt.id,
                                },
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[localStyles.actionBtnText, { color: appColors.primary }]}>Reagendar</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={localStyles.actionBtn}
                          onPress={() => handleCancel(appt.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[localStyles.actionBtnText, { color: '#E24B4A' }]}>Cancelar Cita</Text>
                        </TouchableOpacity>
                      </View>
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  }
});
