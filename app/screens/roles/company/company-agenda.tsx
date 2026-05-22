import { Feather } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import WorkerAvatar from '../../../../components/WorkerAvatar';
import AppointmentCard from '../../../../components/agenda/AppointmentCard';
import AppointmentFormModal from '../../../../components/agenda/AppointmentFormModal';
import AppointmentSheet from '../../../../components/agenda/AppointmentSheet';
import WorkerProfileModal from '../../../../components/agenda/WorkerProfileModal';
import {
  formatDateLabel,
  getWeekDays,
  isToday,
  nowLinePosition,
  shortDayName,
  toLocalISOString,
} from '../../../../components/agenda/agendaHelpers';
import '../../../../components/agenda/calendarLocale';
import {
  Appointment,
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
} from '../../../../constants/appointments';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useAgendaAppointments } from '../../../../hooks/useAgendaAppointments';
import { useIsGym } from '../../../../hooks/useIsGym';
import { useWorkers } from '../../../../hooks/useWorkers';
import { supabase } from '../../../../lib/supabase';
import { appColors, glassColors } from '../../../../styles/appStyles';
import { getUnavailableBlocks } from '../../../utils/helpers';

type ViewMode = 'day' | 'week';

const LABEL_WIDTH = 46;
const PADDING = 16;

