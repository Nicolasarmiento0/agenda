import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

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
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  suspended: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDIENTE',
  approved: 'APROBADA',
  rejected: 'RECHAZADA',
  suspended: 'SUSPENDIDA',
};

export default function AdminBusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id, name, status, description, address, phone, logo_url, created_at,
        category:service_categories(name),
        owner:profiles!businesses_owner_id_fkey(id, nickname)
      `)
      .eq('id', id)
      .single();

    if (!error && data) {
      setBusiness(data as any);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
    setLoading(false);
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
            setProcessing(true);
            const { error } = await supabase
              .from('businesses')
              .update({ status: 'approved' })
              .eq('id', id);
            setProcessing(false);
            if (error) {
              showAlert({ title: 'Error', message: 'No se pudo aprobar. Inténtalo de nuevo.' });
            } else {
              setBusiness((prev) => prev ? { ...prev, status: 'approved' } : prev);
              showAlert({ 
                title: '✓ Empresa aprobada', 
                message: 'La empresa puede operar ahora.', 
                buttons: [{ text: 'OK', onPress: () => router.back() }]
              });
            }
          },
        },
      ]
    });
  };

  const handleReject = async () => {
    setProcessing(true);
    const { error } = await supabase
      .from('businesses')
      .update({ status: 'rejected' })
      .eq('id', id);
    setProcessing(false);
    setRejectModal(false);

    if (error) {
      showAlert({ title: 'Error', message: 'No se pudo rechazar. Inténtalo de nuevo.' });
    } else {
      setBusiness((prev) => prev ? { ...prev, status: 'rejected' } : prev);
      showAlert({ 
        title: 'Solicitud rechazada', 
        message: 'La empresa fue notificada.', 
        buttons: [{ text: 'OK', onPress: () => router.back() }]
      });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ width: 40 }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>DETALLE DE EMPRESA</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      ) : !business ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>No encontrado</Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

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
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[business.status]}20`, borderColor: STATUS_COLORS[business.status] }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[business.status] }]}>
                  {STATUS_LABELS[business.status]}
                </Text>
              </View>
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

          </ScrollView>

          {/* Botones de acción — solo si está pendiente */}
          {business.status === 'pending' && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn, { opacity: processing ? 0.5 : 1 }]}
                activeOpacity={0.8}
                onPress={() => setRejectModal(true)}
                disabled={processing}
              >
                {processing ? <ActivityIndicator size="small" color="#EF4444" /> : (
                  <>
                    <Feather name="x" size={18} color="#EF4444" />
                    <Text style={styles.rejectText}>RECHAZAR</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn, { opacity: processing ? 0.5 : 1 }]}
                activeOpacity={0.8}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="check" size={18} color="#fff" />
                    <Text style={styles.approveText}>APROBAR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}

      {/* Modal de rechazo con motivo opcional */}
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rechazar solicitud</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Puedes dejar un motivo opcional. La empresa verá que fue rechazada.
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Motivo del rechazo (opcional)"
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setRejectModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRejectBtn]}
                onPress={handleReject}
                disabled={processing}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>CONFIRMAR RECHAZO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  logo: { width: 88, height: 88, borderRadius: 10, borderWidth: 2, borderColor: appColors.primary },
  logoPlaceholder: { width: 88, height: 88, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  businessName: { fontSize: 22, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  statusBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  infoCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  infoLabel: { fontSize: 10, letterSpacing: 2, flexShrink: 0 },
  infoValue: { fontSize: 14, letterSpacing: 0.3, flex: 1, textAlign: 'right' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, paddingBottom: 24, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 6 },
  rejectBtn: { borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: '#EF444410' },
  approveBtn: { backgroundColor: '#10B981' },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  modalSubtitle: { fontSize: 13, letterSpacing: 0.3, lineHeight: 20 },
  modalInput: { borderWidth: 1, borderRadius: 6, padding: 14, fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  modalRejectBtn: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  modalBtnText: { fontSize: 11, letterSpacing: 2, fontWeight: '700' },
});