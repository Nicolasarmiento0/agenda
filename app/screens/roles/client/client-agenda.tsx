import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { LocaleConfig } from 'react-native-calendars';
import AppointmentCard from '../../../../components/agenda/AppointmentCard';
import AppointmentFormModal from '../../../../components/agenda/AppointmentFormModal';
import AppointmentSheet from '../../../../components/agenda/AppointmentSheet';
import Sidebar from '../../../../components/Sidebar';
import WorkerAvatar from '../../../../components/WorkerAvatar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useBusiness } from '../../../../context/BusinessContext';
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
  workerAvatarUrl?: string | null;
  startHour: number; // ej: 9.5 = 9:30
  durationHours: number; // ej: 1.5 = 90 min
  status: 'confirmed' | 'pending' | 'completed' | 'no-show' | 'rescheduled' | 'cancelled';
  date?: string;
  price?: number;
  notes?: string;
  isMine?: boolean;
};

type Worker = {
  id: string;
  name: string;
  color: string;
  initials: string;
  avatar_url: string | null;
  specialty: string;
  blocks?: any[];
};

type Business = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  avatar_url?: string;
  opening_time?: string;
  closing_time?: string;
  booking_window_day?: number;
  booking_window_open_time?: string;
  booking_window_close_time?: string;
  schedule?: any;
};

type GymMembership = {
  id: string;
  client_type: 'static' | 'dynamic';
  plan: 'basic' | 'premium' | 'vip';
  status: 'active' | 'inactive' | 'suspended';
};

type MembershipRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
};

const PLAN_LIMITS: Record<string, number> = {
  basic: 1,
  premium: 3,
  vip: 5,
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 72; // px por hora
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;
const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado', bg: '#EEF8F0', text: '#2E7D45', dot: '#3D9E5A' },
  pending: { label: 'Pendiente', bg: '#FFF5E5', text: '#A0660A', dot: '#F0A030' },
  completed: { label: 'Completado', bg: '#F0F0F0', text: '#555555', dot: '#888888' },
  rescheduled: { label: 'Reprogramado', bg: '#FFF5E5', text: '#F39C12', dot: '#F39C12' },
  'no-show': { label: 'No Show', bg: '#FDEAEB', text: '#D00024', dot: '#D00024' },
  cancelled: { label: 'Cancelado', bg: '#F0F0F0', text: '#555555', dot: '#888888' },
};

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


