import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassModal from '../../components/GlassModal';
import InfoRow from '../../components/ui/InfoRow';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import { STATUS_COLORS, STATUS_LABELS } from '../../constants/businessStatus';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type Worker = {
  id: string;
  name: string;
  specialty: string | null;
  color: string | null;
  email: string | null;
  active: boolean;
};

type BusinessDetail = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
  category: { name: string } | null;
  owner: { nickname: string; id: string } | null;
  workers: Worker[];
};

export default function AdminBusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    fetchBusiness();
  }, [id]);

  const fetchBusiness = async () => {
    setLoading(true);
    const [bizRes, apptRes] = await Promise.all([
      supabase
        .from('businesses')
        .select(`
          id, name, status, description, address, phone, logo_url, created_at,
          category:service_categories(name),
          owner:profiles!businesses_owner_id_fkey(id, nickname),
          workers:workers(*)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('appointments')
        .select(`
          id, date, start_hour, duration_hours, service, status, client_name, client_id,
          workers(name)
        `)
        .eq('business_id', id)
        .gte('date', new Date().toISOString().split('T')[0])
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .order('start_hour', { ascending: true })
        .limit(5)
    ]);

    if (!bizRes.error && bizRes.data) {
      setBusiness(bizRes.data as any);
    }
    if (!apptRes.error && apptRes.data) {
      let fetchedAppointments = apptRes.data || [];
      if (fetchedAppointments.length > 0) {
        const clientIds = fetchedAppointments
          .map((a: any) => a.client_id)
          .filter((cid: any) => cid !== null);

        if (clientIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', clientIds);

          if (profilesData) {
            const profileMap = new Map(profilesData.map((p: any) => [p.id, p.nickname]));
            fetchedAppointments = fetchedAppointments.map((appt: any) => ({
              ...appt,
              client_nickname: appt.client_id ? profileMap.get(appt.client_id) : null
            }));
          }
        }
      }
      setAppointments(fetchedAppointments as any);
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setLoading(false);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchBusiness();
    setRefreshing(false);
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const updateStatus = async (status: string) => {
    setProcessing(true);
    const { error } = await supabase.from('businesses').update({ status }).eq('id', id);
    setProcessing(false);
    return error;
  };

  const handleApprove = () => {
    showAlert({
      title: 'Aprobar empresa',
      message: `¿Confirmas la aprobación de "${business?.name}"? La empresa podrá operar inmediatamente.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'APROBAR',
          onPress: async () => {
            const error = await updateStatus('approved');
            if (error) {
              showAlert({ title: 'Error', message: 'No se pudo aprobar. Inténtalo de nuevo.' });
            } else {
              setBusiness((prev) => (prev ? { ...prev, status: 'approved' } : prev));
              showAlert({
                title: '✓ Empresa aprobada',
                message: 'La empresa puede operar ahora.',
                buttons: [{ text: 'OK', onPress: () => router.back() }],
              });
            }
          },
        },
      ],
    });
  };

  const handleReject = async () => {
    const error = await updateStatus('rejected');
    setRejectModal(false);
    if (error) {
      showAlert({ title: 'Error', message: 'No se pudo rechazar. Inténtalo de nuevo.' });
    } else {
      setBusiness((prev) => (prev ? { ...prev, status: 'rejected' } : prev));
      showAlert({
        title: 'Solicitud rechazada',
        message: 'La empresa fue notificada.',
        buttons: [{ text: 'OK', onPress: () => router.back() }],
      });
    }
  };

  const handleSuspend = () => {
    showAlert({
      title: 'Suspender empresa',
      message: `¿Estás seguro de que deseas suspender "${business?.name}"? No podrán agendar nuevas citas.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'SUSPENDER',
          style: 'destructive',
          onPress: async () => {
            const error = await updateStatus('suspended');
            if (error) {
              showAlert({ title: 'Error', message: 'No se pudo suspender.' });
            } else {
              setBusiness((prev) => (prev ? { ...prev, status: 'suspended' } : prev));
              showAlert({ title: '✓ Empresa suspendida', message: 'El negocio ha sido bloqueado temporalmente.' });
            }
          },
        },
      ],
    });
  };

  const handleReactivate = () => {
    showAlert({
      title: 'Re-activar empresa',
      message: `¿Deseas activar nuevamente "${business?.name}"?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'ACTIVAR',
          onPress: async () => {
            const error = await updateStatus('approved');
            if (error) {
              showAlert({ title: 'Error', message: 'No se pudo activar.' });
            } else {
              setBusiness((prev) => (prev ? { ...prev, status: 'approved' } : prev));
              showAlert({ title: '✓ Empresa activada', message: 'El negocio ya puede operar normalmente.' });
            }
          },
        },
      ],
    });
  };

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="DETALLE DE EMPRESA"
        onLeft={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/admin-businesses');
          }
        }}
        leftIcon="arrow-left"
      />

      {loading ? (
        <View style={appStyles.centerFlex}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      ) : !business ? (
        <View style={appStyles.centerFlex}>
          <Text style={{ color: colors.textSecondary }}>No encontrado</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
          >
            {/* Logo + nombre + estado */}
            <View style={styles.profileSection}>
              {business.logo_url ? (
                <Image source={{ uri: business.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="briefcase" size={32} color={colors.textSecondary} />
                </View>
              )}
              <Text style={[styles.businessName, { color: colors.textPrimary }]}>{business.name}</Text>
              <StatusBadge status={business.status} colors={STATUS_COLORS} labels={STATUS_LABELS} />
            </View>

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <InfoRow label="CATEGORÍA" value={business.category?.name ?? null} />
              <InfoRow label="DESCRIPCIÓN" value={business.description} />
              <InfoRow label="DIRECCIÓN" value={business.address} />
              <InfoRow label="TELÉFONO" value={business.phone} />
              <InfoRow label="PROPIETARIO" value={business.owner?.nickname ?? null} />
              <InfoRow label="SOLICITUD" value={formatDate(business.created_at)} />
            </View>

            {/* Banner Agenda */}
            {business.status === 'approved' && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.agendaBanner, { borderColor: appColors.primary }]}
                onPress={() => router.push(`/calendar?businessId=${id}`)}
              >
                <View style={[styles.agendaBannerIcon, { backgroundColor: `${appColors.primary}20` }]}>
                  <Feather name="calendar" size={24} color={appColors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.agendaBannerTitle, { color: colors.textPrimary }]}>MONITOREAR AGENDA</Text>
                  <Text style={[styles.agendaBannerSub, { color: colors.textSecondary }]}>
                    Ver calendario de citas y disponibilidad en tiempo real
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Trabajadores */}
            <Text style={[appStyles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
              TRABAJADORES ({business.workers?.length ?? 0})
            </Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              {!business.workers || business.workers.length === 0 ? (
                <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 20, alignItems: 'center' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                    Sin trabajadores registrados
                  </Text>
                </View>
              ) : (
                business.workers.map((worker) => (
                  <View
                    key={worker.id}
                    style={[
                      styles.workerCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={[
                          styles.workerAvatar,
                          {
                            backgroundColor: `${worker.color || '#3B7BE0'}18`,
                            borderColor: worker.color || '#3B7BE0',
                          },
                        ]}
                      >
                        <Text style={[styles.workerAvatarText, { color: worker.color || '#3B7BE0' }]}>
                          {(worker.name || 'T').substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.workerName, { color: colors.textPrimary }]}>
                          {worker.name}
                        </Text>
                        <Text style={[styles.workerSpecialty, { color: colors.textSecondary }]}>
                          {worker.specialty || 'Sin especialidad'}
                        </Text>
                        {worker.email ? (
                          <Text style={[styles.workerEmail, { color: colors.textSecondary }]}>
                            {worker.email}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.workerStatusBadge,
                          {
                            backgroundColor: worker.active ? '#EEF8F0' : '#FDEAEB',
                          },
                        ]}
                      >
                        <Text style={[styles.workerStatusText, { color: worker.active ? '#2E7D45' : '#D00024' }]}>
                          {worker.active ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Próximas Citas */}
            <Text style={[appStyles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
              PRÓXIMAS CITAS ({appointments.length})
            </Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              {appointments.length === 0 ? (
                <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, padding: 20, alignItems: 'center' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
                    Sin citas próximas programadas
                  </Text>
                </View>
              ) : (
                appointments.map((appt) => {
                  const formatHour = (h: number) => {
                    const hh = Math.floor(h);
                    const mm = Math.round((h - hh) * 60);
                    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                  };

                  return (
                    <View
                      key={appt.id}
                      style={[
                        styles.workerCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.workerName, { color: colors.textPrimary }]}>
                            {appt.client_name || 'Cliente'}
                          </Text>
                          <Text style={[styles.workerSpecialty, { color: colors.textSecondary }]}>
                            {appt.service} · {appt.workers?.name || 'Cualquiera'}
                          </Text>
                          <Text style={[styles.workerEmail, { color: colors.textSecondary }]}>
                            {appt.date} a las {formatHour(appt.start_hour)}
                          </Text>
                          <Text style={[styles.workerEmail, { color: colors.textSecondary, marginTop: 2 }]}>
                            Creada por: {appt.client_id ? `Cliente (${appt.client_nickname || 'Sin apodo'})` : 'El negocio'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.workerStatusBadge,
                            {
                              backgroundColor: appt.status === 'confirmed' ? '#EEF8F0' : '#FFF5E5',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.workerStatusText,
                              { color: appt.status === 'confirmed' ? '#2E7D45' : '#A0660A' },
                            ]}
                          >
                            {appt.status === 'confirmed' ? 'Confirmada' : appt.status === 'pending' ? 'Pendiente' : appt.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.actionBar}>
            {business.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, { opacity: processing ? 0.5 : 1 }]}
                  activeOpacity={0.8}
                  onPress={() => setRejectModal(true)}
                  disabled={processing}
                >
                  <Feather name="x" size={18} color="#EF4444" />
                  <Text style={styles.rejectText}>RECHAZAR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn, { opacity: processing ? 0.5 : 1 }]}
                  activeOpacity={0.8}
                  onPress={handleApprove}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#fff" />
                      <Text style={styles.approveText}>APROBAR</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {business.status === 'approved' && (
              <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: appColors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => router.push((`/admin-business-employees?id=${id}`) as any)}
                >
                  <Feather name="users" size={18} color="#111827" />
                  <Text style={[styles.approveText, { color: '#111827' }]}>EQUIPO</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn, { opacity: processing ? 0.5 : 1 }]}
                  activeOpacity={0.8}
                  onPress={handleSuspend}
                  disabled={processing}
                >
                  <Feather name="slash" size={18} color="#EF4444" />
                  <Text style={styles.rejectText}>SUSPENDER</Text>
                </TouchableOpacity>
              </View>
            )}

            {business.status === 'suspended' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn, { opacity: processing ? 0.5 : 1 }]}
                activeOpacity={0.8}
                onPress={handleReactivate}
                disabled={processing}
              >
                <Feather name="play" size={18} color="#fff" />
                <Text style={styles.approveText}>ACTIVAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* Modal de rechazo */}
      <GlassModal visible={rejectModal} onClose={() => setRejectModal(false)}>
        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rechazar solicitud</Text>
        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
          Puedes dejar un motivo opcional. La empresa verá que fue rechazada.
        </Text>
        <TextInput
          style={[
            styles.modalInput,
            { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
          ]}
          placeholder="Motivo del rechazo (opcional)"
          placeholderTextColor={colors.textSecondary}
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          numberOfLines={3}
        />
        <View style={appStyles.glassModalActions}>
          <TouchableOpacity
            style={[appStyles.glassModalBtn, { borderColor: colors.border }]}
            onPress={() => setRejectModal(false)}
          >
            <Text style={[appStyles.glassModalBtnText, { color: colors.textSecondary }]}>CANCELAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[appStyles.glassModalBtn, styles.rejectModalBtn]}
            onPress={handleReject}
            disabled={processing}
          >
            <Text style={[appStyles.glassModalBtnText, { color: '#fff' }]}>CONFIRMAR RECHAZO</Text>
          </TouchableOpacity>
        </View>
      </GlassModal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  logo: { width: 88, height: 88, borderRadius: 10, borderWidth: 2, borderColor: appColors.primary },
  logoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  infoCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
  },
  rejectBtn: { borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#EF444410' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  modalSubtitle: { fontSize: 13, letterSpacing: 0.3, lineHeight: 20 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rejectModalBtn: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  workerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  workerSpecialty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  workerEmail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  workerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workerStatusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Inter_600SemiBold',
  },
  agendaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  agendaBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Inter_700Bold',
  },
  agendaBannerSub: {
    fontSize: 12,
    letterSpacing: 0.3,
    fontFamily: 'Inter_400Regular',
  },
});
