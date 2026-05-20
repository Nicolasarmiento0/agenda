import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors } from '../../../../styles/appStyles';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type MemberRequest = {
  id: string;
  client_id: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: { nickname: string; avatar_url: string | null } | null;
};

type Member = {
  id: string;
  client_id: string;
  client_type: 'static' | 'dynamic';
  plan: 'basic' | 'premium' | 'vip';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  profiles: { nickname: string; avatar_url: string | null } | null;
};

const PLAN_LABELS: Record<string, string> = {
  basic: 'BÁSICO · 1 clase/sem',
  premium: 'PREMIUM · 3 clases/sem',
  vip: 'VIP · 5 clases/sem',
};

const TYPE_LABELS: Record<string, string> = {
  static: 'ESTÁTICO',
  dynamic: 'DINÁMICO',
};

// ─── Componente: Avatar simple ───────────────────────────────────────────────

function ClientAvatar({ name, avatarUrl, size = 44 }: { name: string; avatarUrl: string | null; size?: number }) {
  return avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: appColors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: appColors.primary, fontSize: size * 0.38, fontWeight: '700' }}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CompanyMembersScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isGym, setIsGym] = useState(false);

  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<'requests' | 'members'>('requests');

  // Modal de aprobación / edición
  const [selectedRequest, setSelectedRequest] = useState<MemberRequest | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'edit' | null>(null);
  const [chosenType, setChosenType] = useState<'static' | 'dynamic'>('dynamic');
  const [chosenPlan, setChosenPlan] = useState<'basic' | 'premium' | 'vip'>('basic');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    // 1. Buscar negocio del company
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, category_id')
      .eq('owner_id', profile.id)
      .eq('status', 'approved')
      .maybeSingle();

    if (!biz) { setLoading(false); setRefreshing(false); return; }
    setBusinessId(biz.id);

    // 2. Verificar si es gym
    const { data: cat } = await supabase
      .from('service_categories')
      .select('name')
      .eq('id', biz.category_id)
      .maybeSingle();
    const gymCategory = cat?.name?.toUpperCase().includes('GIMNASIO') || cat?.name?.toUpperCase().includes('FITNESS');
    setIsGym(!!gymCategory);

    // 3. Cargar solicitudes y miembros en paralelo
    const [reqRes, memRes] = await Promise.all([
      supabase
        .from('membership_requests')
        .select('id, client_id, message, status, created_at, profiles(nickname, avatar_url)')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('gym_memberships')
        .select('id, client_id, client_type, plan, status, created_at, profiles(nickname, avatar_url)')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false }),
    ]);

    setRequests((reqRes.data as unknown as MemberRequest[]) ?? []);
    setMembers((memRes.data as unknown as Member[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openApproveModal = (req: MemberRequest) => {
    setSelectedRequest(req);
    setChosenType('dynamic');
    setChosenPlan('basic');
    setModalType('approve');
  };

  const openEditModal = (mem: Member) => {
    setSelectedMember(mem);
    setChosenType(mem.client_type);
    setChosenPlan(mem.plan);
    setModalType('edit');
  };

  const handleReject = async (req: MemberRequest) => {
    const { error } = await supabase
      .from('membership_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) { showAlert({ title: 'Error', message: error.message }); return; }
    fetchData();
  };

  const handleApprove = async () => {
    if (!selectedRequest || !businessId) return;
    setSaving(true);
    // Upsert en gym_memberships
    const { error: memError } = await supabase.from('gym_memberships').upsert({
      business_id: businessId,
      client_id: selectedRequest.client_id,
      client_type: chosenType,
      plan: chosenPlan,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,client_id' });

    if (memError) { setSaving(false); showAlert({ title: 'Error', message: memError.message }); return; }

    // Actualizar solicitud a aprobado
    await supabase.from('membership_requests').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', selectedRequest.id);

    setSaving(false);
    setModalType(null);
    setSelectedRequest(null);
    fetchData();
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    const { error } = await supabase
      .from('gym_memberships')
      .update({ client_type: chosenType, plan: chosenPlan, updated_at: new Date().toISOString() })
      .eq('id', selectedMember.id);
    setSaving(false);
    if (error) { showAlert({ title: 'Error', message: error.message }); return; }
    setModalType(null);
    setSelectedMember(null);
    fetchData();
  };

  const handleSuspend = async (mem: Member) => {
    const newStatus = mem.status === 'active' ? 'suspended' : 'active';
    await supabase.from('gym_memberships').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', mem.id);
    fetchData();
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={appColors.primary} />
      </View>
    );
  }

  if (!isGym) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn}>
            <Feather name="menu" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>MIEMBROS</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Feather name="users" size={48} color={colors.border} />
          <Text style={[{ fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 16, textAlign: 'center' }]}>
            Esta función es exclusiva para negocios tipo Gimnasio.
          </Text>
        </View>
        <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>MIEMBROS</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.tab, tab === 'requests' && styles.tabActive]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, { color: tab === 'requests' ? appColors.primary : colors.textSecondary }]}>
            SOLICITUDES {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
          {tab === 'requests' && <View style={[styles.tabUnderline, { backgroundColor: appColors.primary }]} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'members' && styles.tabActive]} onPress={() => setTab('members')}>
          <Text style={[styles.tabText, { color: tab === 'members' ? appColors.primary : colors.textSecondary }]}>
            MIEMBROS ({members.length})
          </Text>
          {tab === 'members' && <View style={[styles.tabUnderline, { backgroundColor: appColors.primary }]} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appColors.primary} />}
      >
        {tab === 'requests' && (
          <>
            {requests.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={36} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin solicitudes pendientes</Text>
              </View>
            )}
            {requests.map(req => (
              <View key={req.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <ClientAvatar name={req.profiles?.nickname ?? '?'} avatarUrl={req.profiles?.avatar_url ?? null} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.textPrimary }]}>{req.profiles?.nickname ?? 'Cliente'}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                      {new Date(req.created_at).toLocaleDateString('es-CL')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: req.status === 'pending' ? '#FFF5E5' : req.status === 'approved' ? '#EEF8F0' : '#FDE8E8',
                  }]}>
                    <Text style={[styles.statusText, {
                      color: req.status === 'pending' ? '#A0660A' : req.status === 'approved' ? '#2E7D45' : '#C0392B',
                    }]}>
                      {req.status === 'pending' ? 'PENDIENTE' : req.status === 'approved' ? 'APROBADO' : 'RECHAZADO'}
                    </Text>
                  </View>
                </View>
                {req.message ? (
                  <Text style={[styles.cardMessage, { color: colors.textSecondary, borderColor: colors.border }]}>
                    "{req.message}"
                  </Text>
                ) : null}
                {req.status === 'pending' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#C0392B' }]}
                      onPress={() => handleReject(req)}
                    >
                      <Feather name="x" size={14} color="#C0392B" />
                      <Text style={[styles.actionBtnText, { color: '#C0392B' }]}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary, flex: 1 }]}
                      onPress={() => openApproveModal(req)}
                    >
                      <Feather name="check" size={14} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Aprobar y asignar plan</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'members' && (
          <>
            {members.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="users" size={36} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin miembros activos aún</Text>
              </View>
            )}
            {members.map(mem => (
              <View key={mem.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <ClientAvatar name={mem.profiles?.nickname ?? '?'} avatarUrl={mem.profiles?.avatar_url ?? null} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.textPrimary }]}>{mem.profiles?.nickname ?? 'Cliente'}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                      {TYPE_LABELS[mem.client_type]} · {PLAN_LABELS[mem.plan]}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {
                    backgroundColor: mem.status === 'active' ? '#EEF8F0' : '#F0F0F0',
                  }]}>
                    <Text style={[styles.statusText, { color: mem.status === 'active' ? '#2E7D45' : '#888' }]}>
                      {mem.status === 'active' ? 'ACTIVO' : mem.status === 'suspended' ? 'SUSPENDIDO' : 'INACTIVO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleSuspend(mem)}
                  >
                    <Feather name={mem.status === 'active' ? 'pause' : 'play'} size={14} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
                      {mem.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: appColors.primary, flex: 1 }]}
                    onPress={() => openEditModal(mem)}
                  >
                    <Feather name="edit-2" size={14} color={appColors.primary} />
                    <Text style={[styles.actionBtnText, { color: appColors.primary }]}>Editar plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Modal: Aprobar solicitud / Editar miembro ────────────── */}
      <Modal visible={modalType !== null} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setModalType(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <BlurView intensity={isDarkMode ? 60 : 80} tint={isDarkMode ? 'dark' : 'light'} style={{ borderRadius: 20, overflow: 'hidden' }}>
                <View style={[styles.modalContent, {
                  backgroundColor: isDarkMode ? 'rgba(15,15,20,0.88)' : 'rgba(255,255,255,0.92)',
                  borderColor: colors.border,
                }]}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {modalType === 'approve' ? 'Asignar membresía' : 'Editar membresía'}
                  </Text>
                  {modalType === 'approve' && selectedRequest && (
                    <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                      Cliente: {selectedRequest.profiles?.nickname ?? 'Cliente'}
                    </Text>
                  )}

                  {/* Tipo */}
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>TIPO DE CLIENTE</Text>
                  <View style={styles.optionRow}>
                    {(['dynamic', 'static'] as const).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.optionChip, {
                          backgroundColor: chosenType === t ? appColors.primary : colors.surface,
                          borderColor: chosenType === t ? appColors.primary : colors.border,
                        }]}
                        onPress={() => setChosenType(t)}
                      >
                        <Text style={[styles.optionChipText, { color: chosenType === t ? '#fff' : colors.textSecondary }]}>
                          {t === 'dynamic' ? 'DINÁMICO' : 'ESTÁTICO'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                    {chosenType === 'static'
                      ? 'Selecciona clases semanales los domingos dentro de la ventana horaria.'
                      : 'Puede reservar hasta 2h antes de cualquier clase disponible.'}
                  </Text>

                  {/* Plan */}
                  <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>PLAN</Text>
                  <View style={styles.optionCol}>
                    {(['basic', 'premium', 'vip'] as const).map(p => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.planChip, {
                          backgroundColor: chosenPlan === p ? appColors.primary + '18' : colors.surface,
                          borderColor: chosenPlan === p ? appColors.primary : colors.border,
                        }]}
                        onPress={() => setChosenPlan(p)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.planDot, { backgroundColor: chosenPlan === p ? appColors.primary : colors.border }]} />
                          <Text style={[styles.planChipText, { color: chosenPlan === p ? appColors.primary : colors.textPrimary }]}>
                            {p === 'basic' ? 'BÁSICO' : p === 'premium' ? 'PREMIUM' : 'VIP'}
                          </Text>
                        </View>
                        <Text style={[styles.planChipSub, { color: colors.textSecondary }]}>
                          {p === 'basic' ? '1 clase / semana' : p === 'premium' ? '3 clases / semana' : '5 clases / semana'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                    <TouchableOpacity
                      style={[styles.modalBtn, { borderColor: colors.border }]}
                      onPress={() => setModalType(null)}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary, flex: 1 }]}
                      onPress={modalType === 'approve' ? handleApprove : handleEditMember}
                      disabled={saving}
                    >
                      {saving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {modalType === 'approve' ? 'Confirmar' : 'Guardar cambios'}
                        </Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    borderRadius: 1,
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  cardMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  modalHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  optionCol: {
    gap: 8,
  },
  planChip: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  planDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planChipSub: {
    fontSize: 11,
    marginLeft: 20,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
