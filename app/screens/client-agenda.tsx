import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';
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
  isMine?: boolean;
};

type Worker = {
  id: string;
  name: string;
  color: string;
  initials: string;
};

type Business = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  avatar_url?: string;
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

// ─── Componente: AppointmentCard ─────────────────────────────────────────────

function AppointmentCard({
  appt,
  columnWidth,
  onPress,
  colors,
  startHour,
}: {
  appt: Appointment;
  columnWidth: number;
  onPress: () => void;
  colors: any;
  startHour: number;
}) {
  const top = (appt.startHour - startHour) * HOUR_HEIGHT;
  const height = Math.max(appt.durationHours * HOUR_HEIGHT - 4, 28);
  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isShort = height < 48;

  const isBlocked = appt.service === 'BLOQUEO';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isBlocked ? 1 : 0.85}
      style={[
        styles.apptCard,
        {
          top,
          height,
          width: columnWidth - 6,
          borderLeftColor: isBlocked ? '#999999' : appt.workerColor,
          backgroundColor: isBlocked ? '#F0F0F0' : colors.surface,
        },
      ]}
    >
      <View style={[styles.apptDot, { backgroundColor: isBlocked ? '#999999' : status.dot }]} />
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Text style={[styles.apptTitle, { color: isBlocked ? '#999999' : colors.textPrimary }]} numberOfLines={1}>
          {isBlocked ? 'No disponible' : appt.service}
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
}: {
  appt: Appointment | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: string, appt: Appointment) => void;
  colors: any;
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

  const isMine = appt.isMine;

  let canCancel = false;
  if (appt.date) {
    const apptDate = new Date(`${appt.date}T${String(Math.floor(appt.startHour)).padStart(2, '0')}:${String(Math.round((appt.startHour % 1) * 60)).padStart(2, '0')}:00`);
    const hoursDiff = (apptDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    canCancel = hoursDiff > 2;
  }

  const ACTIONS = isMine ? [
    { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
    ...(canCancel ? [{ id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' }] : []),
  ] : [];

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
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: slideY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

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
  openingTime,
  closingTime,
}: {
  visible: boolean;
  initialData?: Appointment;
  onClose: () => void;
  onSave: (appt: Partial<Appointment>) => Promise<boolean>;
  colors: any;
  selectedDateStr: string;
  showAlert: (opts: { title: string; message: string }) => void;
  openingTime?: string;
  closingTime?: string;
}) {
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [dateText, setDateText] = useState('');
  const [startTimeText, setStartTimeText] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!visible || !colors.selectedBusinessId) return;

      try {
        // Intentar obtener servicios de business_services
        const { data: bizServices, error: bizError } = await supabase
          .from('business_services')
          .select('name, price')
          .eq('business_id', colors.selectedBusinessId)
          .eq('is_active', true);

        if (!bizError && bizServices && bizServices.length > 0) {
          setServices(bizServices);
        } else {
          // Fallback: Si no hay servicios configurados, usar los del catálogo para la categoría
          const { data: bizData } = await supabase
            .from('businesses')
            .select('category_id')
            .eq('id', colors.selectedBusinessId)
            .single();

          if (bizData?.category_id) {
            const { data: catServices } = await supabase
              .from('catalog_services')
              .select('name')
              .eq('category_id', bizData.category_id);
            
            if (catServices && catServices.length > 0) {
              setServices(catServices.map(s => ({ id: s.name, name: s.name, price: 0 })));
            } else {
              // Último recurso: hardcoded placeholders
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
  }, [visible, colors.selectedBusinessId]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setClientName(initialData.clientName);
        setService(initialData.service);
        setWorkerId(initialData.worker_id);
        const hh = Math.floor(initialData.startHour);
        const mm = Math.round((initialData.startHour - hh) * 60);
        setStartTimeText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
        setDurationMinutes(Math.round(initialData.durationHours * 60));
        setDateText(initialData.date || selectedDateStr);
      } else {
        setClientName('');
        setService('');
        setWorkerId('');
        setStartTimeText('09:00');
        setDurationMinutes(30);
        setDateText(selectedDateStr);
      }
      setLoading(false);
      setShowCalendar(false);
    }
  }, [visible, initialData, selectedDateStr]);

  const handleSave = async () => {
    console.log('handleSave called', { service, workerId, dateText, startTimeText });
    if (loading) return;

    // ── Validación de campos obligatorios ──
    if (!service.trim()) {
      showAlert({ title: 'Campo requerido', message: 'Por favor ingresa el servicio que deseas reservar.' });
      return;
    }
    if (!workerId) {
      showAlert({ title: 'Campo requerido', message: 'Por favor selecciona un trabajador.' });
      return;
    }
    if (!dateText.trim()) {
      showAlert({ title: 'Campo requerido', message: 'Por favor ingresa la fecha de la cita.' });
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTimeText.trim())) {
      showAlert({ title: 'Hora inválida', message: 'Ingresa la hora en formato HH:MM (ej: 09:30).' });
      return;
    }

    const [hhStr, mmStr] = startTimeText.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr || '0', 10);
    const startHour = hh + mm / 60;
    const durationHours = durationMinutes / 60;
    const endHour = startHour + durationHours;

    // ── Validación de fecha y hora pasada ──
    const now = new Date();
    const todayStr = toLocalISOString(now);
    const currentHour = now.getHours() + now.getMinutes() / 60;

    if (dateText < todayStr) {
      showAlert({ title: 'Fecha inválida', message: 'No puedes agendar citas para fechas que ya pasaron.' });
      return;
    }

    const openingTimeHour = openingTime ? parseInt(openingTime.split(':')[0]) + parseInt(openingTime.split(':')[1]) / 60 : DEFAULT_START_HOUR;
    // Si la hora de inicio solicitada es muy cercana a la de apertura (consideramos un bloque de primera hora si está dentro de los primeros 15 min de apertura)
    const isFirstBlock = Math.abs(startHour - openingTimeHour) <= 0.25;

    if (dateText === todayStr) {
      if (isFirstBlock) {
        showAlert({ title: 'Hora no disponible', message: 'El primer bloque del día solo puede agendarse hasta el día anterior.' });
        return;
      }
      
      // Margen de 1 hora mínimo de anticipación
      if (startHour <= currentHour + 1) {
        showAlert({ title: 'Hora inválida', message: 'Debes agendar con al menos 1 hora de anticipación.' });
        return;
      }
    }

    // ── Validación de horario de apertura ──
    if (openingTime && closingTime) {
      const openH = parseInt(openingTime.split(':')[0]) + parseInt(openingTime.split(':')[1]) / 60;
      const closeH = parseInt(closingTime.split(':')[0]) + parseInt(closingTime.split(':')[1]) / 60;

      if (startHour < openH || endHour > closeH) {
        showAlert({ 
          title: 'Fuera de horario', 
          message: `El negocio atiende de ${openingTime.substring(0,5)} a ${closingTime.substring(0,5)}. Ajusta tu cita.` 
        });
        return;
      }
    }

    setLoading(true);
    const selectedServiceObj = services.find(s => s.name === (service || 'Servicio'));
    const price = selectedServiceObj ? Number(selectedServiceObj.price || 0) : 0;

    const success = await onSave({
      clientName,
      service,
      worker_id: workerId,
      startHour,
      durationHours: durationMinutes / 60,
      date: dateText,
      price,
    });
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {initialData ? 'Editar Cita' : 'Nueva Cita'}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Selecciona un Servicio</Text>
            <View style={[styles.modalRow, { marginBottom: 16 }]}>
              {services.map((s, index) => (
                <TouchableOpacity
                  key={s.id || `${s.name}-${index}`}
                  onPress={() => setService(s.name)}
                  style={[
                    styles.modalChip,
                    service === s.name && { backgroundColor: appColors.primary, borderColor: appColors.primary }
                  ]}
                >
                  <Text style={[styles.modalChipText, service === s.name ? { color: '#fff' } : { color: colors.textSecondary }]}>
                    {s.name} {s.price > 0 ? `($${Number(s.price).toLocaleString('es-CL')})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Trabajador</Text>
            <View style={styles.modalRow}>
              {colors.workersList?.map((w: any) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setWorkerId(w.id)}
                  style={[styles.modalChip, workerId === w.id && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
                >
                  <Text style={[styles.modalChipText, workerId === w.id ? { color: '#fff' } : { color: colors.textSecondary }]}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Fecha de la Cita</Text>
            <TouchableOpacity 
              onPress={() => setShowCalendar(!showCalendar)}
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
            >
              <Text style={{ color: colors.textPrimary }}>{dateText || 'Seleccionar fecha'}</Text>
              <Feather name="calendar" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {showCalendar && (
              <View style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                <Calendar
                  minDate={toLocalISOString(new Date())}
                  onDayPress={(day: any) => {
                    setDateText(day.dateString);
                    setShowCalendar(false);
                  }}
                  markedDates={dateText ? {
                    [dateText]: { selected: true, selectedColor: appColors.primary }
                  } : {}}
                  theme={{
                    backgroundColor: colors.surface,
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textSecondary,
                    selectedDayBackgroundColor: appColors.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: appColors.primary,
                    dayTextColor: colors.textPrimary,
                    textDisabledColor: colors.border,
                    monthTextColor: colors.textPrimary,
                    arrowColor: appColors.primary,
                  }}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hora (HH:MM)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={startTimeText}
                  onChangeText={setStartTimeText}
                  placeholder="Ej: 09:30"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Duración (min)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, height: 40 }}>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface }}
                    onPress={() => setDurationMinutes(Math.max(10, durationMinutes - 10))}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{durationMinutes}</Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface }}
                    onPress={() => setDurationMinutes(durationMinutes + 10)}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[styles.modalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary, opacity: loading ? 0.7 : 1 }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ClientAgendaScreen() {
  const { profile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { selectedBusiness: business } = useBusiness();

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
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      setAppointments(data.map(a => {
        const isMine = a.client_name === profile?.nickname || a.client_id === profile?.id;
        return {
          id: a.id,
          isMine,
          clientName: isMine ? a.client_name : '',
          service: isMine ? a.service : 'Reservado',
          worker_id: a.worker_id,
          worker: a.workers?.name || 'Desconocido',
          workerColor: a.workers?.color || '#000',
          startHour: Number(a.start_hour),
          durationHours: Number(a.duration_hours),
          status: a.status as any,
          date: a.date,
          price: a.price || 0,
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
    if (appt.service === 'BLOQUEO') return;
    setSelectedAppt(appt);
    setSheetVisible(true);
  }, []);

  const handleSheetAction = useCallback(async (actionId: string, appt: Appointment) => {
    if (actionId === 'confirm') {
      const { error } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appt.id);
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
        showAlert({ title: 'Sin negocio', message: 'Por favor selecciona un negocio desde la pantalla Explorar.' });
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

      const apptData = {
        business_id: business.id,
        worker_id: data.worker_id,
        client_id: profile?.id,
        client_name: profile?.nickname || 'Cliente',
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
      return true;
    } catch (err: any) {
      console.error('Error in handleSaveAppt:', err);
      showAlert({ title: 'Error Inesperado', message: err.message || 'Ocurrió un error al procesar la cita.' });
      return false;
    }
  }, [editingAppt, business?.id, selectedDate, fetchAppointments, profile, showAlert]);

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
        {WORKERS.map(w => (
          <View key={w.id} style={[styles.workerCol, { width: colWidth }]}>
            <View style={[styles.workerAvatar, { backgroundColor: w.color + '20', borderColor: w.color }]}>
              <Text style={[styles.workerInitials, { color: w.color }]}>{w.initials}</Text>
            </View>
            <Text style={[styles.workerName, { color: colors.textSecondary }]}>{w.name}</Text>
          </View>
        ))}
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
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
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
                    backgroundColor: isToday(d) ? appColors.primary + '06' : 'transparent',
                    height: (endHour - startHour) * HOUR_HEIGHT,
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

        {/* Toggle Día / Semana */}
        <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

      {/* ── Título del negocio (estilo Tesla) ────────────────────── */}
      {business && (
        <View style={[styles.businessHeader, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.businessHeaderLabel, { color: colors.textSecondary }]}>NEGOCIO</Text>
            <Text style={[styles.businessHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {business.name.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

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

      {/* ── Filtro por trabajador ──────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.workerFilters} contentContainerStyle={styles.workerFiltersContent}>
        {viewMode === 'day' && (
          <TouchableOpacity
            style={[styles.filterChip, !selectedWorkerFilter && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
            onPress={() => setSelectedWorkerFilter(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, !selectedWorkerFilter ? { color: '#fff' } : { color: colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
        )}
        {workers.map(w => (
          <TouchableOpacity
            key={w.id}
            style={[styles.filterChip, selectedWorkerFilter === w.name && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
            onPress={() => setSelectedWorkerFilter(w.name)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedWorkerFilter === w.name ? { color: '#fff' } : { color: colors.textSecondary }]}>{w.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Stats row ────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          <View style={[styles.suspensionBadge, { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, margin: 16, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }]}>
            <Feather name="alert-circle" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>NEGOCIO TEMPORALMENTE SUSPENDIDO</Text>
          </View>
        )}
      </View>
      {/* ── FAB ──────────────────────────────────────────────────── */}
      {!isSuspended && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: appColors.primary }]}
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
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Modal Formulario ─────────────────────────────────────── */}
      <AppointmentFormModal
        visible={formVisible}
        initialData={editingAppt}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveAppt}
        colors={{ ...colors, workersList: workers, selectedBusinessId: business?.id }}
        selectedDateStr={selectedDate.toISOString().split('T')[0]}
        showAlert={showAlert}
        openingTime={business?.opening_time}
        closingTime={business?.closing_time}
      />

      {/* ── Bottom sheet ─────────────────────────────────────────── */}
      <AppointmentSheet
        appt={selectedAppt}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        colors={colors}
      />

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  workerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitials: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  workerName: {
    fontSize: 10,
    letterSpacing: 0.5,
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

  // Business header (Tesla style)
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  businessHeaderLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 2,
  },
  businessHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  suspensionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suspensionText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});