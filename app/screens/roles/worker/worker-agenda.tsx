import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { LocaleConfig } from 'react-native-calendars';
import AppointmentFormModal from '../../../../components/agenda/AppointmentFormModal';
import Sidebar from '../../../../components/Sidebar';
import WorkerAvatar from '../../../../components/WorkerAvatar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';
import { getUnavailableBlocks } from '../../../utils/helpers';


// Configuración de idioma para el calendario
if (LocaleConfig) {
  LocaleConfig.locales['es'] = {
    monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    today: 'Hoy'
  };
  LocaleConfig.defaultLocale = 'es';
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week';

type Appointment = {
  id: string;
  clientName: string;
  service: string;
  worker_id: string;
  worker: string;
  workerColor: string;
  startHour: number; // ej: 9.5 = 9:30
  durationHours: number; // ej: 1.5 = 90 min
  status: 'confirmed' | 'pending' | 'completed' | 'no-show' | 'rescheduled' | 'cancelled';
  date?: string;
  price?: number;
  notes?: string;
  client_id?: string;
};

type Worker = {
  id: string;
  name: string;
  color: string;
  initials: string;
  avatar_url: string | null;
  specialty: string;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 72; // px por hora
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado', bg: '#EEF8F0', text: '#2E7D45', dot: '#3D9E5A' },
  pending: { label: 'Pendiente', bg: '#FFF5E5', text: '#A0660A', dot: '#F0A030' },
  completed: { label: 'Completado', bg: '#F0F0F0', text: '#555555', dot: '#888888' },
  rescheduled: { label: 'Reprogramado', bg: '#FFF5E5', text: '#F39C12', dot: '#F39C12' },
  'no-show': { label: 'No Show', bg: '#FDEAEB', text: '#D00024', dot: '#D00024' },
  cancelled: { label: 'Cancelado', bg: '#F0F0F0', text: '#555555', dot: '#888888' },
};

// ─── Datos mock ───────────────────────────────────────────────────────────────

// Mocks eliminados, los datos vendrán de Supabase.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(baseDate: Date) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=dom
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function toLocalISOString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHour(h: number) {
  const hh = Math.floor(h);
  const mm = String(Math.round((h % 1) * 60)).padStart(2, '0');
  return `${String(hh).padStart(2, '0')}:${mm}`;
}

function formatDateLabel(date: Date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

function shortDayName(date: Date) {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
}

function isToday(date: Date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}

function nowLinePosition(startHour: number, endHour: number) {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < startHour || h > endHour) return null;
  return (h - startHour) * HOUR_HEIGHT;
}

const PASTEL_PALETTE = [
  { light: { bg: '#EDE8F5', border: '#C5B4E8' }, dark: { bg: 'rgba(130,90,200,0.18)', border: 'rgba(160,118,220,0.32)' } },
  { light: { bg: '#D5EDE0', border: '#9ACBAA' }, dark: { bg: 'rgba(60,152,90,0.16)', border: 'rgba(80,180,108,0.30)' } },
  { light: { bg: '#FAE3D4', border: '#EEB898' }, dark: { bg: 'rgba(210,118,70,0.17)', border: 'rgba(230,145,90,0.30)' } },
  { light: { bg: '#D4E8F8', border: '#94C0EE' }, dark: { bg: 'rgba(60,132,220,0.17)', border: 'rgba(80,155,240,0.30)' } },
  { light: { bg: '#FAD8E4', border: '#EDA0B8' }, dark: { bg: 'rgba(210,80,120,0.17)', border: 'rgba(230,100,140,0.30)' } },
  { light: { bg: '#F8F0D4', border: '#E0CC80' }, dark: { bg: 'rgba(200,175,50,0.17)', border: 'rgba(220,195,60,0.30)' } },
  { light: { bg: '#D4F4EC', border: '#86CCBC' }, dark: { bg: 'rgba(50,175,150,0.17)', border: 'rgba(65,195,170,0.30)' } },
  { light: { bg: '#F0E8D4', border: '#D4C098' }, dark: { bg: 'rgba(190,155,90,0.17)', border: 'rgba(210,175,105,0.30)' } },
];

function getPastelColors(id: string, isDarkMode: boolean) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const p = PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
  return isDarkMode ? p.dark : p.light;
}