export default function ClientAgendaScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { selectedBusiness: contextBusiness, setSelectedBusiness } = useBusiness();
  const { id: businessIdParam } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState(contextBusiness);

  // Si el contexto está vacío (recarga de página) pero hay id en la URL, fetchear desde Supabase
  useEffect(() => {
    if (contextBusiness) {
      setBusiness(contextBusiness);
      return;
    }
    if (!businessIdParam) return;
    supabase
      .from('businesses')
      .select('*')
      .eq('id', businessIdParam)
      .single()
      .then(({ data }) => {
        if (data) {
          setBusiness(data);
          setSelectedBusiness(data);
        }
      });
  }, [businessIdParam, contextBusiness]);
  const [isGym, setIsGym] = useState(false);

  useEffect(() => {
    async function checkGym() {
      if (!business?.category_id) return;
      const { data } = await supabase.from('service_categories').select('name').eq('id', business.category_id).single();
      if (data) {
        setIsGym(data.name.toUpperCase().includes('GIMNASIO') || data.name.toUpperCase().includes('FITNESS'));
      }
    }
    checkGym();
  }, [business?.category_id]);

  // ─── Gym: membresía del cliente ──────────────────────────────
  const [gymMembership, setGymMembership] = useState<GymMembership | null>(null);
  const [membershipRequest, setMembershipRequest] = useState<MembershipRequest | null>(null);
  const [gymMembershipLoading, setGymMembershipLoading] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [membershipMessage, setMembershipMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  // Banner de selección semanal para clientes estáticos (domingo en ventana horaria)
  const [showWeeklyBanner, setShowWeeklyBanner] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklySlotsByWorker, setWeeklySlotsByWorker] = useState<Record<string, string[]>>({});
  const [weeklySelectedSlots, setWeeklySelectedSlots] = useState<{ workerId: string; date: string; startHour: number }[]>([]);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [weeklyClassesUsed, setWeeklyClassesUsed] = useState(0);

  const fetchGymMembership = useCallback(async () => {
    if (!isGym || !business?.id || !profile?.id) return;
    setGymMembershipLoading(true);
    const [{ data: mem }, { data: req }] = await Promise.all([
      supabase.from('gym_memberships').select('*').eq('business_id', business.id).eq('client_id', profile.id).maybeSingle(),
      supabase.from('membership_requests').select('id, status').eq('business_id', business.id).eq('client_id', profile.id).maybeSingle(),
    ]);
    setGymMembership(mem ?? null);
    setMembershipRequest(req ?? null);
    setGymMembershipLoading(false);
  }, [isGym, business?.id, profile?.id]);

  useEffect(() => {
    if (isGym) fetchGymMembership();
  }, [isGym, fetchGymMembership]);

  const fetchWeeklyClassesUsed = useCallback(async () => {
    if (!isGym || gymMembership?.status !== 'active' || !business?.id || !profile?.id) return;
    const today = new Date();
    const currentWeek = getWeekDays(today);
    const weekStart = toLocalISOString(currentWeek[0]);
    const weekEnd = toLocalISOString(currentWeek[6]);
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('client_id', profile.id)
      .eq('service', 'CLASE')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .in('status', ['confirmed', 'pending']);
    setWeeklyClassesUsed(count ?? 0);
  }, [isGym, gymMembership?.status, business?.id, profile?.id]);

  useEffect(() => {
    if (isGym && gymMembership?.status === 'active') fetchWeeklyClassesUsed();
  }, [isGym, gymMembership, fetchWeeklyClassesUsed]);

  // Banner dominical para clientes estáticos
  useEffect(() => {
    if (!isGym || !gymMembership || gymMembership.client_type !== 'static') {
      setShowWeeklyBanner(false);
      return;
    }
    const now = new Date();
    const bookingDay = business?.booking_window_day ?? 0;
    const isBookingDay = now.getDay() === bookingDay;
    const openTimeStr = business?.booking_window_open_time;
    const closeTimeStr = business?.booking_window_close_time;
    if (!isBookingDay || !openTimeStr || !closeTimeStr) {
      setShowWeeklyBanner(false);
      return;
    }
    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    setShowWeeklyBanner(nowMinutes >= openMinutes && nowMinutes <= closeMinutes);
  }, [isGym, gymMembership, business]);

  const handleSendMembershipRequest = async () => {
    if (!business?.id || !profile?.id) return;
    setSendingRequest(true);
    const { error } = await supabase.from('membership_requests').insert({
      business_id: business.id,
      client_id: profile.id,
      message: membershipMessage.trim() || null,
      status: 'pending',
    });
    setSendingRequest(false);
    if (error) {
      showAlert({ title: 'Error', message: 'No se pudo enviar la solicitud. Intenta nuevamente.' });
    } else {
      setShowMembershipModal(false);
      setMembershipMessage('');
      showAlert({ title: '¡Solicitud enviada!', message: 'El gimnasio revisará tu solicitud y te asignará un plan.' });
      fetchGymMembership();
    }
  };

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

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const fetchWorkers = useCallback(async () => {
    if (!business?.id) return;
    const { data, error } = await supabase
      .from('workers')
      .select('*, profiles(avatar_url)')
      .eq('business_id', business.id);
    if (!error && data) {
      setWorkers(data.map((w: any) => ({
        id: w.id,
        name: w.name,
        color: w.color || '#D00024',
        initials: w.name.substring(0, 2).toUpperCase(),
        avatar_url: w.profiles?.avatar_url ?? null,
        specialty: w.specialty || '',
        blocks: w.blocks || [],
      })));
    }
  }, [business?.id]);

  const fetchAppointments = useCallback(async () => {
    if (!business?.id || !weekDays[0] || !weekDays[6]) return;

    const startStr = toLocalISOString(weekDays[0]);
    const endStr = toLocalISOString(weekDays[6]);

    const { data, error } = await supabase
      .from('appointments')
      .select('*, workers(name, color, profiles(avatar_url))')
      .eq('business_id', business.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .neq('status', 'cancelled');

    if (!error && data) {
      setAppointments(data.map(a => {
        const isMine = a.client_name === profile?.nickname || a.client_id === profile?.id;
        const isBlocked = a.service === 'BLOQUEO';
        return {
          id: a.id,
          isMine,
          clientName: (isMine || isBlocked) ? a.client_name : '',
          service: (isMine || isBlocked) ? a.service : 'Reservado',
          worker_id: a.worker_id,
          worker: a.workers?.name || 'Desconocido',
          workerColor: a.workers?.color || '#000',
          workerAvatarUrl: a.workers?.profiles?.avatar_url ?? null,
          startHour: Number(a.start_hour),
          durationHours: Number(a.duration_hours),
          status: a.status as any,
          date: a.date,
          price: a.price || 0,
          notes: isMine ? (a.notes || undefined) : undefined,
        };
      }));
    }
  }, [business?.id, weekDays, profile]);

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
    const channelName = `client-agenda-${business.id}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${business.id}` },
        () => { fetchAppointmentsRef.current(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [business?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWorkers(), fetchAppointments(), fetchWeeklyClassesUsed()]);
    setRefreshing(false);
  }, [fetchWorkers, fetchAppointments, fetchWeeklyClassesUsed]);

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
    if (appt.service === 'BLOQUEO') return;
    setFormVisible(true);
  }, []);

  const handleGridPress = (evt: any, workerId: string, workerName: string, workerColor: string, d: Date) => {
    const y = evt.nativeEvent.locationY;
    const clickedHourDecimal = startHour + (y / HOUR_HEIGHT);
    const startH = Math.floor(clickedHourDecimal * 2) / 2;

    setPrefillData({
      id: '',
      clientName: (profile as any)?.nickname || '',
      service: '',
      worker_id: workerId,
      worker: workerName,
      workerColor: workerColor,
      startHour: startH,
      durationHours: 1, // default 1 hour
      status: 'pending',
      date: toLocalISOString(d),
    });
    setEditingAppt(undefined);
    setFormVisible(true);
  };

  const handleAction = useCallback(async (actionId: string, appt: Appointment) => {
    if (actionId === 'cancel') {
      if (appt.date) {
        const [y, m, d] = appt.date.split('-').map(Number);
        const startH = Math.floor(appt.startHour);
        const startM = Math.round((appt.startHour % 1) * 60);
        const apptTime = new Date(y, m - 1, d, startH, startM, 0);
        const diffHours = (apptTime.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours <= 2) {
          showAlert({ title: 'No puedes cancelar', message: 'Solo puedes cancelar con al menos 2 horas de anticipación.' });
          return;
        }
      }
      const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
      if (error) showAlert({ title: 'Error', message: error.message });
      else fetchAppointments();
    } else if (actionId === 'edit') {
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
    }
  }, [fetchAppointments, showAlert]);

  const handleSaveAppt = useCallback(async (data: Partial<Appointment>): Promise<boolean> => {
    try {
      if (!business?.id) {
        showAlert({ title: 'Sin negocio', message: 'Por favor selecciona un negocio desde la pantalla Explorar.' });
        return false;
      }
      const dateStr = data.date || toLocalISOString(selectedDate);

      const newStart = data.startHour ?? 9;
      const newEnd = newStart + (data.durationHours ?? 0.5);

      // ── Validar colisiones de horario (solo citas activas) ──
      let query = supabase
        .from('appointments')
        .select('id, start_hour, duration_hours')
        .eq('worker_id', data.worker_id)
        .eq('date', dateStr)
        .in('status', ['confirmed', 'pending', 'rescheduled']);

      if (editingAppt) {
        query = query.neq('id', editingAppt.id);
      }

      const { data: existingAppts, error: fetchError } = await query;
      if (fetchError) {
        showAlert({ title: 'Error', message: `No se pudo validar disponibilidad: ${fetchError.message}` });
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
          message: 'El profesional ya tiene una cita agendada en este horario. Por favor elige otro.'
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
            message: 'El horario seleccionado se cruza con un horario de cierre o bloqueo del trabajador.'
          });
          return false;
        }
      }

      // ── Plan limit para clientes de gym (solo aplica a CLASE) ──
      if (isGym && gymMembership?.status === 'active' && profile?.id && data.service === 'CLASE') {
        const weekStart = toLocalISOString(weekDays[0]);
        const weekEnd = toLocalISOString(weekDays[6]);
        const { count } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('client_id', profile.id)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .in('status', ['confirmed', 'pending']);

        const limit = PLAN_LIMITS[gymMembership.plan] ?? 1;
        if ((count ?? 0) >= limit) {
          showAlert({
            title: 'Límite de plan alcanzado',
            message: `Tu plan ${gymMembership.plan.toUpperCase()} permite ${limit} clase${limit > 1 ? 's' : ''} por semana. Ya tienes ${count} agendada${(count ?? 0) > 1 ? 's' : ''} esta semana.`,
          });
          return false;
        }
      }

      const apptData = {
        business_id: business.id,
        worker_id: data.worker_id,
        client_id: profile?.id,
        client_name: profile?.nickname || 'Cliente',
        service: data.service || 'Servicio',
        price: data.price || 0,
        date: dateStr,
        start_hour: newStart,
        duration_hours: data.durationHours || 0.5,
        status: 'pending',
        notes: data.notes ?? null,
      };

      if (editingAppt) {
        const { error } = await supabase.from('appointments').update(apptData).eq('id', editingAppt.id);
        if (error) {
          showAlert({ title: 'Error', message: `No se pudo editar: ${error.message}` });
          return false;
        }
      } else {
        const { error } = await supabase.from('appointments').insert([apptData]);
        if (error) {
          showAlert({ title: 'Error', message: `No se pudo agendar: ${error.message}` });
          return false;
        }
      }

      fetchAppointments();
      fetchWeeklyClassesUsed();
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveAppt:', err);
      showAlert({ title: 'Error Inesperado', message: err.message || 'Ocurrió un error al procesar la cita.' });
      return false;
    }
  }, [editingAppt, business?.id, selectedDate, fetchAppointments, fetchWeeklyClassesUsed, profile, showAlert]);

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
  let colWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / Math.max(WORKERS.length, 1));
  if (WORKERS.length > 3) {
    colWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / 2.5); // scroll if > 3
  }
  const totalGridWidth = colWidth * WORKERS.length;

  const renderDayGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de columnas (trabajadores) */}
      {/* Cabecera de columnas (trabajadores) - Solo visible en scroll interno si > 3 */}
      {WORKERS.length <= 3 && (
        <View style={[appStyles.ca_workerHeader, { paddingLeft: LABEL_WIDTH + PADDING, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          {WORKERS.map(w => (
            <View key={w.id} style={[appStyles.ca_workerCol, { width: colWidth }]}>
              <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={40} showDot={true} />
              <Text style={[appStyles.ca_workerName, { color: colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
              {w.specialty ? (
                <Text style={[appStyles.ca_workerSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>{w.specialty}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Grid de tiempo */}
      <View style={[appStyles.ca_grid, { paddingLeft: PADDING }]}>
        {/* Horas Y Líneas base */}
        {hoursGrid.map(h => (
          <View key={h} style={[appStyles.ca_hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[appStyles.ca_hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[appStyles.ca_hourLine, { backgroundColor: colors.border, right: PADDING }]} />
            <View style={{
              position: 'absolute', top: HOUR_HEIGHT / 2, left: LABEL_WIDTH, right: PADDING, height: StyleSheet.hairlineWidth, backgroundColor: colors.border, opacity: 0.4
            }} />
          </View>
        ))}

        {/* Scroll Horizontal para las columnas (solo si hay más de 3) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ position: 'absolute', left: LABEL_WIDTH + PADDING, right: 0, top: 0, bottom: 0 }]} contentContainerStyle={{ width: Math.max(SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2, totalGridWidth) }}>
          {/* Header interno para cuando > 3 */}
          {WORKERS.length > 3 && (
            <View style={[appStyles.ca_workerHeader, { position: 'absolute', top: -85, left: 0, right: 0, zIndex: 10 }]}>
              {WORKERS.map((w, wi) => (
                <View key={w.id} style={[appStyles.ca_workerCol, { width: colWidth, left: wi * colWidth, position: 'absolute' }]}>
                  <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={40} showDot={true} />
                  <Text style={[appStyles.ca_workerName, { color: colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
                  {w.specialty ? (
                    <Text style={[appStyles.ca_workerSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>{w.specialty}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {WORKERS.map((w, wi) => {
            const unavailableBlocks = getUnavailableBlocks(selectedDate, business, w, startHour, endHour);
            return (
              <Pressable
                key={w.id}
                onPress={(e) => handleGridPress(e, w.id, w.name, w.color, selectedDate)}
                style={[appStyles.ca_workerColumn, { width: colWidth, left: wi * colWidth, borderLeftColor: colors.border, borderLeftWidth: wi > 0 ? StyleSheet.hairlineWidth : 0, height: (endHour - startHour) * HOUR_HEIGHT }]}
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
                  .filter(a => a.worker === w.name && a.date === selectedDateStr && a.status !== 'completed' && a.status !== 'no-show')
                  .map(appt => (
                    <AppointmentCard key={appt.id} appt={appt} columnWidth={colWidth} onPress={() => openSheet(appt)} colors={colors} isDarkMode={isDarkMode} startHour={startHour} />
                  ))}
              </Pressable>
            );
          })}
          {nowPosition !== null && (
            <View style={[appStyles.ca_nowLine, { top: nowPosition, width: totalGridWidth }]}>
              <View style={appStyles.ca_nowDot} />
              <View style={[appStyles.ca_nowBar, { backgroundColor: appColors.primary }]} />
            </View>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // ─── Vista semana: días en columnas ──────────────────────────────────────

  const weekColWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / 7);

  const renderWeekGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de días — fija, no scrollea verticalmente */}
      <View style={[appStyles.ca_workerHeader, { paddingLeft: LABEL_WIDTH + PADDING, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
        {weekDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { setSelectedDate(d); setViewMode('day'); }}
            style={[appStyles.ca_workerCol, { width: weekColWidth, alignItems: 'center' }]}
          >
            <Text style={[appStyles.ca_workerName, { color: isToday(d) ? appColors.primary : colors.textSecondary, fontWeight: isToday(d) ? '700' : '400' }]}>
              {shortDayName(d)}
            </Text>
            <View style={[appStyles.ca_weekDayNum, isToday(d) && { backgroundColor: appColors.primary }]}>
              <Text style={[appStyles.ca_weekDayNumText, { color: isToday(d) ? '#111827' : colors.textPrimary }]}>
                {d.getDate()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[appStyles.ca_grid, { paddingHorizontal: PADDING }]}>
        {hoursGrid.map(h => (
          <View key={h} style={[appStyles.ca_hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[appStyles.ca_hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[appStyles.ca_hourLine, { backgroundColor: colors.border }]} />
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
        <View style={[appStyles.ca_columnsOverlay, { left: LABEL_WIDTH + PADDING }]}>
          {weekDays.map((d, di) => {
            const dateStr = toLocalISOString(d);
            const w = WORKERS.length > 0 ? WORKERS[0] : null;
            const unavailableBlocks = w ? getUnavailableBlocks(d, business, w, startHour, endHour) : [];

            return (
              <Pressable
                key={di}
                onPress={(e) => handleGridPress(e, w ? w.id : '', w ? w.name : '', w ? w.color : '', d)}
                style={[
                  appStyles.ca_workerColumn,
                  {
                    width: weekColWidth,
                    left: di * weekColWidth,
                    borderLeftColor: colors.border,
                    borderLeftWidth: di > 0 ? StyleSheet.hairlineWidth : 0,
                    backgroundColor: isToday(d) ? appColors.primary + '06' : 'transparent',
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
            <View style={[appStyles.ca_nowLine, { top: nowPosition, width: 7 * weekColWidth }]}>
              <View style={appStyles.ca_nowDot} />
              <View style={[appStyles.ca_nowBar, { backgroundColor: appColors.primary }]} />
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
      <View style={[appStyles.ca_header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={appStyles.ca_iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Toggle Día / Semana — glass */}
        <View style={[appStyles.ca_toggle, {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        }]}>
          {(['day', 'week'] as ViewMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[appStyles.ca_toggleBtn, viewMode === m && { backgroundColor: appColors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[appStyles.ca_toggleLabel, { color: viewMode === m ? '#111827' : colors.textSecondary }]}>
                {m === 'day' ? 'Día' : 'Semana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={toggleTheme} style={appStyles.ca_iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Título del negocio (Liquid Glass) ────────────────────── */}
      {business && (
        <View style={[appStyles.ca_businessHeader, {
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        }]}>
          <View style={{ flex: 1 }}>
            <Text style={[appStyles.ca_businessHeaderLabel, { color: colors.textSecondary }]}>NEGOCIO</Text>
            <Text style={[appStyles.ca_businessHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {business.name.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* ── Indicador de clases semanales (solo gym con membresía activa) ── */}
      {isGym && gymMembership?.status === 'active' && (() => {
        const limit = PLAN_LIMITS[gymMembership.plan] ?? 1;
        const used = Math.min(weeklyClassesUsed, limit);
        const pct = limit > 0 ? (used / limit) * 100 : 0;
        const isFull = used >= limit;
        return (
          <View style={[appStyles.ca_gymClassesBanner, {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[appStyles.ca_gymClassesLabel, { color: colors.textPrimary }]}>
                Plan {gymMembership.plan.toUpperCase()} · {used}/{limit} clases
              </Text>
              <View style={[appStyles.ca_gymClassesTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={[appStyles.ca_gymClassesFill, {
                  width: `${pct}%`,
                  backgroundColor: isFull ? '#E24B4A' : appColors.primary,
                }]} />
              </View>
            </View>
            <Text style={[appStyles.ca_gymClassesWeekLabel, { color: isFull ? '#E24B4A' : colors.textSecondary }]}>
              {isFull ? 'Límite alcanzado' : 'esta semana'}
            </Text>
          </View>
        );
      })()}

      {/* ── Selector de fecha (modo día) ────────────────────────── */}
      {viewMode === 'day' && (

        <View style={appStyles.ca_dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-1)} style={appStyles.ca_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[appStyles.ca_dateLabel, { color: colors.textPrimary }]}>
            {formatDateLabel(selectedDate)}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(1)} style={appStyles.ca_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Selector de semana (modo semana) ────────────────────── */}
      {viewMode === 'week' && (
        <View style={appStyles.ca_dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-7)} style={appStyles.ca_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[appStyles.ca_dateLabel, { color: colors.textPrimary }]}>
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][selectedDate.getMonth()]}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(7)} style={appStyles.ca_navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtro por trabajador ─────────────────────────────────── */}
      {viewMode === 'day' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={appStyles.ca_workerFilters} contentContainerStyle={appStyles.ca_workerFiltersContent}>
          <TouchableOpacity
            style={[appStyles.ca_filterChip,
            !selectedWorkerFilter
              ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
              : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            ]}
            onPress={() => setSelectedWorkerFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={[appStyles.ca_filterChipText, !selectedWorkerFilter ? { color: '#111827' } : { color: colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
          {workers.map(w => (
            <TouchableOpacity
              key={w.id}
              style={[appStyles.ca_filterChip,
              selectedWorkerFilter === w.name
                ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
                : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
              ]}
              onPress={() => setSelectedWorkerFilter(w.name)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={25} showDot={false} />
                <Text style={[appStyles.ca_filterChipText, selectedWorkerFilter === w.name ? { color: '#111827' } : { color: colors.textSecondary }]}>{w.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flexGrow: 0 }}
          showsVerticalScrollIndicator={false}
          horizontal
          contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: 15, paddingBottom: 10, gap: 20 }}
        >
          {workers.map(w => {
            const isSelected = selectedWorkerFilter === w.name;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSelectedWorkerFilter(w.name)}
                activeOpacity={0.75}
                style={{ alignItems: 'center', gap: 5, opacity: isSelected ? 1 : 0.45 }}
              >
                <WorkerAvatar avatarUrl={w.avatar_url} name={w.name} color={w.color} size={90} showDot={isSelected} />
                <Text style={[appStyles.ca_workerName, { color: isSelected ? w.color : colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
                {w.specialty ? (
                  <Text style={[appStyles.ca_workerSpecialty, { color: colors.textSecondary }]} numberOfLines={1}>{w.specialty}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Stats row (Liquid Glass) — solo en vista día ────────── */}
      {viewMode === 'day' && (
        <View style={appStyles.ca_statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={[appStyles.ca_statCard, {
              backgroundColor: i === 0
                ? (isDarkMode ? 'rgba(180,247,54,0.10)' : 'rgba(180,247,54,0.07)')
                : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              borderColor: i === 0
                ? 'rgba(180,247,54,0.28)'
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            }]}>
              <Text style={[appStyles.ca_statValue, { color: i === 0 ? appColors.primary : colors.textPrimary }]}>
                {s.value}
              </Text>
              <Text style={[appStyles.ca_statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Banner dominical para clientes estáticos ────────────── */}
      {showWeeklyBanner && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowWeeklyModal(true)}
          style={[appStyles.ca_weeklyBanner, { backgroundColor: appColors.primary }]}
        >
          <Feather name="calendar" size={16} color="#fff" />
          <Text style={appStyles.ca_weeklyBannerText}>¡Hoy puedes elegir tus clases de la semana!</Text>
          <Feather name="chevron-right" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={[appStyles.ca_gridContainer, { borderTopColor: colors.border }]}>
        {viewMode === 'day' ? renderDayGrid() : renderWeekGrid()}

        {isSuspended && (
          <View style={[appStyles.ca_suspensionBadge, { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }]}>
            <Feather name="alert-circle" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>NEGOCIO TEMPORALMENTE SUSPENDIDO</Text>
          </View>
        )}
      </View>

      {/* ── FAB / Gym membership CTA ─────────────────────────────── */}
      {!isSuspended && (() => {
        // Negocio normal: FAB estándar
        if (!isGym) {
          return (
            <TouchableOpacity
              style={[appStyles.ca_fab, { backgroundColor: appColors.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                if (!business?.id) {
                  showAlert({ title: 'Sin negocio', message: 'Debes seleccionar un negocio desde la pantalla Explorar.' });
                  return;
                }
                setEditingAppt(undefined);
                setFormVisible(true);
              }}
            >
              <Feather name="plus" size={24} color="#111827" />
            </TouchableOpacity>
          );
        }

        // Gym: cargando estado de membresía
        if (gymMembershipLoading) {
          return (
            <View style={[appStyles.ca_fab, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={appColors.primary} />
            </View>
          );
        }

        // Gym: membresía activa → puede reservar
        if (gymMembership?.status === 'active') {
          return (
            <TouchableOpacity
              style={[appStyles.ca_fab, { backgroundColor: appColors.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                setEditingAppt(undefined);
                setFormVisible(true);
              }}
            >
              <Feather name="plus" size={24} color="#111827" />
            </TouchableOpacity>
          );
        }

        // Gym: solicitud pendiente
        if (membershipRequest?.status === 'pending') {
          return (
            <View style={[appStyles.ca_membershipBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="clock" size={16} color="#F0A030" />
              <Text style={[appStyles.ca_membershipBadgeText, { color: colors.textSecondary }]}>Solicitud pendiente de aprobación</Text>
            </View>
          );
        }

        // Gym: solicitud rechazada o sin solicitud → botón para solicitar
        return (
          <TouchableOpacity
            style={[appStyles.ca_membershipBtn, { backgroundColor: appColors.primary }]}
            activeOpacity={0.85}
            onPress={() => setShowMembershipModal(true)}
          >
            <Feather name="user-plus" size={18} color="#111827" />
            <Text style={appStyles.ca_membershipBtnText}>
              {membershipRequest?.status === 'rejected' ? 'Volver a solicitar membresía' : 'Solicitar membresía'}
            </Text>
          </TouchableOpacity>
        );
      })()}

      {/* ── Modal Formulario ─────────────────────────────────────── */}
      <AppointmentFormModal
        visible={formVisible}
        role="client"
        initialData={editingAppt || prefillData}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveAppt}
        businessId={business?.id || ''}
        workers={workers}
        selectedDateStr={selectedDateStr}
        openingHour={business?.opening_time ? parseInt(business.opening_time.split(':')[0], 10) : 7}
        closingHour={business?.closing_time ? parseInt(business.closing_time.split(':')[0], 10) : 22}
        isGym={isGym}
        showAlert={showAlert}
        colors={{ ...colors, textPrimary: colors.textPrimary, textSecondary: colors.textSecondary, border: colors.border }}
      />

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      <AppointmentSheet
        appt={selectedAppt}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleAction}
        colors={colors}
        isDarkMode={isDarkMode}
      />

      {/* ── Modal: Solicitud de membresía ────────────────────────── */}
      <Modal visible={showMembershipModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMembershipModal(false)}>
          <View style={appStyles.ca_modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[appStyles.ca_membershipModalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[appStyles.ca_membershipModalTitle, { color: colors.textPrimary }]}>Unirme a {business?.name}</Text>
                <Text style={[appStyles.ca_membershipModalSub, { color: colors.textSecondary }]}>
                  El gimnasio revisará tu solicitud y te asignará un tipo de membresía y plan. Tu cita quedará pendiente de confirmación.
                </Text>
                <Text style={[{ fontSize: 12, color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 }]}>MENSAJE OPCIONAL</Text>
                <TextInput
                  style={[appStyles.ca_membershipInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder="Cuéntale algo al gimnasio (objetivos, experiencia...)"
                  placeholderTextColor={colors.textSecondary}
                  value={membershipMessage}
                  onChangeText={setMembershipMessage}
                  multiline
                  maxLength={200}
                />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                  <TouchableOpacity
                    style={[appStyles.ca_membershipModalBtn, { borderColor: colors.border }]}
                    onPress={() => setShowMembershipModal(false)}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[appStyles.ca_membershipModalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary, flex: 1 }]}
                    onPress={handleSendMembershipRequest}
                    disabled={sendingRequest}
                  >
                    {sendingRequest
                      ? <ActivityIndicator size="small" color="#111827" />
                      : <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' }}>Enviar solicitud</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal: Selección semanal de clases (clientes estáticos) ─ */}
      <Modal visible={showWeeklyModal} transparent animationType="slide">
        <View style={[appStyles.ca_modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <BlurView intensity={isDarkMode ? 60 : 80} tint={isDarkMode ? 'dark' : 'light'} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
            <View style={[appStyles.ca_weeklyModalContent, { backgroundColor: isDarkMode ? 'rgba(15,15,20,0.7)' : 'rgba(255,255,255,0.6)', borderColor: colors.border }]}>
              <View style={[appStyles.ca_sheetHandle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', alignSelf: 'center' }]} />
              <Text style={[appStyles.ca_membershipModalTitle, { color: colors.textPrimary, marginBottom: 6 }]}>Clases de la semana</Text>
              <Text style={[appStyles.ca_membershipModalSub, { color: colors.textSecondary, marginBottom: 16 }]}>
                Plan {gymMembership?.plan?.toUpperCase()} · Puedes elegir hasta {PLAN_LIMITS[gymMembership?.plan ?? 'basic']} clase{PLAN_LIMITS[gymMembership?.plan ?? 'basic'] > 1 ? 's' : ''} esta semana.
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                {weekDays.map((d, i) => {
                  const dateStr = toLocalISOString(d);
                  const dayAppts = appointments.filter(a => a.date === dateStr && a.isMine);
                  const isTodayOrPast = d <= new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <View key={i} style={[appStyles.ca_weeklyDayRow, { borderColor: colors.border, opacity: isTodayOrPast ? 0.4 : 1 }]}>
                      <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, width: 80 }]}>
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]} {d.getDate()}
                      </Text>
                      {dayAppts.length > 0
                        ? dayAppts.map(a => (
                          <View key={a.id} style={[appStyles.ca_weeklyApptChip, { backgroundColor: appColors.primary + '22', borderColor: appColors.primary + '44' }]}>
                            <Text style={{ fontSize: 11, color: appColors.primary }}>{formatHour(a.startHour)} · {a.service}</Text>
                          </View>
                        ))
                        : !isTodayOrPast && (
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>Sin clase agendada</Text>
                        )}
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[appStyles.ca_membershipModalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary, marginTop: 16, alignSelf: 'stretch', alignItems: 'center' }]}
                onPress={() => {
                  setShowWeeklyModal(false);
                  setEditingAppt(undefined);
                  setFormVisible(true);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Agendar nueva clase</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setShowWeeklyModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

