import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { appColors } from '../../../styles/appStyles';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type InboxItem = {
  id: string;
  type: 'appointment_pending' | 'appointment_confirmed' | 'appointment_completed' | 'appointment_rescheduled' | 'appointment_noshow' | 'appointment_cancelled' | 'business_pending' | 'membership_request' | 'membership_approved' | 'membership_rejected';
  title: string;
  subtitle: string;
  date: string;
  actionLabel?: string;
  onAction?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

const TYPE_ICON: Record<string, { name: string; color: string }> = {
  appointment_pending: { name: 'calendar', color: '#B4F736' },
  appointment_confirmed: { name: 'check-circle', color: '#3D9E5A' },
  appointment_completed: { name: 'check-square', color: '#5C90D2' },
  appointment_rescheduled: { name: 'clock', color: '#F39C12' },
  appointment_noshow: { name: 'user-x', color: '#D00024' },
  appointment_cancelled: { name: 'x-circle', color: '#888888' },
  business_pending: { name: 'briefcase', color: '#3B7BE0' },
  membership_request: { name: 'user-plus', color: appColors.primary },
  membership_approved: { name: 'check-circle', color: '#3D9E5A' },
  membership_rejected: { name: 'x-circle', color: '#C0392B' },
};

// ─── Componente: Item ─────────────────────────────────────────────────────────

function InboxCard({
  item,
  colors,
  isDarkMode,
}: {
  item: InboxItem;
  colors: any;
  isDarkMode: boolean;
}) {
  const icon = TYPE_ICON[item.type] ?? { name: 'bell', color: appColors.primary };

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: icon.color + '18' }]}>
        <Feather name={icon.name as any} size={20} color={icon.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{timeAgo(item.date)}</Text>
      </View>
      {item.actionLabel && item.onAction && (
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: appColors.primary }]}
          onPress={item.onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionChipText}>{item.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { showAlert } = useAlert();

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);

  const fetchInbox = useCallback(async () => {
    if (!profile?.id || !profile?.role) return;
    const role = profile.role;
    const newItems: InboxItem[] = [];

    // ── ADMIN: negocios pendientes de aprobación ──────────────────
    if (role === 'admin') {
      const { data: bizPending } = await supabase
        .from('businesses')
        .select('id, name, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      (bizPending ?? []).forEach(b => {
        newItems.push({
          id: `biz-${b.id}`,
          type: 'business_pending',
          title: `Nuevo negocio pendiente`,
          subtitle: b.name,
          date: b.created_at,
          actionLabel: 'Revisar',
          onAction: () => router.push('/screens/roles/admin/admin-businesses' as any),
        });
      });
    }

    // ── COMPANY: citas pendientes de confirmación ──────────────────
    if (role === 'company') {
      // Obtener el negocio del company
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', profile.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (biz) {
        const [apptRes, memReqRes] = await Promise.all([
          supabase
            .from('appointments')
            .select('id, client_name, service, date, created_at')
            .eq('business_id', biz.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('membership_requests')
            .select('id, client_id, created_at, profiles(nickname)')
            .eq('business_id', biz.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ]);

        (apptRes.data ?? []).forEach((a: any) => {
          newItems.push({
            id: `appt-${a.id}`,
            type: 'appointment_pending',
            title: `Nueva cita: ${a.service}`,
            subtitle: `${a.client_name} · ${a.date}`,
            date: a.created_at,
            actionLabel: 'Ver agenda',
            onAction: () => router.push('/screens/roles/company/company-agenda' as any),
          });
        });

        (memReqRes.data as any[] ?? []).forEach((r: any) => {
          const nickname = r.profiles?.nickname ?? 'Cliente';
          newItems.push({
            id: `mem-${r.id}`,
            type: 'membership_request',
            title: `Solicitud de membresía`,
            subtitle: nickname,
            date: r.created_at,
            actionLabel: 'Gestionar',
            onAction: () => router.push('/screens/roles/company/company-members' as any),
          });
        });
      }
    }

    // ── WORKER: citas pendientes asignadas ────────────────────────
    if (role === 'worker') {
      const { data: worker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (worker) {
        const { data: appts } = await supabase
          .from('appointments')
          .select('id, client_name, service, date, created_at')
          .eq('worker_id', worker.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50);

        (appts ?? []).forEach((a: any) => {
          newItems.push({
            id: `appt-${a.id}`,
            type: 'appointment_pending',
            title: `Cita pendiente: ${a.service}`,
            subtitle: `${a.client_name} · ${a.date}`,
            date: a.created_at,
          });
        });
      }
    }

    // ── CLIENT: resoluciones de citas + estado membresía ──────────
    if (role === 'client') {
      const [apptRes, memRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, service, date, status, created_at, updated_at, businesses(name)')
          .eq('client_id', profile.id)
          .in('status', ['confirmed', 'completed', 'rescheduled', 'no-show', 'cancelled'])
          .order('updated_at', { ascending: false })
          .limit(40),
        supabase
          .from('membership_requests')
          .select('id, status, created_at, businesses(name)')
          .eq('client_id', profile.id)
          .in('status', ['approved', 'rejected'])
          .order('updated_at', { ascending: false })
          .limit(20),
      ]);

      const STATUS_TYPE: Record<string, InboxItem['type']> = {
        confirmed: 'appointment_confirmed',
        completed: 'appointment_completed',
        rescheduled: 'appointment_rescheduled',
        'no-show': 'appointment_noshow',
        cancelled: 'appointment_cancelled',
      };
      const STATUS_LABEL: Record<string, string> = {
        confirmed: '✓ Confirmada',
        completed: '✓ Completada',
        rescheduled: '↩ Reprogramada',
        'no-show': '✕ No se presentó',
        cancelled: '✕ Cancelada',
      };

      (apptRes.data as any[] ?? []).forEach((a: any) => {
        const bizName = a.businesses?.name ?? 'Negocio';
        newItems.push({
          id: `appt-${a.id}`,
          type: STATUS_TYPE[a.status] ?? 'appointment_pending',
          title: `${STATUS_LABEL[a.status] ?? a.status}: ${a.service}`,
          subtitle: `${bizName} · ${a.date}`,
          date: a.updated_at ?? a.created_at,
        });
      });

      (memRes.data as any[] ?? []).forEach((r: any) => {
        const bizName = r.businesses?.name ?? 'Gimnasio';
        newItems.push({
          id: `mem-${r.id}`,
          type: r.status === 'approved' ? 'membership_approved' : 'membership_rejected',
          title: r.status === 'approved' ? '¡Membresía aprobada!' : 'Membresía rechazada',
          subtitle: bizName,
          date: r.created_at,
        });
      });
    }

    // Ordenar por fecha descendente
    newItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(newItems);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, profile?.role]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchInbox(); }, [fetchInbox]));

  const onRefresh = () => { setRefreshing(true); fetchInbox(); };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>BANDEJA DE ENTRADA</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={appColors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appColors.primary} />}
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Feather name="bell" size={40} color={colors.border} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Todo al día</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No tienes notificaciones pendientes.</Text>
            </View>
          ) : (
            items.map(item => (
              <InboxCard key={item.id} item={item} colors={colors} isDarkMode={isDarkMode} />
            ))
          )}
        </ScrollView>
      )}

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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  cardSub: {
    fontSize: 12,
  },
  cardTime: {
    fontSize: 11,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  actionChipText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: 'Inter_700Bold',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
});