export default function CompanyAgendaScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { width: SCREEN_WIDTH } = useMemo(() => ({ width: require('react-native').Dimensions.get('window').width }), []);

  const isGym = useIsGym();
  const { workers, refetch: refetchWorkers } = useWorkers(business?.id);

  // Horas dinámicas del negocio
  const startHour = useMemo(() => {
    if (!business?.opening_time) return DEFAULT_START_HOUR;
    return parseInt(business.opening_time.split(':')[0], 10);
  }, [business?.opening_time]);

  const endHour = useMemo(() => {
    if (!business?.closing_time) return DEFAULT_END_HOUR;
    const h = parseInt(business.closing_time.split(':')[0], 10);
    const m = parseInt(business.closing_time.split(':')[1], 10);
    return m > 0 ? h + 1 : h;
  }, [business?.closing_time]);

  const hoursGrid = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>();
  const [prefillData, setPrefillData] = useState<Appointment | undefined>();
  const isReschedulingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [profileWorker, setProfileWorker] = useState<(typeof workers)[0] | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const selectedDateStr = useMemo(() => toLocalISOString(selectedDate), [selectedDate]);

  const { appointments, refetch: refetchAppts } = useAgendaAppointments(business?.id, weekDays);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWorkers(), refetchAppts()]);
    setRefreshing(false);
  }, [refetchWorkers, refetchAppts]);

  const nowPosition = useMemo(() => nowLinePosition(startHour, endHour), [startHour, endHour]);

  const filteredAppointments = useMemo(() => {
    if (!selectedWorkerFilter) return appointments;
    return appointments.filter(a => a.worker === selectedWorkerFilter);
  }, [appointments, selectedWorkerFilter]);

  const stats = useMemo(() => {
    const todayApps = filteredAppointments.filter(a => a.date === selectedDateStr);
    return [
      { label: 'CITAS HOY', value: String(todayApps.length) },
      { label: 'PENDIENTES', value: String(todayApps.filter(a => a.status === 'pending').length) },
      { label: 'HECHAS', value: String(todayApps.filter(a => a.status === 'completed').length) },
    ];
  }, [filteredAppointments, selectedDateStr]);

  const openSheet = useCallback((appt: Appointment) => {
    setSelectedAppt(appt);
    setSheetVisible(true);
  }, []);

  const handleGridPress = (evt: any, workerId: string, workerName: string, workerColor: string, d: Date) => {
    const y = evt.nativeEvent.locationY;
    const clickedHourDecimal = startHour + (y / HOUR_HEIGHT);
    const startH = Math.floor(clickedHourDecimal * 2) / 2;

    setPrefillData({
      id: '',
      clientName: '',
      service: '',
      worker_id: workerId,
      worker: workerName,
      workerColor: workerColor,
      startHour: startH,
      durationHours: 0.5,
      status: 'pending',
      date: toLocalISOString(d),
    });
    setEditingAppt(undefined);
    setFormVisible(true);
  };

  const handleSheetAction = useCallback(async (actionId: string, appt: Appointment) => {
    const STATUS_MAP: Record<string, string> = {
      confirm: 'confirmed',
      complete: 'completed',
      'no-show': 'no-show',
      cancel: 'cancelled',
    };
    if (actionId === 'rescheduled' || actionId === 'edit') {
      isReschedulingRef.current = actionId === 'rescheduled';
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
      return;
    }
    const newStatus = STATUS_MAP[actionId];
    if (!newStatus) return;
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appt.id);
    if (error) showAlert({ title: 'Error', message: error.message });
    else refetchAppts();
  }, [refetchAppts, showAlert]);

  const handleSaveAppt = useCallback(async (data: Partial<Appointment>): Promise<boolean> => {
    try {
      if (!business?.id) {
        showAlert({ title: 'Error', message: 'No se ha seleccionado ningún negocio.' });
        return false;
      }
      const dateStr = data.date || selectedDateStr;
      const newStart = data.startHour ?? 9;
      const newEnd = newStart + (data.durationHours ?? 0.5);

      let query = supabase
        .from('appointments')
        .select('id, start_hour, duration_hours')
        .eq('business_id', business.id)
        .eq('worker_id', data.worker_id)
        .eq('date', dateStr)
        .in('status', ['confirmed', 'pending', 'rescheduled']);

      if (editingAppt) query = query.neq('id', editingAppt.id);

      const { data: existing, error: fetchError } = await query;
      if (fetchError) {
        showAlert({ title: 'Error', message: `No se pudo validar el horario: ${fetchError.message}` });
        return false;
      }

      const hasCollision = existing?.some((a: { start_hour: number; duration_hours: number }) => {
        const eStart = Number(a.start_hour);
        return newStart < eStart + Number(a.duration_hours) && newEnd > eStart;
      });

      if (hasCollision) {
        showAlert({ title: 'Horario no disponible', message: 'El trabajador ya tiene una cita en este horario que se superpone.' });
        return false;
      }

      const targetWorker = workers.find(w => w.id === data.worker_id);
      if (targetWorker) {
        const apptDate = new Date(dateStr + 'T00:00:00');
        const unavBlocks = getUnavailableBlocks(apptDate, business, targetWorker, startHour, endHour);
        const intersectsUnav = unavBlocks.some(b => {
          const bEnd = b.start + b.duration;
          return newStart < bEnd && newEnd > b.start;
        });
        if (intersectsUnav) {
          showAlert({
            title: 'Horario no disponible',
            message: 'El horario seleccionado se cruza con un horario de cierre o bloqueo del trabajador.'
          });
          return false;
        }
      }

      const apptData = {
        business_id: business.id,
        worker_id: data.worker_id,
        client_name: data.clientName || 'Sin nombre',
        service: data.service || 'Servicio',
        price: data.price || 0,
        date: dateStr,
        start_hour: newStart,
        duration_hours: data.durationHours || 0.5,
        status: editingAppt
          ? (isReschedulingRef.current ? 'rescheduled' : editingAppt.status)
          : 'pending',
        notes: data.notes ?? null,
      };

      const { error } = editingAppt
        ? await supabase.from('appointments').update(apptData).eq('id', editingAppt.id)
        : await supabase.from('appointments').insert([apptData]);

      if (error) {
        showAlert({ title: 'Error', message: error.message });
        return false;
      }

      isReschedulingRef.current = false;
      await refetchAppts();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      showAlert({ title: 'Error Inesperado', message: msg });
      return false;
    }
  }, [editingAppt, business?.id, selectedDateStr, refetchAppts, showAlert]);

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const isSuspended = business?.status === 'suspended';
  const WORKERS = selectedWorkerFilter ? workers.filter(w => w.name === selectedWorkerFilter) : workers;
  const colWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / Math.max(WORKERS.length, 1));
  const avatarSize = Math.min(52, Math.max(28, colWidth - 24));
  const weekColWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / 7);

  // ─── Vista día ───────────────────────────────────────────────────────────────

  const renderDayGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      <View style={[styles.workerHeader, { paddingLeft: LABEL_WIDTH + PADDING, paddingRight: PADDING }]}>
        {WORKERS.map(w => {
          const todayAppts = appointments.filter(a => a.worker === w.name && a.date === selectedDateStr).length;
          return (
            <TouchableOpacity key={w.id} style={[styles.workerCol, { width: colWidth }]}
              onPress={() => { setProfileWorker(w); setProfileVisible(true); }} activeOpacity={0.75}>
              <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={avatarSize} showDot />
              <Text style={[styles.workerName, { color: colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
              {w.specialty ? <Text style={[styles.workerSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>{w.specialty}</Text> : null}
              {todayAppts > 0 && <Text style={[styles.workerApptCount, { color: w.color }]}>{todayAppts} cita{todayAppts > 1 ? 's' : ''}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.grid, { paddingHorizontal: PADDING }]}>
        {hoursGrid.map(h => (
          <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>{String(h).padStart(2, '0')}:00</Text>
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
            <View style={{ position: 'absolute', top: HOUR_HEIGHT / 2, left: LABEL_WIDTH, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border, opacity: 0.4 }} />
          </View>
        ))}

        <View style={[styles.columnsOverlay, { left: LABEL_WIDTH + PADDING }]}>
          {workers.map((w, wi) => {
            const unavailableBlocks = getUnavailableBlocks(selectedDate, business, w, startHour, endHour);
            return (
              <Pressable
                key={w.id}
                onPress={(e) => handleGridPress(e, w.id, w.name, w.color, selectedDate)}
                style={[styles.workerColumn, { width: colWidth, left: wi * colWidth, borderLeftColor: colors.border, borderLeftWidth: wi > 0 ? StyleSheet.hairlineWidth : 0, height: (endHour - startHour) * HOUR_HEIGHT }]}
              >
                {unavailableBlocks.map((block, i) => {
                  const isClosed = block.title === 'No disponible';
                  return (
                    <View
                      key={`unav-${i}`}
                      style={{
                        position: 'absolute',
                        top: (block.start - startHour) * HOUR_HEIGHT,
                        height: block.duration * HOUR_HEIGHT,
                        width: colWidth - 8,
                        left: 4,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        borderWidth: 1,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        borderStyle: 'dashed',
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1,
                        overflow: 'hidden'
                      }}
                    >
                      {block.duration >= 1 ? (
                        <View style={{ alignItems: 'center', gap: 6, opacity: 0.6 }}>
                          <Feather name={isClosed ? 'lock' : 'coffee'} size={18} color={colors.textSecondary} />
                          <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 }}>
                            {isClosed ? 'CERRADO' : block.title.toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <Feather name={isClosed ? 'lock' : 'coffee'} size={14} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                      )}
                    </View>
                  );
                })}
                {filteredAppointments
                  .filter(a => a.worker_id === w.id && a.date === selectedDateStr && a.status !== 'completed' && a.status !== 'no-show')
                  .map(appt => (
                    <AppointmentCard key={appt.id} appt={appt} columnWidth={colWidth} onPress={() => openSheet(appt)} colors={colors} isDarkMode={isDarkMode} startHour={startHour} />
                  ))}
              </Pressable>
            );
          })}
          {nowPosition !== null && (
            <View style={[styles.nowLine, { top: nowPosition, width: WORKERS.length * colWidth }]}>
              <View style={styles.nowDot} />
              <View style={[styles.nowBar, { backgroundColor: appColors.primary }]} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // ─── Vista semana ─────────────────────────────────────────────────────────────

  const renderWeekGrid = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexShrink: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: 15, paddingBottom: 10, gap: 20 }}>
          {workers.map(w => {
            const isSelected = selectedWorkerFilter === w.name;
            return (
              <TouchableOpacity key={w.id} onPress={() => setSelectedWorkerFilter(w.name)} activeOpacity={0.75} style={{ alignItems: 'center', gap: 5, opacity: isSelected ? 1 : 0.40 }}>
                <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={90} showDot={isSelected} />
                <Text style={[styles.workerName, { color: isSelected ? w.color : colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
                {w.specialty ? <Text style={[styles.workerSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>{w.specialty}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.workerHeader, { paddingLeft: LABEL_WIDTH + PADDING, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
        {weekDays.map((d, i) => (
          <TouchableOpacity key={i} onPress={() => { setSelectedDate(d); setViewMode('day'); }} style={[styles.workerCol, { width: weekColWidth, alignItems: 'center' }]}>
            <Text style={[styles.workerName, { color: isToday(d) ? appColors.primary : colors.textSecondary, fontWeight: isToday(d) ? '700' : '400' }]}>{shortDayName(d)}</Text>
            <View style={[styles.weekDayNum, isToday(d) && { backgroundColor: appColors.primary }]}>
              <Text style={[styles.weekDayNumText, { color: isToday(d) ? '#111827' : colors.textPrimary }]}>{d.getDate()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}>
        <View style={[styles.grid, { paddingHorizontal: PADDING }]}>
          {hoursGrid.map(h => (
            <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
              <Text style={[styles.hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>{String(h).padStart(2, '0')}:00</Text>
              <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
            </View>
          ))}
          <View style={[styles.columnsOverlay, { left: LABEL_WIDTH + PADDING }]}>
            {weekDays.map((d, di) => {
              const dateStr = toLocalISOString(d);
              const w = workers.find(w => w.name === selectedWorkerFilter) || workers[0];
              const unavailableBlocks = w ? getUnavailableBlocks(d, business, w, startHour, endHour) : [];

              return (
                <Pressable
                  key={di}
                  onPress={(e) => handleGridPress(e, w ? w.id : '', w ? w.name : '', w ? w.color : '', d)}
                  style={[styles.workerColumn, { width: weekColWidth, left: di * weekColWidth, borderLeftColor: colors.border, borderLeftWidth: di > 0 ? StyleSheet.hairlineWidth : 0, height: (endHour - startHour) * HOUR_HEIGHT, backgroundColor: isToday(d) ? appColors.primary + '06' : 'transparent' }]}
                >
                  {unavailableBlocks.map((block, i) => {
                    const isClosed = block.title === 'No disponible';
                    return (
                      <View
                        key={`unav-${i}`}
                        style={{
                          position: 'absolute',
                          top: (block.start - startHour) * HOUR_HEIGHT,
                          height: block.duration * HOUR_HEIGHT,
                          width: weekColWidth - 4,
                          left: 2,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                          borderWidth: 1,
                          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                          borderStyle: 'dashed',
                          borderRadius: 8,
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 1,
                          overflow: 'hidden'
                        }}
                      >
                        {block.duration >= 1 ? (
                          <View style={{ alignItems: 'center', gap: 4, opacity: 0.6 }}>
                            <Feather name={isClosed ? 'lock' : 'coffee'} size={12} color={colors.textSecondary} />
                            <Text style={{ fontSize: 8, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 }}>
                              {isClosed ? 'CERRADO' : block.title.toUpperCase()}
                            </Text>
                          </View>
                        ) : (
                          <Feather name={isClosed ? 'lock' : 'coffee'} size={10} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                        )}
                      </View>
                    );
                  })}
                  {filteredAppointments
                    .filter(a => a.date === dateStr && a.status !== 'completed' && a.status !== 'no-show')
                    .map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} columnWidth={weekColWidth} onPress={() => openSheet(appt)} colors={colors} isDarkMode={isDarkMode} startHour={startHour} />
                    ))}
                </Pressable>
              );
            })}
            {nowPosition !== null && (
              <View style={[styles.nowLine, { top: nowPosition, width: 7 * weekColWidth }]}>
                <View style={styles.nowDot} />
                <View style={[styles.nowBar, { backgroundColor: appColors.primary }]} />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.toggle, { backgroundColor: isDarkMode ? glassColors.surfaceDark : 'rgba(0,0,0,0.05)', borderColor: isDarkMode ? glassColors.borderDarkMedium : glassColors.borderLightMedium }]}>
          {(['day', 'week'] as ViewMode[]).map(m => (
            <TouchableOpacity key={m} onPress={() => setViewMode(m)} style={[styles.toggleBtn, viewMode === m && { backgroundColor: appColors.primary }]} activeOpacity={0.8}>
              <Text style={[styles.toggleLabel, { color: viewMode === m ? '#111827' : colors.textSecondary }]}>{m === 'day' ? 'Día' : 'Semana'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.3}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Navegador de fecha */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigateDay(viewMode === 'day' ? -1 : -7)} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
          {viewMode === 'day'
            ? formatDateLabel(selectedDate)
            : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][selectedDate.getMonth()]}`
          }
        </Text>
        <TouchableOpacity onPress={() => navigateDay(viewMode === 'day' ? 1 : 7)} style={styles.navBtn} activeOpacity={0.7}>
          <Feather name="chevron-right" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filtro por trabajador (solo vista día) */}
      {viewMode === 'day' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.workerFilters} contentContainerStyle={styles.workerFiltersContent}>
          {[null, ...workers.map(w => w.name)].map((name) => {
            const isSelected = name === selectedWorkerFilter;
            const worker = workers.find(w => w.name === name);
            return (
              <TouchableOpacity
                key={name ?? '__all__'}
                style={[styles.filterChip, isSelected
                  ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
                  : { backgroundColor: isDarkMode ? glassColors.surfaceDarkFaint : glassColors.surfaceLightFaint, borderColor: isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle }
                ]}
                onPress={() => setSelectedWorkerFilter(name)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {worker && <WorkerAvatar avatarUrl={worker.avatar_url} name={worker.name} color={worker.color} size={18} showDot={false} />}
                  <Text style={[styles.filterChipText, { color: isSelected ? '#111827' : colors.textSecondary }]}>{name ?? 'Todos'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Stats (solo vista día) */}
      {viewMode === 'day' && (
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[styles.statCard, {
              backgroundColor: i === 0 ? (isDarkMode ? 'rgba(180,247,54,0.10)' : 'rgba(180,247,54,0.07)') : (isDarkMode ? glassColors.surfaceDarkFaint : glassColors.surfaceLightFaint),
              borderColor: i === 0 ? 'rgba(180,247,54,0.28)' : (isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle),
            }]}>
              <Text style={[styles.statValue, { color: i === 0 ? appColors.primary : colors.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.gridContainer, { borderTopColor: colors.border }]}>
        {viewMode === 'day' ? renderDayGrid() : renderWeekGrid()}
        {isSuspended && (
          <View style={{ backgroundColor: '#EF4444', padding: 12, borderRadius: 8, margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <Feather name="alert-circle" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>TU NEGOCIO ESTÁ SUSPENDIDO POR EL ADMINISTRADOR</Text>
          </View>
        )}
      </View>

      {/* FAB */}
      {!isSuspended && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: appColors.primary }]} activeOpacity={0.85}
          onPress={() => { setEditingAppt(undefined); setFormVisible(true); }}>
          <Feather name="plus" size={24} color="#111827" />
        </TouchableOpacity>
      )}

      <AppointmentFormModal
        visible={formVisible}
        role="company"
        initialData={editingAppt || prefillData}
        isRescheduling={isReschedulingRef.current}
        onClose={() => { isReschedulingRef.current = false; setFormVisible(false); }}
        onSave={handleSaveAppt}
        businessId={business?.id ?? ''}
        workers={workers}
        selectedDateStr={selectedDateStr}
        openingHour={startHour}
        closingHour={endHour}
        showAlert={showAlert}
        colors={colors}
      />

      <AppointmentSheet
        appt={selectedAppt}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        colors={colors}
        isGym={isGym}
        isDarkMode={isDarkMode}
      />

      <WorkerProfileModal
        visible={profileVisible}
        worker={profileWorker}
        appointments={appointments}
        selectedDate={selectedDate}
        selectedWorkerFilter={selectedWorkerFilter}
        onClose={() => setProfileVisible(false)}
        onFilterToggle={(name) => setSelectedWorkerFilter(prev => prev === name ? null : name)}
      />

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: 3, gap: 2 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  toggleLabel: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium', letterSpacing: 0.2 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10 },
  navBtn: { padding: 8 },
  dateLabel: { fontSize: 14, fontWeight: '500', letterSpacing: 0.3 },
  workerFilters: { maxHeight: 40, minHeight: 40, marginBottom: 10 },
  workerFiltersContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  filterChipText: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  statCard: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 9, letterSpacing: 1.5 },
  gridContainer: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  workerHeader: { flexDirection: 'row', paddingTop: 12, paddingBottom: 10 },
  workerCol: { alignItems: 'center', gap: 5 },
  workerName: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  workerSpecialty: { fontSize: 9, fontWeight: '400', letterSpacing: 0.2 },
  workerApptCount: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  weekDayNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  weekDayNumText: { fontSize: 13, fontWeight: '500' },
  grid: { position: 'relative' },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { fontSize: 10, paddingRight: 8, textAlign: 'right', letterSpacing: 0.2, marginTop: -6 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  columnsOverlay: { position: 'absolute', top: 0, bottom: 0, right: 0 },
  workerColumn: { position: 'absolute', top: 0 },
  nowLine: { position: 'absolute', flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: appColors.primary, marginLeft: -4 },
  nowBar: { flex: 1, height: 1.5 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
});
