import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import TimeWheelPicker from '../../../../components/TimeWheelPicker';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useAlert } from '../../../../context/AlertContext';
import { supabase } from '../../../../lib/supabase';
import { appColors } from '../../../../styles/appStyles';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Configuración de idioma para el calendario
if (LocaleConfig) {
  LocaleConfig.locales['es'] = {
    monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
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
};

type Worker = {
  id: string;
  name: string;
  color: string;
  initials: string;
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
  const mm = h % 1 === 0.5 ? '30' : '00';
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

function getPastelColor(id: string, isDarkMode: boolean, alpha: number = 1) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = isDarkMode ? 45 : 65;
  const l = isDarkMode ? 25 : 85;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
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

  const pastelColor = getPastelColor(appt.id, isDarkMode, isDarkMode ? 0.6 : 0.85);
  const pastelBorder = getPastelColor(appt.id, isDarkMode, 1);

  const glassColor = isBlocked
    ? (isDarkMode ? 'rgba(60,60,60,0.6)' : 'rgba(220,220,220,0.7)')
    : pastelColor;

  const glassBorder = isBlocked
    ? (isDarkMode ? 'rgba(120,120,120,0.3)' : 'rgba(160,160,160,0.4)')
    : pastelBorder;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.apptCard,
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
      <View style={[styles.apptDot, { backgroundColor: isBlocked ? (isDarkMode ? '#555555' : '#999999') : status.dot }]} />
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Text style={[styles.apptTitle, { color: isBlocked ? (isDarkMode ? '#AAAAAA' : '#999999') : colors.textPrimary }]} numberOfLines={1}>
          {isBlocked ? (appt.clientName || 'No disponible') : appt.service}
        </Text>
        {!isShort && !isBlocked && (
          <Text style={[styles.apptSub, { color: colors.textSecondary }]} numberOfLines={1}>
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

  const ACTIONS = isBlocked ? [
    { id: 'cancel', icon: 'unlock', label: 'Desbloquear', color: '#E24B4A' },
  ] : [
    { id: 'confirm', icon: 'check-circle', label: 'Confirmar', color: '#3D9E5A' },
    { id: 'complete', icon: 'check-square', label: isGym ? 'Asistió' : 'Completar', color: '#5C90D2' },
    { id: 'rescheduled', icon: 'clock', label: 'Reprogramar', color: '#F39C12' },
    { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
    { id: 'no-show', icon: 'user-x', label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
    { id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' },
  ];

  return (
    <View 
      style={[
        StyleSheet.absoluteFill, 
        { zIndex: 1000, pointerEvents: visible ? 'auto' : 'none' },
        !visible && { opacity: 0 }
      ]}
    >
      <Animated.View style={[styles.sheetOverlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideY }], overflow: 'hidden' }]}
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
        <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />

        {/* Info principal */}
        <View style={styles.sheetTop}>
          <View style={[styles.sheetWorkerDot, { backgroundColor: appt.workerColor }]}>
            <Text style={styles.sheetWorkerInitial}>{appt.worker[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetService, { color: colors.textPrimary }]}>{appt.service}</Text>
            <Text style={[styles.sheetClient, { color: colors.textSecondary }]}>{appt.clientName}</Text>
          </View>
          <View style={[styles.sheetBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.sheetBadgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* Detalles */}
        <View style={[styles.sheetDetails, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.sheetDetailRow}>
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={[styles.sheetDetailText, { color: colors.textSecondary }]}>
              {formatHour(appt.startHour)} – {formatHour(endHour)}
              {'  ·  '}{appt.durationHours * 60} min
            </Text>
          </View>
          <View style={styles.sheetDetailRow}>
            <Feather name="user" size={14} color={colors.textSecondary} />
            <Text style={[styles.sheetDetailText, { color: colors.textSecondary }]}>
              {appt.worker}
            </Text>
          </View>
        </View>

        {/* Acciones rápidas */}
        <View style={styles.sheetActions}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={styles.sheetAction} activeOpacity={0.7} onPress={() => { onClose(); onAction(a.id, appt); }}>
              <View style={[styles.sheetActionIcon, { backgroundColor: a.color + '18' }]}>
                <Feather name={a.icon as any} size={18} color={a.color} />
              </View>
              <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Componente: Formulario Cita ──────────────────────────────────────────────

function AppointmentFormModal({
  visible,
  initialData,
  onClose,
  onSave,
  colors,
  selectedDateStr,
  showAlert,
  openingHour,
  closingHour,
}: {
  visible: boolean;
  initialData?: Appointment;
  onClose: () => void;
  onSave: (appt: Partial<Appointment>) => Promise<boolean>;
  colors: any;
  selectedDateStr: string;
  showAlert: (opts: { title: string; message: string }) => void;
  openingHour: number;
  closingHour: number;
}) {
  const { isDarkMode } = useTheme();
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [dateText, setDateText] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busyIntervals, setBusyIntervals] = useState<Array<{ start: number; end: number }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [endSlot, setEndSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const formScrollRef = useRef<any>(null);

  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!visible || !colors.businessId) return;

      try {
        // Intentar obtener servicios de business_services
        const { data: bizServices, error: bizError } = await supabase
          .from('business_services')
          .select('name, price')
          .eq('business_id', colors.businessId)
          .eq('is_active', true);

        if (!bizError && bizServices && bizServices.length > 0) {
          setServices(bizServices);
        } else {
          // Fallback: Si no hay servicios configurados, usar los del catálogo para la categoría
          const { data: bizData } = await supabase
            .from('businesses')
            .select('category_id')
            .eq('id', colors.businessId)
            .single();

          if (bizData?.category_id) {
            const { data: catServices } = await supabase
              .from('catalog_services')
              .select('name')
              .eq('category_id', bizData.category_id);
            
            if (catServices && catServices.length > 0) {
              setServices(catServices.map(s => ({ id: s.name, name: s.name, price: 0 })));
            } else {
              setServices([
                { id: 'p1', name: 'Servicio 1', price: 0 },
                { id: 'p2', name: 'Servicio 2', price: 0 },
                { id: 'p3', name: 'Servicio 3', price: 0 }
              ]);
            }
          } else {
            setServices([
              { id: 'p1', name: 'Servicio 1', price: 0 },
              { id: 'p2', name: 'Servicio 2', price: 0 },
              { id: 'p3', name: 'Servicio 3', price: 0 }
            ]);
          }
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setServices([
          { id: 'p1', name: 'Servicio 1', price: 0 },
          { id: 'p2', name: 'Servicio 2', price: 0 },
          { id: 'p3', name: 'Servicio 3', price: 0 }
        ]);
      }
    };

    fetchServices();
  }, [visible, colors.businessId]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setClientName(initialData.clientName);
        setService(initialData.service);
        setWorkerId(initialData.worker_id);
        const hh = Math.floor(initialData.startHour);
        const mm = Math.round((initialData.startHour - hh) * 60);
        setSelectedSlot(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
        const endH = initialData.startHour + initialData.durationHours;
        const endHh = Math.floor(endH);
        const endMm = Math.round(((endH - endHh) * 60) / 15) * 15;
        setEndSlot(`${String(endHh).padStart(2, '0')}:${String(Math.min(endMm, 45)).padStart(2, '0')}`);
        setDateText(initialData.date || selectedDateStr);
        setIsBlocking(initialData.service === 'BLOQUEO');
      } else {
        setClientName('');
        setService('');
        setWorkerId('');
        setSelectedSlot(`${String(openingHour).padStart(2, '0')}:00`);
        setEndSlot(`${String(Math.min(openingHour + 1, closingHour - 1)).padStart(2, '0')}:00`);
        setDateText(selectedDateStr);
        setIsBlocking(false);
      }
      setLoading(false);
      setShowCalendar(false);
    }
  }, [visible, initialData, selectedDateStr]);

  // Genera todos los slots de 15 min dentro del horario del negocio
  const allSlots = useMemo(() => {
    const slots: string[] = [];
    let current = openingHour * 60;
    const end = closingHour * 60;
    while (current < end) {
      const hh = Math.floor(current / 60);
      const mm = current % 60;
      slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      current += 15;
    }
    return slots;
  }, [openingHour, closingHour]);

  // Descarga los turnos ocupados del worker+fecha seleccionados
  useEffect(() => {
    if (!workerId || !dateText || !colors.businessId) {
      setBusyIntervals([]);
      return;
    }
    setSlotsLoading(true);
    supabase
      .from('appointments')
      .select('id, start_hour, duration_hours')
      .eq('business_id', colors.businessId)
      .eq('worker_id', workerId)
      .eq('date', dateText)
      .then(({ data }) => {
        const intervals = (data ?? [])
          .filter((a: any) => a.id !== initialData?.id)
          .map((a: any) => ({ start: Number(a.start_hour), end: Number(a.start_hour) + Number(a.duration_hours) }));
        setBusyIntervals(intervals);
        setSlotsLoading(false);
      });
  }, [workerId, dateText, colors.businessId, initialData?.id]);

  const isPastSlot = useCallback((slot: string, today: string, date: string) => {
    if (date !== today) return false;
    const [hh, mm] = slot.split(':').map(Number);
    const slotHour = hh + mm / 60;
    const now = new Date();
    return slotHour < (now.getHours() + now.getMinutes() / 60);
  }, []);

  const handleSave = async () => {
    if (loading) return;
    // ── Validación de campos obligatorios ──────────────────────────────
    if (!isBlocking) {
      if (!clientName.trim()) {
        showAlert({ title: 'Campo requerido', message: 'Por favor ingresa el nombre del cliente.' });
        return;
      }
      if (!service.trim()) {
        showAlert({ title: 'Campo requerido', message: 'Por favor ingresa el servicio a realizar.' });
        return;
      }
    }
    if (!workerId) {
      showAlert({ title: 'Campo requerido', message: 'Por favor selecciona un trabajador.' });
      return;
    }
    if (!dateText.trim()) {
      showAlert({ title: 'Campo requerido', message: 'Por favor ingresa la fecha de la cita.' });
      return;
    }
    if (!selectedSlot) {
      showAlert({ title: 'Hora requerida', message: 'Por favor selecciona la hora de inicio.' });
      return;
    }
    if (!endSlot) {
      showAlert({ title: 'Hora requerida', message: 'Por favor selecciona la hora de fin.' });
      return;
    }

    const [hhStr, mmStr] = selectedSlot.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr || '0', 10);
    const startHour = hh + mm / 60;
    const [ehStr, emStr] = endSlot.split(':');
    const endHourCalc = parseInt(ehStr, 10) + parseInt(emStr || '0', 10) / 60;
    if (endHourCalc <= startHour) {
      showAlert({ title: 'Hora inválida', message: 'La hora de fin debe ser posterior a la de inicio.' });
      return;
    }

    const now = new Date();
    const todayStr = toLocalISOString(now);

    if (dateText < todayStr) {
      showAlert({ title: 'Fecha inválida', message: 'No puedes agendar citas para fechas que ya pasaron.' });
      return;
    }

    setLoading(true);
    const selectedServiceObj = services.find(s => s.name === (service || 'Servicio'));
    const price = selectedServiceObj ? Number(selectedServiceObj.price || 0) : 0;

    const success = await onSave({
      clientName: isBlocking ? (clientName || 'No disponible') : clientName,
      service: isBlocking ? 'BLOQUEO' : service,
      worker_id: workerId,
      startHour,
      durationHours: endHourCalc - startHour,
      date: dateText,
      price,
    });
    setLoading(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1400);
    }
  };

  if (!visible) return null;

  const durationForPicker = (() => {
    if (!selectedSlot || !endSlot) return 60;
    const [sh, sm] = selectedSlot.split(':').map(Number);
    const [eh, em] = endSlot.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(15, diff);
  })();

  const glassInput = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    marginBottom: 4,
  };

  const todayStr = toLocalISOString(new Date());

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', padding: 0 }]}>

          {/* ── Estado de éxito ─────────────────────────────────── */}
          {showSuccess && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}>
              <View style={[formStyles.successCard, { overflow: 'hidden' }]}>
                <BlurView
                  intensity={isDarkMode ? 70 : 85}
                  tint={isDarkMode ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, {
                  backgroundColor: isDarkMode ? 'rgba(12,18,12,0.5)' : 'rgba(240,255,240,0.5)',
                  borderRadius: 24,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(61,158,90,0.4)',
                }]} />
                <Feather name="check-circle" size={52} color="#3D9E5A" />
                <Text style={[formStyles.successTitle, { color: colors.textPrimary }]}>¡Listo!</Text>
                <Text style={[formStyles.successSub, { color: colors.textSecondary }]}>
                  {isBlocking ? 'Horario bloqueado' : 'Cita agendada'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Bottom sheet glass ──────────────────────────────── */}
          <View style={[formStyles.sheet, { overflow: 'hidden' }]}>
            <BlurView
              intensity={isDarkMode ? 65 : 85}
              tint={isDarkMode ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
            />
            <View style={[StyleSheet.absoluteFill, {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: isDarkMode ? 'rgba(10,10,16,0.6)' : 'rgba(248,248,252,0.55)',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }]} />

            {/* Handle */}
            <View style={[formStyles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)' }]} />

            <ScrollView ref={formScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>

              {/* Header */}
              <View style={formStyles.header}>
                <Text style={[formStyles.title, { color: colors.textPrimary }]}>
                  {initialData ? 'Editar cita' : isBlocking ? 'Bloquear horario' : 'Nueva cita'}
                </Text>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={formStyles.closeBtn}>
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Toggle bloqueo */}
              {!initialData && (
                <TouchableOpacity
                  onPress={() => { setIsBlocking(!isBlocking); setClientName(''); }}
                  style={[formStyles.blockToggle, { borderColor: isBlocking ? 'rgba(227,25,55,0.4)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'), backgroundColor: isBlocking ? 'rgba(227,25,55,0.1)' : 'transparent' }]}
                  activeOpacity={0.7}
                >
                  <View style={[formStyles.checkbox, { borderColor: isBlocking ? appColors.primary : colors.textSecondary, backgroundColor: isBlocking ? appColors.primary : 'transparent' }]}>
                    {isBlocking && <Feather name="lock" size={10} color="#fff" />}
                  </View>
                  <Text style={[formStyles.blockToggleText, { color: isBlocking ? appColors.primary : colors.textSecondary }]}>
                    Bloquear este horario
                  </Text>
                </TouchableOpacity>
              )}

              {/* Input principal: cliente o razón de bloqueo */}
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>
                {isBlocking ? 'RAZÓN (OPCIONAL)' : 'CLIENTE'}
              </Text>
              <TextInput
                style={[glassInput, { color: colors.textPrimary, justifyContent: 'flex-start' } as any]}
                value={clientName}
                onChangeText={setClientName}
                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                placeholder={isBlocking ? 'Ej: Colación, Descanso...' : 'Nombre del cliente'}
              />

              {/* Servicios */}
              {!isBlocking && (
                <>
                  <Text style={[formStyles.label, { color: colors.textSecondary }]}>SERVICIO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
                    {services.map((s, index) => (
                      <TouchableOpacity
                        key={s.id || `${s.name}-${index}`}
                        onPress={() => setService(s.name)}
                        style={[formStyles.serviceChip, {
                          backgroundColor: service === s.name ? appColors.primary : (isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                          borderColor: service === s.name ? appColors.primary : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                        }]}
                      >
                        <Text style={[formStyles.serviceChipText, { color: service === s.name ? '#fff' : colors.textSecondary }]}>
                          {s.name}{s.price > 0 ? `  $${Number(s.price).toLocaleString('es-CL')}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Profesional — círculos de color */}
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>PROFESIONAL</Text>
              <View style={formStyles.workerRow}>
                {colors.workersList?.map((w: any) => {
                  const selected = workerId === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setWorkerId(w.id)}
                      activeOpacity={0.8}
                      style={[formStyles.workerCircle, {
                        backgroundColor: w.color ?? appColors.primary,
                        borderWidth: selected ? 3 : 1.5,
                        borderColor: selected ? '#fff' : (w.color ?? appColors.primary) + '80',
                        shadowColor: selected ? (w.color ?? appColors.primary) : 'transparent',
                        shadowOpacity: 0.7,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 0 },
                      }]}
                    >
                      <Text style={formStyles.workerInitial}>
                        {w.name?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {colors.workersList && !!workerId ? (
                <Text style={[formStyles.workerName, { color: colors.textSecondary }]}>
                  {colors.workersList.find((w: any) => w.id === workerId)?.name ?? ''}
                </Text>
              ) : null}

              {/* Fecha */}
              <Text style={[formStyles.label, { color: colors.textSecondary }]}>FECHA</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(!showCalendar)}
                style={glassInput}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="calendar" size={15} color={colors.textSecondary} />
                  <Text style={{ color: colors.textPrimary, fontSize: 15 }}>
                    {dateText || 'Seleccionar fecha'}
                  </Text>
                </View>
                <Feather name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Calendario inline */}
              {showCalendar && (
                <View style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                  <Calendar
                    minDate={todayStr}
                    onDayPress={(day: any) => { setDateText(day.dateString); setShowCalendar(false); }}
                    markedDates={dateText ? { [dateText]: { selected: true, selectedColor: appColors.primary } } : {}}
                    theme={{
                      backgroundColor: 'transparent',
                      calendarBackground: 'transparent',
                      textSectionTitleColor: colors.textSecondary,
                      selectedDayBackgroundColor: appColors.primary,
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: appColors.primary,
                      dayTextColor: colors.textPrimary,
                      textDisabledColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                      monthTextColor: colors.textPrimary,
                      arrowColor: appColors.primary,
                    }}
                  />
                </View>
              )}

              {/* Pickers DESDE / HASTA — side by side */}
              {(!workerId || !dateText) && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 2 }}>
                  {!workerId ? '· Selecciona un profesional para ver disponibilidad' : '· Selecciona una fecha para ver disponibilidad'}
                </Text>
              )}
              {slotsLoading && workerId && dateText && (
                <ActivityIndicator size="small" color={appColors.primary} style={{ alignSelf: 'center', marginVertical: 4 }} />
              )}
              <View
                style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}
                onTouchStart={() => formScrollRef.current?.setNativeProps({ scrollEnabled: false })}
                onTouchEnd={() => setTimeout(() => formScrollRef.current?.setNativeProps({ scrollEnabled: true }), 600)}
                onTouchCancel={() => formScrollRef.current?.setNativeProps({ scrollEnabled: true })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[formStyles.label, { color: colors.textSecondary, marginBottom: 4 }]}>DESDE</Text>
                  <TimeWheelPicker
                    openingHour={openingHour}
                    closingHour={closingHour}
                    selectedSlot={selectedSlot}
                    onSlotSelect={setSelectedSlot}
                    busyIntervals={workerId && dateText ? busyIntervals : []}
                    durationMinutes={durationForPicker}
                    isDarkMode={isDarkMode}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[formStyles.label, { color: colors.textSecondary, marginBottom: 4 }]}>HASTA</Text>
                  <TimeWheelPicker
                    openingHour={openingHour}
                    closingHour={closingHour}
                    selectedSlot={endSlot}
                    onSlotSelect={setEndSlot}
                    busyIntervals={[]}
                    durationMinutes={0}
                    isDarkMode={isDarkMode}
                  />
                </View>
              </View>

              {/* Botón principal */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[formStyles.saveBtn, { backgroundColor: appColors.primary, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={formStyles.saveBtnText}>{initialData ? 'GUARDAR CAMBIOS' : isBlocking ? 'BLOQUEAR' : 'CONFIRMAR CITA'}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 12 }} activeOpacity={0.6}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, letterSpacing: 0.5 }}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CompanyAgendaScreen() {
  const { business } = useAuth();
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

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profileWorker, setProfileWorker] = useState<Worker | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const fetchWorkers = useCallback(async () => {
    if (!business?.id) return;
    const { data, error } = await supabase.from('workers').select('*').eq('business_id', business.id);
    if (!error && data) {
      setWorkers(data.map(w => ({
        id: w.id,
        name: w.name,
        color: w.color || '#D00024',
        initials: w.name.substring(0, 2).toUpperCase(),
      })));
    }
  }, [business?.id]);

  const fetchAppointments = useCallback(async () => {
    if (!business?.id || !weekDays[0] || !weekDays[6]) return;

    const startStr = weekDays[0].toISOString().split('T')[0];
    const endStr = weekDays[6].toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('*, workers(name, color)')
      .eq('business_id', business.id)
      .gte('date', startStr)
      .lte('date', endStr);

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
      })));
    }
  }, [business?.id, weekDays]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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
      if (!error) fetchAppointments();
    } else if (actionId === 'complete') {
      const { error } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', appt.id);
      if (!error) fetchAppointments();
    } else if (actionId === 'rescheduled') {
      const { error } = await supabase.from('appointments').update({ status: 'rescheduled' }).eq('id', appt.id);
      if (!error) fetchAppointments();
    } else if (actionId === 'no-show') {
      const { error } = await supabase.from('appointments').update({ status: 'no-show' }).eq('id', appt.id);
      if (!error) fetchAppointments();
    } else if (actionId === 'cancel') {
      const { error } = await supabase.from('appointments').delete().eq('id', appt.id);
      if (!error) fetchAppointments();
    } else if (actionId === 'edit') {
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
    }
  }, [fetchAppointments]);

  const handleSaveAppt = useCallback(async (data: Partial<Appointment>): Promise<boolean> => {
    try {
      if (!business?.id) {
        showAlert({ title: 'Error', message: 'No se ha seleccionado ningún negocio.' });
        return false;
      }
      const dateStr = data.date || toLocalISOString(selectedDate);

      const newStart = data.startHour || 9;
      const newEnd = newStart + (data.durationHours || 0.5);

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

      const apptData = {
        business_id: business.id,
        worker_id: data.worker_id,
        client_name: data.clientName || 'Sin nombre',
        service: data.service || 'Servicio',
        price: data.price || 0, // El precio ya viene calculado del modal
        date: dateStr,
        start_hour: newStart,
        duration_hours: data.durationHours || 0.5,
        status: 'pending',
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

  const renderDayGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de columnas (trabajadores) */}
      <View style={[styles.workerHeader, { paddingLeft: LABEL_WIDTH + PADDING }]}>
        {WORKERS.map(w => {
          const todayAppts = appointments.filter(a => a.worker === w.name && a.date === toLocalISOString(selectedDate)).length;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.workerCol, { width: colWidth }]}
              onPress={() => { setProfileWorker(w); setProfileVisible(true); }}
              activeOpacity={0.75}
            >
              <View style={styles.workerAvatarWrapper}>
                <View style={[styles.workerAvatar, { backgroundColor: w.color + '25', borderColor: w.color }]}>
                  <Text style={[styles.workerInitials, { color: w.color }]}>{w.initials}</Text>
                </View>
                <View style={[styles.workerActiveDot, { backgroundColor: '#4CAF50' }]} />
              </View>
              <Text style={[styles.workerName, { color: colors.textPrimary }]} numberOfLines={1}>{w.name}</Text>
              {todayAppts > 0 && (
                <Text style={[styles.workerApptCount, { color: w.color }]}>{todayAppts} cita{todayAppts > 1 ? 's' : ''}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid de tiempo */}
      <View style={[styles.grid, { paddingHorizontal: PADDING }]}>
        {/* Líneas de hora */}
        {hoursGrid.map(h => (
          <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
          </View>
        ))}

        {/* Columnas de citas por trabajador */}
        <View style={[styles.columnsOverlay, { left: LABEL_WIDTH }]}>
          {WORKERS.map((w, wi) => (
            <View
              key={w.id}
              style={[
                styles.workerColumn,
                {
                  width: colWidth,
                  left: wi * colWidth,
                  borderLeftColor: colors.border,
                  borderLeftWidth: wi > 0 ? StyleSheet.hairlineWidth : 0,
                  height: (endHour - startHour) * HOUR_HEIGHT,
                },
              ]}
            >
              {filteredAppointments
                .filter(a => a.worker === w.name && a.date === selectedDateStr)
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
            </View>
          ))}

          {/* Línea "ahora" */}
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

  // ─── Vista semana: días en columnas ──────────────────────────────────────

  const weekColWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / 7);

  const renderWeekGrid = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Cabecera de días */}
      <View style={[styles.workerHeader, { paddingLeft: LABEL_WIDTH + PADDING }]}>
        {weekDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { setSelectedDate(d); setViewMode('day'); }}
            style={[styles.workerCol, { width: weekColWidth, alignItems: 'center' }]}
          >
            <Text style={[styles.workerName, { color: isToday(d) ? appColors.primary : colors.textSecondary, fontWeight: isToday(d) ? '700' : '400' }]}>
              {shortDayName(d)}
            </Text>
            <View style={[styles.weekDayNum, isToday(d) && { backgroundColor: appColors.primary }]}>
              <Text style={[styles.weekDayNumText, { color: isToday(d) ? '#fff' : colors.textPrimary }]}>
                {d.getDate()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.grid, { paddingHorizontal: PADDING }]}>
        {hoursGrid.map(h => (
          <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
          </View>
        ))}
        <View style={[styles.columnsOverlay, { left: LABEL_WIDTH }]}>
          {weekDays.map((d, di) => {
            const dateStr = d.toISOString().split('T')[0];
            return (
              <View
                key={di}
                style={[
                  styles.workerColumn,
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
                {filteredAppointments
                  .filter(a => a.date === dateStr)
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
              </View>
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
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Toggle Día / Semana — glass */}
        <View style={[styles.toggle, {
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
        }]}>
          {(['day', 'week'] as ViewMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setViewMode(m)}
              style={[styles.toggleBtn, viewMode === m && { backgroundColor: appColors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, { color: viewMode === m ? '#fff' : colors.textSecondary }]}>
                {m === 'day' ? 'Día' : 'Semana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Selector de fecha (modo día) ────────────────────────── */}
      {viewMode === 'day' && (
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
            {formatDateLabel(selectedDate)}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(1)} style={styles.navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Selector de semana (modo semana) ────────────────────── */}
      {viewMode === 'week' && (
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => navigateDay(-7)} style={styles.navBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][selectedDate.getMonth()]}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(7)} style={styles.navBtn} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtro por trabajador — glass chips ───────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.workerFilters} contentContainerStyle={styles.workerFiltersContent}>
        {viewMode === 'day' && (
          <TouchableOpacity
            style={[styles.filterChip,
              !selectedWorkerFilter
                ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
                : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            ]}
            onPress={() => setSelectedWorkerFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, !selectedWorkerFilter ? { color: '#fff' } : { color: colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
        )}
        {workers.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.filterChip,
              selectedWorkerFilter === w.name
                ? { backgroundColor: appColors.primary, borderColor: appColors.primary }
                : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
            ]}
            onPress={() => setSelectedWorkerFilter(w.name)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedWorkerFilter === w.name ? { color: '#fff' } : { color: colors.textSecondary }]}>{w.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Stats row (Liquid Glass) ─────────────────────────────── */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, {
            backgroundColor: i === 0
              ? (isDarkMode ? 'rgba(227,25,55,0.12)' : 'rgba(227,25,55,0.07)')
              : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
            borderColor: i === 0
              ? 'rgba(227,25,55,0.3)'
              : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
          }]}>
            <Text style={[styles.statValue, { color: i === 0 ? appColors.primary : colors.textPrimary }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.gridContainer, { borderTopColor: colors.border }]}>
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
          style={[styles.fab, { backgroundColor: appColors.primary }]}
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
        initialData={editingAppt}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveAppt}
        colors={{ ...colors, workersList: workers, businessId: business?.id }}
        selectedDateStr={selectedDate.toISOString().split('T')[0]}
        showAlert={showAlert}
        openingHour={startHour}
        closingHour={endHour}
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
        <Pressable style={styles.profileOverlay} onPress={() => setProfileVisible(false)}>
          <Pressable onPress={() => {}}>
            <BlurView intensity={70} tint="dark" style={styles.profileCard}>
              <View style={[styles.profileCardInner, { backgroundColor: 'rgba(14,14,14,0.78)' }]}>
                <TouchableOpacity style={styles.profileClose} onPress={() => setProfileVisible(false)}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>✕</Text>
                </TouchableOpacity>
                {profileWorker && (
                  <>
                    <View style={[styles.profileAvatar, { backgroundColor: profileWorker.color + '25', borderColor: profileWorker.color }]}>
                      <Text style={[styles.profileInitials, { color: profileWorker.color }]}>{profileWorker.initials}</Text>
                    </View>
                    <Text style={styles.profileName}>{profileWorker.name}</Text>
                    <View style={styles.profileDivider} />
                    <View style={styles.profileStats}>
                      <View style={styles.profileStatItem}>
                        <Text style={styles.profileStatValue}>
                          {appointments.filter(a => a.worker === profileWorker.name && a.date === toLocalISOString(selectedDate)).length}
                        </Text>
                        <Text style={styles.profileStatLabel}>Hoy</Text>
                      </View>
                      <View style={[styles.profileStatItem, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.1)' }]}>
                        <Text style={styles.profileStatValue}>
                          {appointments.filter(a => a.worker === profileWorker.name).length}
                        </Text>
                        <Text style={styles.profileStatLabel}>Semana</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.profileFilterBtn, { backgroundColor: profileWorker.color + '20', borderColor: profileWorker.color + '50' }]}
                      onPress={() => {
                        setSelectedWorkerFilter(prev => prev === profileWorker.name ? null : profileWorker.name);
                        setProfileVisible(false);
                      }}
                    >
                      <Text style={[styles.profileFilterBtnText, { color: profileWorker.color }]}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Date nav
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  navBtn: {
    padding: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Filters
  workerFilters: {
    maxHeight: 40,
    minHeight: 40,
    marginBottom: 10,
  },
  workerFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
  },

  // Grid container
  gridContainer: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Worker header
  workerHeader: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 8,
  },
  workerCol: {
    alignItems: 'center',
    gap: 4,
  },
  workerAvatarWrapper: {
    position: 'relative',
  },
  workerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerActiveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  workerInitials: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  workerName: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  workerApptCount: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Worker profile modal
  profileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  profileCard: {
    width: 260,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  profileCardInner: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  profileClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  profileDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 4,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  profileStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    fontWeight: '500',
  },
  profileFilterBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  profileFilterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekDayNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weekDayNumText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Grid de tiempo
  grid: {
    position: 'relative',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    fontSize: 10,
    paddingTop: 0,
    paddingRight: 8,
    textAlign: 'right',
    letterSpacing: 0.2,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
  },

  // Columnas de citas
  columnsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  workerColumn: {
    position: 'absolute',
    top: 0,
  },

  // Tarjeta de cita
  apptCard: {
    position: 'absolute',
    left: 3,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    overflow: 'hidden',
  },
  apptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    flexShrink: 0,
  },
  apptTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  apptSub: {
    fontSize: 10,
    marginTop: 1,
  },

  // Línea "ahora"
  nowLine: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.primary,
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 1.5,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetWorkerDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetWorkerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sheetService: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetClient: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sheetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sheetDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  sheetDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetDetailText: {
    fontSize: 13,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  sheetAction: {
    alignItems: 'center',
    gap: 6,
  },
  sheetActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Modal Form
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  modalLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  suspendedBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  suspendedBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.error,
  },
});

// ─── Estilos del formulario de cita (Liquid Glass) ────────────────────────────

const formStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  blockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockToggleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  serviceChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  workerRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  workerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  workerName: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quickDates: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  slotChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 58,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  durationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  durationDisplay: {
    alignItems: 'center',
    minWidth: 64,
  },
  durationValue: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  durationUnit: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: -2,
  },
  saveBtn: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  successCard: {
    width: 200,
    height: 200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  successSub: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});