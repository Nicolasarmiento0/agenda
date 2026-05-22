import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppointmentFormModal from '../agenda/AppointmentFormModal';
import AppointmentSheet from '../agenda/AppointmentSheet';
import WorkerProfileModal from '../agenda/WorkerProfileModal';
import WorkerAvatar from '../WorkerAvatar';
import { Appointment } from '../../constants/appointments';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { getUnavailableBlocks } from '../../app/utils/helpers';
import { toLocalISOString } from '../agenda/agendaHelpers';
import { CalendarHeader } from './CalendarHeader';
import { CalendarSidebar } from './CalendarSidebar';
import { calendarTokens } from './calendarTokens';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendarPermissions } from './hooks/useCalendarPermissions';
import { useCalendarState } from './hooks/useCalendarState';
import { PressedSlotData, UnifiedCalendarProps } from './types';
import { DayView } from './views/DayView';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';

export function UnifiedCalendar({ role, businessId }: UnifiedCalendarProps) {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  // ─── State ──────────────────────────────────────────────────────────────────
  const state = useCalendarState();
  const {
    viewMode, setViewMode, selectedDate, setSelectedDate,
    selectedDateStr, weekDays, navigateBy, goToToday,
    sidebarVisible, setSidebarVisible,
    statsCollapsed, setStatsCollapsed,
    selectedWorkerFilter, setSelectedWorkerFilter,
    sheetVisible, setSheetVisible, formVisible, setFormVisible,
    selectedAppt, setSelectedAppt, editingAppt, setEditingAppt,
    prefillData, setPrefillData, isReschedulingRef,
    profileVisible, setProfileVisible, profileWorker, setProfileWorker,
    ghostSlot, setGhostSlot, pressedSlotRef,
  } = state;

  // ─── Data ───────────────────────────────────────────────────────────────────
  const data = useCalendarData(role, businessId, viewMode, selectedDate, selectedWorkerFilter);
  const {
    appointments, filteredAppointments, workers,
    startHour, endHour, hoursGrid, stats,
    refreshing, loading, onRefresh,
    selfWorkerId, gymData, rangeDays,
    activeBusiness, refetchAppts,
  } = data;

  // ─── Permissions ─────────────────────────────────────────────────────────────
  const gymMembershipActive = gymData?.gymMembership?.status === 'active';
  const isSuspended = activeBusiness?.status === 'suspended';
  const permissions = useCalendarPermissions(
    role,
    gymData?.isGym ?? false,
    gymMembershipActive,
    isSuspended,
  );

  // ─── Gym membership ref (evita re-renders en closure) ────────────────────────
  const gymMembershipRef = useRef(gymData?.gymMembership);
  gymMembershipRef.current = gymData?.gymMembership;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const openSheet = useCallback((appt: Appointment) => {
    if (appt.service === 'BLOQUEO') return;
    setSelectedAppt(appt);
    setSheetVisible(true);
  }, [setSelectedAppt, setSheetVisible]);

  const handleSlotPress = useCallback((slotData: PressedSlotData) => {
    if (!permissions.canCreate) return;

    // Client gym check
    if (gymData?.isGym && gymMembershipRef.current?.status === 'suspended') {
      showAlert({ title: 'Membresía Suspendida', message: 'No puedes agendar mientras tu membresía esté suspendida.' });
      return;
    }

    const clientName = role === 'client' ? ((profile as any)?.nickname || '') : '';

    setPrefillData({
      id: '',
      clientName,
      service: '',
      worker_id: slotData.workerId,
      worker: slotData.workerName,
      workerColor: slotData.workerColor,
      startHour: slotData.hour,
      durationHours: role === 'client' ? 1 : 0.5,
      status: 'pending',
      date: toLocalISOString(slotData.date),
    });
    setEditingAppt(undefined);
    setFormVisible(true);
  }, [permissions.canCreate, gymData?.isGym, role, profile, setPrefillData, setEditingAppt, setFormVisible, showAlert]);

  const handleSheetAction = useCallback(async (actionId: string, appt: Appointment) => {
    if (actionId === 'edit') {
      setEditingAppt(appt);
      isReschedulingRef.current = false;
      setSheetVisible(false);
      setFormVisible(true);
      return;
    }
    if (actionId === 'rescheduled') {
      setEditingAppt(appt);
      isReschedulingRef.current = true;
      setSheetVisible(false);
      setFormVisible(true);
      return;
    }
    if (actionId === 'cancel') {
      if (permissions.canCancelOwn && appt.date) {
        const [y, m, d] = appt.date.split('-').map(Number);
        const startH = Math.floor(appt.startHour);
        const startM = Math.round((appt.startHour % 1) * 60);
        const apptTime = new Date(y, m - 1, d, startH, startM);
        if ((apptTime.getTime() - Date.now()) / (1000 * 60 * 60) <= 2) {
          showAlert({ title: 'No puedes cancelar', message: 'Solo puedes cancelar con al menos 2 horas de anticipación.' });
          return;
        }
      }
    }
    const STATUS_MAP: Record<string, string> = {
      confirm: 'confirmed', complete: 'completed', 'no-show': 'no-show', cancel: 'cancelled',
    };
    const newStatus = STATUS_MAP[actionId];
    if (!newStatus) return;
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appt.id);
    if (error) showAlert({ title: 'Error', message: error.message });
    else refetchAppts();
  }, [permissions.canCancelOwn, isReschedulingRef, setEditingAppt, setSheetVisible, setFormVisible, showAlert, refetchAppts]);

  const handleDragDrop = useCallback(async (
    apptId: string,
    newHour: number,
    workerId: string,
    date: string,
  ) => {
    const { error } = await supabase
      .from('appointments')
      .update({ start_hour: newHour, worker_id: workerId, date })
      .eq('id', apptId);
    if (error) {
      showAlert({ title: 'Error al reagendar', message: error.message });
    }
    await refetchAppts();
  }, [showAlert, refetchAppts]);

  const editingApptRef = useRef(editingAppt);
  editingApptRef.current = editingAppt;

  const handleSaveAppt = useCallback(async (formData: Partial<Appointment>): Promise<boolean> => {
    const effectiveBusiness = activeBusiness;
    if (!effectiveBusiness?.id) {
      showAlert({ title: 'Error', message: 'No se encontró el negocio.' });
      return false;
    }

    const currentEditing = editingApptRef.current;
    const dateStr = formData.date || selectedDateStr;
    const newStart = formData.startHour ?? 9;
    const newEnd = newStart + (formData.durationHours ?? 0.5);

    // Collision check
    let query = supabase
      .from('appointments')
      .select('id, start_hour, duration_hours')
      .eq('business_id', effectiveBusiness.id)
      .eq('worker_id', formData.worker_id)
      .eq('date', dateStr)
      .in('status', ['confirmed', 'pending', 'rescheduled']);
    if (currentEditing) query = query.neq('id', currentEditing.id);

    const { data: existing, error: fetchError } = await query;
    if (fetchError) {
      showAlert({ title: 'Error', message: `No se pudo validar el horario: ${fetchError.message}` });
      return false;
    }
    if (existing?.some((a: any) => newStart < Number(a.start_hour) + Number(a.duration_hours) && newEnd > Number(a.start_hour))) {
      showAlert({ title: 'Horario no disponible', message: 'Ya existe una cita en ese horario. Por favor elige otro.' });
      return false;
    }

    // Unavailable blocks check
    const targetWorker = workers.find(w => w.id === formData.worker_id);
    if (targetWorker) {
      const apptDate = new Date(dateStr + 'T00:00:00');
      const unavBlocks = getUnavailableBlocks(apptDate, effectiveBusiness, targetWorker, startHour, endHour);
      if (unavBlocks.some(b => newStart < b.start + b.duration && newEnd > b.start)) {
        showAlert({ title: 'Horario no disponible', message: 'El horario se cruza con un cierre o bloqueo.' });
        return false;
      }
    }

    // Gym plan limit (client only)
    if (role === 'client' && gymData?.isGym && gymMembershipRef.current?.status === 'active' && profile?.id && formData.service === 'CLASE') {
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', effectiveBusiness.id)
        .eq('client_id', profile.id)
        .gte('date', toLocalISOString(rangeDays[0]))
        .lte('date', toLocalISOString(rangeDays[Math.min(6, rangeDays.length - 1)]))
        .in('status', ['confirmed', 'pending']);
      const PLAN_LIMITS: Record<string, number> = { basic: 1, premium: 3, vip: 5 };
      const limit = PLAN_LIMITS[(gymMembershipRef.current as any)?.plan] ?? 1;
      if ((count ?? 0) >= limit) {
        showAlert({ title: 'Límite de plan', message: `Tu plan permite ${limit} clase${limit > 1 ? 's' : ''} por semana.` });
        return false;
      }
    }

    const apptData: Record<string, any> = {
      business_id: effectiveBusiness.id,
      worker_id: formData.worker_id,
      service: formData.service || 'Servicio',
      price: formData.price || 0,
      date: dateStr,
      start_hour: newStart,
      duration_hours: formData.durationHours || 0.5,
      notes: formData.notes ?? null,
    };

    if (role === 'client') {
      apptData.client_id = profile?.id;
      apptData.client_name = (profile as any)?.nickname || 'Cliente';
      apptData.status = 'pending';
    } else {
      apptData.client_name = formData.clientName || 'Sin nombre';
      apptData.status = currentEditing
        ? (isReschedulingRef.current ? 'rescheduled' : currentEditing.status)
        : 'pending';
    }

    const { error } = currentEditing
      ? await supabase.from('appointments').update(apptData).eq('id', currentEditing.id)
      : await supabase.from('appointments').insert([apptData]);

    if (error) { showAlert({ title: 'Error', message: error.message }); return false; }

    isReschedulingRef.current = false;
    await refetchAppts();
    return true;
  }, [
    activeBusiness, selectedDateStr, workers, startHour, endHour,
    role, gymData?.isGym, profile, rangeDays, isReschedulingRef, refetchAppts, showAlert,
  ]);

  // ─── Effective business ID para AppointmentFormModal ─────────────────────────
  const effectiveBusinessId = activeBusiness?.id ?? '';

  // ─── Stats row ───────────────────────────────────────────────────────────────
  const StatsRow = useMemo(() => {
    if (!permissions.showStatsRow || viewMode === 'month') return null;
    return (
      <View>
        <TouchableOpacity
          onPress={() => setStatsCollapsed(!statsCollapsed)}
          accessibilityRole="button"
          accessibilityLabel={statsCollapsed ? 'Mostrar estadísticas' : 'Ocultar estadísticas'}
          style={styles.statsToggle}
        >
          <Feather name={statsCollapsed ? 'chevron-down' : 'chevron-up'} size={12} color={colors.textSecondary} />
        </TouchableOpacity>
        {!statsCollapsed && (
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <BlurView
                key={i}
                intensity={isDarkMode ? 40 : 60}
                tint={isDarkMode ? 'dark' : 'light'}
                style={[styles.statCard, i === 0 && { borderColor: `${colors.primary}44` }]}
              >
                <Text style={[styles.statValue, { color: i === 0 ? colors.primary : colors.textPrimary }]}>
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </BlurView>
            ))}
          </View>
        )}
      </View>
    );
  }, [permissions.showStatsRow, viewMode, statsCollapsed, stats, colors, isDarkMode, setStatsCollapsed]);

  // ─── Worker filter chips ──────────────────────────────────────────────────────
  const WorkerFilter = useMemo(() => {
    if (!permissions.showWorkerFilter || workers.length <= 1 || viewMode === 'month') return null;
    const chipBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const activeBg = colors.primary;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScrollView}
      >
        <TouchableOpacity
          onPress={() => setSelectedWorkerFilter(null)}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Ver todos los trabajadores"
          style={[
            styles.filterChip,
            { backgroundColor: !selectedWorkerFilter ? activeBg : chipBg },
          ]}
        >
          <Text style={[styles.filterChipText, { color: !selectedWorkerFilter ? '#111827' : colors.textSecondary }]}>
            Todos
          </Text>
        </TouchableOpacity>
        {workers.map(w => (
          <TouchableOpacity
            key={w.id}
            onPress={() => setSelectedWorkerFilter(w.id === selectedWorkerFilter ? null : w.id)}
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${w.name}`}
            style={[
              styles.filterChip,
              { backgroundColor: selectedWorkerFilter === w.id ? activeBg : chipBg },
            ]}
          >
            <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={16} showDot={false} />
            <Text style={[styles.filterChipText, { color: selectedWorkerFilter === w.id ? '#111827' : colors.textPrimary }]}>
              {w.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }, [permissions.showWorkerFilter, workers, viewMode, selectedWorkerFilter, colors, isDarkMode, setSelectedWorkerFilter]);

  // ─── FAB / CTA ────────────────────────────────────────────────────────────────
  const Fab = useMemo(() => {
    if (isSuspended) {
      return (
        <View style={[styles.suspendedBadge, { backgroundColor: 'rgba(208,0,36,0.15)', borderColor: 'rgba(208,0,36,0.3)' }]}>
          <Feather name="alert-circle" size={14} color="#D00024" />
          <Text style={[styles.suspendedText, { color: '#D00024' }]}>Negocio suspendido</Text>
        </View>
      );
    }
    if (gymData?.isGym && !gymData.gymMembership && !gymData.gymMembershipLoading) {
      return (
        <TouchableOpacity
          onPress={() => showAlert({ title: 'Sin membresía', message: 'Solicita tu membresía para agendar clases.' })}
          style={[styles.fabOutline, { borderColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Solicitar membresía"
        >
          <Text style={[styles.fabOutlineText, { color: colors.primary }]}>Solicitar membresía</Text>
        </TouchableOpacity>
      );
    }
    if (gymData?.isGym && gymData.membershipRequest?.status === 'pending') {
      return (
        <View style={[styles.fabOutline, { borderColor: colors.textSecondary, opacity: 0.7 }]}>
          <Text style={[styles.fabOutlineText, { color: colors.textSecondary }]}>Solicitud pendiente…</Text>
        </View>
      );
    }
    if (!permissions.canCreate) return null;
    return (
      <TouchableOpacity
        onPress={() => {
          const defaultWorker = workers[0];
          if (!defaultWorker) return;
          handleSlotPress({ hour: 10, workerId: defaultWorker.id, workerName: defaultWorker.name, workerColor: defaultWorker.color, date: selectedDate });
        }}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Nueva cita"
      >
        <Feather name="plus" size={24} color="#111827" />
      </TouchableOpacity>
    );
  }, [isSuspended, gymData, permissions.canCreate, colors, workers, selectedDate, handleSlotPress, showAlert]);

  // ─── Gym banner (client + isGym) ─────────────────────────────────────────────
  const GymBanner = useMemo(() => {
    if (!gymData?.isGym || !gymData.gymMembership) return null;
    const mem = gymData.gymMembership;
    if (mem.status !== 'active') return null;
    const planLimits: Record<string, number> = { basic: 1, premium: 3, vip: 5 };
    const limit = planLimits[(mem as any).plan] ?? 0;
    const used = gymData.weeklyClassesUsed;
    const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
    const planLabel = (mem as any).plan?.toUpperCase?.() || 'PLAN';
    const bg = isDarkMode ? 'rgba(180,247,54,0.08)' : 'rgba(80,180,0,0.06)';

    return (
      <View style={[styles.gymBanner, { backgroundColor: bg, borderColor: `${colors.primary}30` }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.gymBannerTitle, { color: colors.primary }]}>
            {planLabel} · {used}/{limit} clases
          </Text>
          <View style={[styles.gymProgressTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }]}>
            <View style={[styles.gymProgressFill, { width: `${pct * 100}%`, backgroundColor: pct < 1 ? colors.primary : '#D00024' }]} />
          </View>
        </View>
      </View>
    );
  }, [gymData, colors, isDarkMode]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <CalendarHeader
        viewMode={viewMode}
        selectedDate={selectedDate}
        isDarkMode={isDarkMode}
        colors={colors}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onChangeViewMode={setViewMode}
        onNavigate={navigateBy}
        onToday={goToToday}
        onToggleTheme={toggleTheme}
      />

      {GymBanner}

      {WorkerFilter}

      {StatsRow}

      {viewMode === 'day' && (
        <DayView
          date={selectedDate}
          workers={workers}
          appointments={filteredAppointments}
          hoursGrid={hoursGrid}
          startHour={startHour}
          endHour={endHour}
          ghostSlot={ghostSlot}
          pressedSlotRef={pressedSlotRef}
          business={activeBusiness}
          permissions={permissions}
          selectedWorkerFilter={selectedWorkerFilter}
          isDarkMode={isDarkMode}
          colors={colors}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onGhostSlotChange={setGhostSlot}
          onSlotPress={handleSlotPress}
          onAppointmentPress={openSheet}
          onWorkerHeaderPress={
            permissions.showWorkerProfileModal
              ? (w) => { setProfileWorker(w); setProfileVisible(true); }
              : undefined
          }
          onDrop={handleDragDrop}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          workers={workers}
          appointments={filteredAppointments}
          hoursGrid={hoursGrid}
          startHour={startHour}
          endHour={endHour}
          ghostSlot={ghostSlot}
          pressedSlotRef={pressedSlotRef}
          business={activeBusiness}
          permissions={permissions}
          selectedWorkerFilter={selectedWorkerFilter}
          isDarkMode={isDarkMode}
          colors={colors}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onGhostSlotChange={setGhostSlot}
          onSlotPress={handleSlotPress}
          onAppointmentPress={openSheet}
          onDayHeaderPress={(d) => { setSelectedDate(d); setViewMode('day'); }}
          onDrop={handleDragDrop}
        />
      )}

      {viewMode === 'month' && (
        <MonthView
          gridDays={rangeDays}
          selectedMonth={selectedDate.getMonth()}
          selectedYear={selectedDate.getFullYear()}
          appointments={appointments}
          isDarkMode={isDarkMode}
          colors={colors}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onDayPress={(d) => { setSelectedDate(d); setViewMode('day'); }}
        />
      )}

      {/* FAB */}
      <View
        style={[styles.fabContainer, { bottom: Math.max(insets.bottom, 16) + 16 }]}
        pointerEvents="box-none"
      >
        {Fab}
      </View>

      {/* Sidebar */}
      <CalendarSidebar
        visible={sidebarVisible}
        selectedDate={selectedDate}
        appointments={appointments}
        isDarkMode={isDarkMode}
        colors={colors}
        onClose={() => setSidebarVisible(false)}
        onSelectDate={(d) => { setSelectedDate(d); setViewMode('day'); setSidebarVisible(false); }}
        onNavigateMonth={navigateBy}
      />

      {/* AppointmentSheet */}
      <AppointmentSheet
        appt={selectedAppt}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        isGym={gymData?.isGym ?? false}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* AppointmentFormModal */}
      <AppointmentFormModal
        visible={formVisible}
        role={role}
        initialData={editingAppt ?? prefillData}
        workers={workers}
        onSave={handleSaveAppt}
        onClose={() => { setFormVisible(false); setEditingAppt(undefined); setPrefillData(undefined); }}
        businessId={effectiveBusinessId}
        colors={colors}
        allowBlocking={permissions.canBlockTime}
        selectedDateStr={selectedDateStr}
        openingHour={startHour}
        closingHour={endHour}
        showAlert={showAlert}
      />

      {/* WorkerProfileModal — company only */}
      {permissions.showWorkerProfileModal && (
        <WorkerProfileModal
          worker={profileWorker}
          visible={profileVisible}
          appointments={appointments}
          selectedDate={selectedDate}
          selectedWorkerFilter={
            profileWorker ? workers.find(w => w.id === selectedWorkerFilter)?.name ?? null : null
          }
          onClose={() => setProfileVisible(false)}
          onFilterToggle={(name) => {
            const w = workers.find(w => w.name === name);
            setSelectedWorkerFilter(w?.id === selectedWorkerFilter ? null : (w?.id ?? null));
            setProfileVisible(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  statsToggle: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    minWidth: 80,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterScrollView: {
    flexShrink: 0,
    flexGrow: 0,
    height: 48,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
    minHeight: 32,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'flex-end',
    gap: 8,
  },
  fab: {
    width: calendarTokens.fabSize,
    height: calendarTokens.fabSize,
    borderRadius: calendarTokens.fabRadius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabOutline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  fabOutlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    margin: 12,
  },
  suspendedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gymBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  gymBannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  gymProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gymProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