// ─── Componente: AppointmentCard ─────────────────────────────────────────────

function AppointmentCard({
  appt,
  columnWidth,
  onPress,
  colors,
  startHour,
  isDarkMode,
}: {
  appt: Appointment;
  columnWidth: number;
  onPress: () => void;
  colors: any;
  startHour: number;
  isDarkMode: boolean;
}) {
  const top = (appt.startHour - startHour) * HOUR_HEIGHT;
  const height = Math.max(appt.durationHours * HOUR_HEIGHT - 4, 28);
  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isShort = height < 48;

  const isBlocked = appt.service === 'BLOQUEO';

  const pastel = getPastelColors(appt.id, isDarkMode);

  const glassColor = isBlocked
    ? (isDarkMode ? 'rgba(60,60,60,0.55)' : 'rgba(215,215,215,0.70)')
    : pastel.bg;

  const glassBorder = isBlocked
    ? (isDarkMode ? 'rgba(120,120,120,0.30)' : 'rgba(155,155,155,0.40)')
    : pastel.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        appStyles.wa_apptCard,
        {
          top,
          height,
          width: columnWidth - 6,
          borderLeftColor: isBlocked ? (isDarkMode ? '#555555' : '#999999') : appt.workerColor,
          backgroundColor: glassColor,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glassBorder,
        },
      ]}
    >
      <View style={[appStyles.wa_apptDot, { backgroundColor: isBlocked ? (isDarkMode ? '#555555' : '#999999') : status.dot }]} />
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Text style={[appStyles.wa_apptTitle, { color: isBlocked ? (isDarkMode ? '#AAAAAA' : '#999999') : colors.textPrimary }]} numberOfLines={1}>
          {isBlocked ? (appt.clientName || 'No disponible') : appt.service}
        </Text>
        {!isShort && !isBlocked && (
          <Text style={[appStyles.wa_apptSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {appt.clientName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente: BottomSheet ──────────────────────────────────────────────────

function AppointmentSheet({
  appt,
  visible,
  onClose,
  onAction,
  colors,
  isGym,
  isDarkMode,
}: {
  appt: Appointment | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: string, appt: Appointment) => void;
  colors: any;
  isGym: boolean;
  isDarkMode: boolean;
}) {
  const slideY = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) { onClose(); }
        else { Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start(); }
      },
    })
  ).current;

  if (!appt) return null;

  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const endHour = appt.startHour + appt.durationHours;

  const isBlocked = appt.service === 'BLOQUEO';

  const ACTIONS = isBlocked
    ? [{ id: 'cancel', icon: 'unlock', label: 'Desbloquear', color: '#E24B4A' }]
    : appt.status === 'pending'
      ? [
        { id: 'confirm', icon: 'check-circle', label: 'Confirmar', color: '#3D9E5A' },
        { id: 'rescheduled', icon: 'clock', label: 'Reprogramar', color: '#F39C12' },
        { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
        { id: 'no-show', icon: 'user-x', label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
        { id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' },
      ]
      : appt.status === 'confirmed'
        ? [
          { id: 'complete', icon: 'check-square', label: isGym ? 'Asistió' : 'Completar', color: '#5C90D2' },
          { id: 'rescheduled', icon: 'clock', label: 'Reprogramar', color: '#F39C12' },
          { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
          { id: 'no-show', icon: 'user-x', label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
          { id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' },
        ]
        : appt.status === 'rescheduled'
          ? [
            { id: 'confirm', icon: 'check-circle', label: 'Confirmar', color: '#3D9E5A' },
            { id: 'complete', icon: 'check-square', label: isGym ? 'Asistió' : 'Completar', color: '#5C90D2' },
            { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
            { id: 'no-show', icon: 'user-x', label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
            { id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' },
          ]
          : [];

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 1000, pointerEvents: visible ? 'auto' : 'none' },
        !visible && { opacity: 0 }
      ]}
    >
      <Animated.View style={[appStyles.wa_sheetOverlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[appStyles.wa_sheet, { transform: [{ translateY: slideY }], overflow: 'hidden' }]}
        {...panResponder.panHandlers}
      >
        <BlurView
          intensity={isDarkMode ? 60 : 80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
        />
        <View style={[StyleSheet.absoluteFill, {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: isDarkMode ? 'rgba(15,15,20,0.55)' : 'rgba(255,255,255,0.45)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }]} />
        {/* Handle */}
        <View style={[appStyles.wa_sheetHandle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />

        {/* Info principal */}
        <View style={appStyles.wa_sheetTop}>
          <View style={[appStyles.wa_sheetWorkerDot, { backgroundColor: appt.workerColor }]}>
            <Text style={appStyles.wa_sheetWorkerInitial}>{appt.worker[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[appStyles.wa_sheetService, { color: colors.textPrimary }]}>{appt.service}</Text>
            <Text style={[appStyles.wa_sheetClient, { color: colors.textSecondary }]}>{appt.clientName}</Text>
          </View>
          <View style={[appStyles.wa_sheetBadge, { backgroundColor: status.bg }]}>
            <Text style={[appStyles.wa_sheetBadgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* Detalles */}
        <View style={[appStyles.wa_sheetDetails, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={appStyles.wa_sheetDetailRow}>
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={[appStyles.wa_sheetDetailText, { color: colors.textSecondary }]}>
              {formatHour(appt.startHour)} – {formatHour(endHour)}
              {'  ·  '}{Math.round(appt.durationHours * 60)} min
            </Text>
          </View>
          <View style={appStyles.wa_sheetDetailRow}>
            <Feather name="user" size={14} color={colors.textSecondary} />
            <Text style={[appStyles.wa_sheetDetailText, { color: colors.textSecondary }]}>
              {appt.worker}
            </Text>
          </View>
          {!!appt.notes && (
            <View style={appStyles.wa_sheetDetailRow}>
              <Feather name="file-text" size={14} color={colors.textSecondary} />
              <Text style={[appStyles.wa_sheetDetailText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={3}>
                {appt.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Acciones rápidas */}
        <View style={appStyles.wa_sheetActions}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={appStyles.wa_sheetAction} activeOpacity={0.7} onPress={() => { onClose(); onAction(a.id, appt); }}>
              <View style={[appStyles.wa_sheetActionIcon, { backgroundColor: a.color + '18' }]}>
                <Feather name={a.icon as any} size={18} color={a.color} />
              </View>
              <Text style={[appStyles.wa_sheetActionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}


export default function WorkerAgendaScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { business, profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const [isGym, setIsGym] = useState(false);

  useEffect(() => {
    const checkGym = async () => {
      if (!business?.category_id) return;
      const { data } = await supabase
        .from('service_categories')
        .select('name, parent_id')
        .eq('id', business.category_id)
        .single();

      if (data) {
        const isGymCategory = data.name.toUpperCase().includes('GIMNASIO') || data.name.toUpperCase().includes('FITNESS');
        setIsGym(isGymCategory);
      }
    };
    checkGym();
  }, [business?.category_id]);

  // Horas dinámicas
  const startHour = useMemo(() => {
    if (!business?.opening_time) return DEFAULT_START_HOUR;
    return parseInt(business.opening_time.split(':')[0]);
  }, [business?.opening_time]);

  const endHour = useMemo(() => {
    if (!business?.closing_time) return DEFAULT_END_HOUR;
    let h = parseInt(business.closing_time.split(':')[0]);
    const m = parseInt(business.closing_time.split(':')[1]);
    if (m > 0) h += 1;
    return h;
  }, [business?.closing_time]);

  const hoursGrid = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  }, [startHour, endHour]);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>();
  const [prefillData, setPrefillData] = useState<Appointment | undefined>();
  const isReschedulingRef = useRef(false);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const fetchWorkers = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase.from('workers').select('*').eq('user_id', profile.id).single();
    if (!error && data) {
      setWorkers([{
        id: data.id,
        name: data.name,
        color: data.color || '#D00024',
        initials: data.name.substring(0, 2).toUpperCase(),
        avatar_url: data.avatar_url || null,
        specialty: data.specialty || '',
      }]);
    }
  }, [profile?.id]);

  const fetchAppointments = useCallback(async () => {
    if (!business?.id || !weekDays[0] || !weekDays[6] || workers.length === 0) return;

    const workerId = workers[0].id;
    const startStr = toLocalISOString(weekDays[0]);
    const endStr = toLocalISOString(weekDays[6]);

    const { data, error } = await supabase
      .from('appointments')
      .select('*, workers(name, color)')
      .eq('worker_id', workerId)
      .gte('date', startStr)
      .lte('date', endStr)
      .neq('status', 'cancelled');

    if (!error && data) {
      setAppointments(data.map(a => ({
        id: a.id,
        clientName: a.client_name,
        service: a.service,
        worker_id: a.worker_id,
        worker: a.workers?.name || 'Desconocido',
        workerColor: a.workers?.color || '#000',
        startHour: Number(a.start_hour),
        durationHours: Number(a.duration_hours),
        status: a.status as any,
        date: a.date,
        price: a.price || 0,
        notes: a.notes || undefined,
        client_id: a.client_id || undefined,
      })));
    }
  }, [business?.id, weekDays, workers]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const fetchAppointmentsRef = useRef(fetchAppointments);
  useEffect(() => { fetchAppointmentsRef.current = fetchAppointments; }, [fetchAppointments]);

  useEffect(() => {
    if (!business?.id) return;
    const channelName = `worker-agenda-${business.id}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${business.id}` },
        () => { fetchAppointmentsRef.current(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [business?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWorkers(), fetchAppointments()]);
    setRefreshing(false);
  }, [fetchWorkers, fetchAppointments]);

  useEffect(() => {
    if (viewMode === 'week' && !selectedWorkerFilter && workers.length > 0) {
      setSelectedWorkerFilter(workers[0].name);
    }
  }, [viewMode, selectedWorkerFilter, workers]);

  const nowPosition = useMemo(() => nowLinePosition(startHour, endHour), [startHour, endHour]);

  // Stats
  const selectedDateStr = useMemo(() => toLocalISOString(selectedDate), [selectedDate]);

  const filteredAppointments = useMemo(() => {
    if (!selectedWorkerFilter) return appointments;
    return appointments.filter(a => a.worker === selectedWorkerFilter);
  }, [appointments, selectedWorkerFilter]);

  const stats = useMemo(() => {
    const todayApps = filteredAppointments.filter(a => a.date === selectedDateStr);
    const total = todayApps.length;
    const pending = todayApps.filter(a => a.status === 'pending').length;
    const completed = todayApps.filter(a => a.status === 'completed').length;
    return [
      { label: 'CITAS HOY', value: String(total) },
      { label: 'PENDIENTES', value: String(pending) },
      { label: 'HECHAS', value: String(completed) },
    ];
  }, [filteredAppointments]);

  const openSheet = useCallback((appt: Appointment) => {
    setSelectedAppt(appt);
    setSheetVisible(true);
  }, []);

  const handleSheetAction = useCallback(async (actionId: string, appt: Appointment) => {
    if (actionId === 'confirm') {
      const { error } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appt.id);
      if (error) showAlert({ title: 'Error', message: error.message });
      else fetchAppointments();
    } else if (actionId === 'complete') {
      const { error } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id);
      if (error) showAlert({ title: 'Error', message: error.message });
      else fetchAppointments();
    } else if (actionId === 'rescheduled') {
      isReschedulingRef.current = true;
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
    } else if (actionId === 'no-show') {
      const { error } = await supabase.from('appointments').update({ status: 'no-show' }).eq('id', appt.id);
      if (error) showAlert({ title: 'Error', message: error.message });
      else fetchAppointments();
    } else if (actionId === 'cancel') {
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
      if (error) showAlert({ title: 'Error', message: error.message });
      else fetchAppointments();
    } else if (actionId === 'edit') {
      isReschedulingRef.current = false;
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
    }
  }, [fetchAppointments, showAlert]);

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

  const handleSaveAppt = useCallback(async (data: Partial<Appointment>): Promise<boolean> => {
    try {
      if (!business?.id) {
        showAlert({ title: 'Error', message: 'No se ha seleccionado ningún negocio.' });
        return false;
      }
      const dateStr = data.date || toLocalISOString(selectedDate);

      const newStart = data.startHour ?? 9;
      const newEnd = newStart + (data.durationHours ?? 0.5);

      // ── Validar colisiones de horario ──
      let query = supabase
        .from('appointments')
        .select('id, start_hour, duration_hours')
        .eq('worker_id', data.worker_id)
        .eq('date', dateStr);

      if (editingAppt) {
        query = query.neq('id', editingAppt.id);
      }

      const { data: existingAppts, error: fetchError } = await query;
      if (fetchError) {
        showAlert({ title: 'Error', message: `No se pudo validar el horario: ${fetchError.message}` });
        return false;
      }

      const hasCollision = existingAppts?.some(a => {
        const eStart = Number(a.start_hour);
        const eEnd = eStart + Number(a.duration_hours);
        return newStart < eEnd && newEnd > eStart;
      });

      if (hasCollision) {
        showAlert({
          title: 'Horario no disponible',
          message: 'El trabajador ya tiene una cita en este horario que se superpone con la nueva.'
        });
        return false;
      }

      // Validar contra bloques de horario no disponibles (cierres y bloqueos del trabajador)
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
            message: 'El horario seleccionado se cruza con un horario de cierre o bloqueo.'
          });
          return false;
        }
      }

      const newStatus = editingAppt
        ? (isReschedulingRef.current ? 'rescheduled' : editingAppt.status)
        : 'pending';

      const apptData: Record<string, any> = {
        business_id: business.id,
        worker_id: data.worker_id,
        client_name: data.clientName || 'Sin nombre',
        service: data.service || 'Servicio',
        price: data.price || 0,
        date: dateStr,
        start_hour: newStart,
        duration_hours: data.durationHours || 0.5,
        status: newStatus,
        notes: data.notes ?? null,
      };

      if (editingAppt) {
        const { error } = await supabase.from('appointments').update(apptData).eq('id', editingAppt.id);
        if (error) {
          showAlert({ title: 'Error', message: `No se pudo actualizar: ${error.message}` });
          return false;
        }
      } else {
        const { error } = await supabase.from('appointments').insert([apptData]);
        if (error) {
          showAlert({ title: 'Error', message: `No se pudo agendar: ${error.message}` });
          return false;
        }
      }

      isReschedulingRef.current = false;
      fetchAppointments();
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveAppt:', err);
      showAlert({ title: 'Error Inesperado', message: err.message || 'Ocurrió un error al procesar la cita.' });
      return false;
    }
  }, [editingAppt, business?.id, selectedDate, fetchAppointments, showAlert]);

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const isSuspended = business?.status === 'suspended';

  // ─── Vista de día: columnas por trabajador ────────────────────────────────

  const LABEL_WIDTH = 46;
  const PADDING = 16;
  const WORKERS = selectedWorkerFilter ? workers.filter(w => w.name === selectedWorkerFilter) : workers;
  const colWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / Math.max(WORKERS.length, 1));
  const avatarSize = Math.min(52, Math.max(28, colWidth - 24));

  const renderDayGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de columnas (trabajadores) */}
      <View style={[appStyles.wa_workerHeader, { paddingLeft: LABEL_WIDTH + PADDING, paddingRight: PADDING }]}>
        {WORKERS.map(w => {
          const todayAppts = appointments.filter(a => a.worker === w.name && a.date === toLocalISOString(selectedDate)).length;
          return (
            <TouchableOpacity
              key={w.id}
              style={[appStyles.wa_workerCol, { width: colWidth }]}
              onPress={() => { setProfileWorker(w); setProfileVisible(true); }}
              activeOpacity={0.75}
            >
              <WorkerAvatar
                avatarUrl={null}
                name={w.name}
                color={w.color}
                size={avatarSize}
                showDot={false}
              />
              <Text style={[appStyles.wa_workerName, { color: colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
              {todayAppts > 0 && (
                <Text style={[appStyles.wa_workerApptCount, { color: w.color }]}>{todayAppts} cita{todayAppts > 1 ? 's' : ''}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid de tiempo */}
      <View style={[appStyles.wa_grid, { paddingHorizontal: PADDING }]}>
        {/* Líneas de hora */}
        {hoursGrid.map(h => (
          <View key={h} style={[appStyles.wa_hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[appStyles.wa_hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[appStyles.wa_hourLine, { backgroundColor: colors.border }]} />
            <View style={{
              position: 'absolute',
              top: HOUR_HEIGHT / 2,
              left: LABEL_WIDTH,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: colors.border,
              opacity: 0.4,
            }} />
          </View>
        ))}

        {/* Columnas de citas por trabajador */}
        <View style={[appStyles.wa_columnsOverlay, { left: LABEL_WIDTH + PADDING }]}>
          {WORKERS.map((w, wi) => {
            const unavailableBlocks = getUnavailableBlocks(selectedDate, business, w, startHour, endHour);
            return (
              <Pressable
                key={w.id}
                onPress={(e) => handleGridPress(e, w.id, w.name, w.color, selectedDate)}
                style={[
                  appStyles.wa_workerColumn,
                  {
                    width: colWidth,
                    left: wi * colWidth,
                    borderLeftColor: colors.border,
                    borderLeftWidth: wi > 0 ? StyleSheet.hairlineWidth : 0,
                    height: (endHour - startHour) * HOUR_HEIGHT,
                  },
                ]}
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
                  .filter(a => a.worker === w.name && a.date === selectedDateStr
                    && a.status !== 'completed' && a.status !== 'no-show')
                  .map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      columnWidth={colWidth}
                      onPress={() => openSheet(appt)}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      startHour={startHour}
                    />
                  ))}
              </Pressable>
            );
          })}

          {/* Línea "ahora" */}
          {nowPosition !== null && (
            <View style={[appStyles.wa_nowLine, { top: nowPosition, width: WORKERS.length * colWidth }]}>
              <View style={appStyles.wa_nowDot} />
              <View style={[appStyles.wa_nowBar, { backgroundColor: appColors.primary }]} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // ─── Vista semana: días en columnas ──────────────────────────────────────

  const weekColWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / 7);

  const renderWeekGrid = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de días */}
      <View style={[appStyles.wa_workerHeader, { paddingLeft: LABEL_WIDTH + PADDING }]}>
        {weekDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { setSelectedDate(d); setViewMode('day'); }}
            style={[appStyles.wa_workerCol, { width: weekColWidth, alignItems: 'center' }]}
          >
            <Text style={[appStyles.wa_workerName, { color: isToday(d) ? appColors.primary : colors.textSecondary, fontWeight: isToday(d) ? '700' : '400' }]}>
              {shortDayName(d)}
            </Text>
            <View style={[appStyles.wa_weekDayNum, isToday(d) && { backgroundColor: appColors.primary }]}>
              <Text style={[appStyles.wa_weekDayNumText, { color: isToday(d) ? '#111827' : colors.textPrimary }]}>
                {d.getDate()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[appStyles.wa_grid, { paddingHorizontal: PADDING }]}>
        {hoursGrid.map(h => (
          <View key={h} style={[appStyles.wa_hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[appStyles.wa_hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[appStyles.wa_hourLine, { backgroundColor: colors.border }]} />
            <View style={{
              position: 'absolute',
              top: HOUR_HEIGHT / 2,
              left: LABEL_WIDTH,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: colors.border,
              opacity: 0.4,
            }} />
          </View>
        ))}
        <View style={[appStyles.wa_columnsOverlay, { left: LABEL_WIDTH + PADDING }]}>
          {weekDays.map((d, di) => {
            const dateStr = toLocalISOString(d);
            const w = WORKERS.length > 0 ? WORKERS[0] : null;
            const unavailableBlocks = w ? getUnavailableBlocks(d, business, w, startHour, endHour) : [];

            return (
              <Pressable
                key={di}
                onPress={(e) => handleGridPress(e, w ? w.id : '', w ? w.name : '', w ? w.color : '', d)}
                style={[
                  appStyles.wa_workerColumn,
                  {
                    width: weekColWidth,
                    left: di * weekColWidth,
                    borderLeftColor: colors.border,
                    borderLeftWidth: di > 0 ? StyleSheet.hairlineWidth : 0,
                    height: (endHour - startHour) * HOUR_HEIGHT,
                    backgroundColor: isToday(d) ? appColors.primary + '06' : 'transparent',
                  },
                ]}
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
                  .filter(a => a.date === dateStr
                    && a.status !== 'completed' && a.status !== 'no-show')
                  .map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      columnWidth={weekColWidth}
                      onPress={() => openSheet(appt)}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      startHour={startHour}
                    />
                  ))}
              </Pressable>
            );
          })}
          {nowPosition !== null && (
            <View style={[appStyles.wa_nowLine, { top: nowPosition, width: 7 * weekColWidth }]}>
              <View style={appStyles.wa_nowDot} />
              <View style={[appStyles.wa_nowBar, { backgroundColor: appColors.primary }]} />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[appStyles.wa_header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={appStyles.wa_iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Toggle Día / Semana — glass */}
        <View style={[appStyles.wa_toggle, {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        }]}>
          {(['day', 'week'] as ViewMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[appStyles.wa_toggleBtn, viewMode === m && { backgroundColor: appColors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[appStyles.wa_toggleLabel, { color: viewMode === m ? '#111827' : colors.textSecondary }]}>
                {m === 'day' ? 'Día' : 'Semana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={toggleTheme} style={appStyles.wa_iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Selector de fecha (modo día) ────────────────────────── */}
      {viewMode === 'day' && (
        <View style={appStyles.wa_dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-1)} style={appStyles.wa_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[appStyles.wa_dateLabel, { color: colors.textPrimary }]}>
            {formatDateLabel(selectedDate)}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(1)} style={appStyles.wa_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Selector de semana (modo semana) ────────────────────── */}
      {viewMode === 'week' && (
        <View style={appStyles.wa_dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-7)} style={appStyles.wa_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[appStyles.wa_dateLabel, { color: colors.textPrimary }]}>
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][selectedDate.getMonth()]}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(7)} style={appStyles.wa_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtro por trabajador — solo en vista día ────────────── */}
      {viewMode === 'day' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={appStyles.wa_workerFilters} contentContainerStyle={appStyles.wa_workerFiltersContent}>
          <TouchableOpacity
            style={[appStyles.wa_filterChip,
            !selectedWorkerFilter
              ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
              : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            ]}
            onPress={() => setSelectedWorkerFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={[appStyles.wa_filterChipText, !selectedWorkerFilter ? { color: '#111827' } : { color: colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
          {workers.map(w => (
            <TouchableOpacity
              key={w.id}
              style={[appStyles.wa_filterChip,
              selectedWorkerFilter === w.name
                ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
                : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
              ]}
              onPress={() => setSelectedWorkerFilter(w.name)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <WorkerAvatar avatarUrl={null} name={w.name} color={selectedWorkerFilter === w.name ? '#111827' : w.color} size={18} showDot={false} />
                <Text style={[appStyles.wa_filterChipText, selectedWorkerFilter === w.name ? { color: '#111827' } : { color: colors.textSecondary }]}>{w.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Stats row (Liquid Glass) — solo en vista día ────────── */}
      {viewMode === 'day' && (
        <View style={appStyles.wa_statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[appStyles.wa_statCard, {
              backgroundColor: i === 0
                ? (isDarkMode ? 'rgba(180,247,54,0.10)' : 'rgba(180,247,54,0.07)')
                : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              borderColor: i === 0
                ? 'rgba(180,247,54,0.28)'
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            }]}>
              <Text style={[appStyles.wa_statValue, { color: i === 0 ? appColors.primary : colors.textPrimary }]}>
                {s.value}
              </Text>
              <Text style={[appStyles.wa_statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[appStyles.wa_gridContainer, { borderTopColor: colors.border }]}>
        {viewMode === 'day' ? renderDayGrid() : renderWeekGrid()}

        {isSuspended && (
          <View style={{ backgroundColor: '#EF4444', padding: 12, borderRadius: 8, margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <Feather name="alert-circle" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>TU NEGOCIO ESTÁ SUSPENDIDO POR EL ADMINISTRADOR</Text>
          </View>
        )}
      </View>

      {/* ── FAB ──────────────────────────────────────────────────── */}
      {!isSuspended && (
        <TouchableOpacity
          style={[appStyles.wa_fab, { backgroundColor: appColors.primary }]}
          activeOpacity={0.85}
          onPress={() => {
            setEditingAppt(undefined);
            setFormVisible(true);
          }}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Modal Formulario ─────────────────────────────────────── */}
      <AppointmentFormModal
        visible={formVisible}
        role="worker"
        initialData={editingAppt || prefillData}
        isRescheduling={isReschedulingRef.current}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveAppt}
        businessId={business?.id || ''}
        workers={workers}
        selectedDateStr={selectedDateStr}
        openingHour={business?.opening_time ? parseInt(business.opening_time.split(':')[0], 10) : 7}
        closingHour={business?.closing_time ? parseInt(business.closing_time.split(':')[0], 10) : 22}
        allowBlocking={true}
        showAlert={showAlert}
        colors={{ ...colors, textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, border: colors.border }}
      />

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      <AppointmentSheet
        appt={selectedAppt}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        colors={colors}
        isGym={isGym}
        isDarkMode={isDarkMode}
      />

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* ── Worker Profile Card ───────────────────────────────────── */}
      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <Pressable style={appStyles.wa_profileOverlay} onPress={() => setProfileVisible(false)}>
          <Pressable onPress={() => { }}>
            <BlurView intensity={70} tint="dark" style={appStyles.wa_profileCard}>
              <View style={[appStyles.wa_profileCardInner, { backgroundColor: 'rgba(14,14,14,0.78)' }]}>
                <TouchableOpacity style={appStyles.wa_profileClose} onPress={() => setProfileVisible(false)}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>✕</Text>
                </TouchableOpacity>
                {profileWorker && (
                  <>
                    <View style={[appStyles.wa_profileAvatar, { backgroundColor: profileWorker.color + '25', borderColor: profileWorker.color }]}>
                      <Text style={[appStyles.wa_profileInitials, { color: profileWorker.color }]}>{profileWorker.initials}</Text>
                    </View>
                    <Text style={appStyles.wa_profileName}>{profileWorker.name}</Text>
                    <View style={appStyles.wa_profileDivider} />
                    <View style={appStyles.wa_profileStats}>
                      <View style={appStyles.wa_profileStatItem}>
                        <Text style={appStyles.wa_profileStatValue}>
                          {appointments.filter(a => a.worker === profileWorker.name && a.date === toLocalISOString(selectedDate)).length}
                        </Text>
                        <Text style={appStyles.wa_profileStatLabel}>Hoy</Text>
                      </View>
                      <View style={[appStyles.wa_profileStatItem, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.1)' }]}>
                        <Text style={appStyles.wa_profileStatValue}>
                          {appointments.filter(a => a.worker === profileWorker.name).length}
                        </Text>
                        <Text style={appStyles.wa_profileStatLabel}>Semana</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[appStyles.wa_profileFilterBtn, { backgroundColor: profileWorker.color + '20', borderColor: profileWorker.color + '50' }]}
                      onPress={() => {
                        setSelectedWorkerFilter(prev => prev === profileWorker.name ? null : profileWorker.name);
                        setProfileVisible(false);
                      }}
                    >
                      <Text style={[appStyles.wa_profileFilterBtnText, { color: profileWorker.color }]}>
                        {selectedWorkerFilter === profileWorker.name ? 'Ver todos' : 'Filtrar por este trabajador'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────



// ─── Estilos del formulario de cita (Liquid Glass) ────────────────────────────

