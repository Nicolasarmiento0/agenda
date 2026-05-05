import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { appColors } from '../../styles/appStyles';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ViewMode = 'day' | 'week';

type Appointment = {
  id: string;
  clientName: string;
  service: string;
  worker: string;
  workerColor: string;
  startHour: number; // ej: 9.5 = 9:30
  durationHours: number; // ej: 1.5 = 90 min
  status: 'confirmed' | 'pending' | 'completed' | 'no-show';
};

type Worker = {
  id: string;
  name: string;
  color: string;
  initials: string;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 72; // px por hora
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmado', bg: '#EEF8F0', text: '#2E7D45', dot: '#3D9E5A' },
  pending: { label: 'Pendiente', bg: '#FFF5E5', text: '#A0660A', dot: '#F0A030' },
  completed: { label: 'Completado', bg: '#F0F0F0', text: '#555555', dot: '#888888' },
  'no-show': { label: 'No Show', bg: '#FDEAEB', text: '#D00024', dot: '#D00024' },
};

// ─── Datos mock ───────────────────────────────────────────────────────────────

const MOCK_WORKERS: Worker[] = [
  { id: 'w1', name: 'Juan', color: '#D00024', initials: 'JU' },
  { id: 'w2', name: 'Sofía', color: '#3B7BE0', initials: 'SO' },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'a1', clientName: 'Carlos M.', service: 'Corte + barba', worker: 'Juan', workerColor: '#D00024', startHour: 9, durationHours: 1, status: 'confirmed' },
  { id: 'a2', clientName: 'Ana P.', service: 'Coloración', worker: 'Sofía', workerColor: '#3B7BE0', startHour: 10, durationHours: 1.5, status: 'confirmed' },
  { id: 'a3', clientName: 'Miguel R.', service: 'Corte', worker: 'Juan', workerColor: '#D00024', startHour: 12, durationHours: 0.5, status: 'pending' },
  { id: 'a4', clientName: 'Laura S.', service: 'Tratamiento', worker: 'Sofía', workerColor: '#3B7BE0', startHour: 13, durationHours: 1, status: 'pending' },
  { id: 'a5', clientName: 'Diego F.', service: 'Corte', worker: 'Juan', workerColor: '#D00024', startHour: 15, durationHours: 0.5, status: 'completed' },
];

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

function nowLinePosition() {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < START_HOUR || h > END_HOUR) return null;
  return (h - START_HOUR) * HOUR_HEIGHT;
}

// ─── Componente: AppointmentCard ─────────────────────────────────────────────

function AppointmentCard({
  appt,
  columnWidth,
  onPress,
  colors,
}: {
  appt: Appointment;
  columnWidth: number;
  onPress: () => void;
  colors: any;
}) {
  const top = (appt.startHour - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max(appt.durationHours * HOUR_HEIGHT - 4, 28);
  const status = STATUS_CONFIG[appt.status];
  const isShort = height < 48;

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
          borderLeftColor: appt.workerColor,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={[styles.apptDot, { backgroundColor: status.dot }]} />
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Text style={[styles.apptTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {appt.service}
        </Text>
        {!isShort && (
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

  const status = STATUS_CONFIG[appt.status];
  const endHour = appt.startHour + appt.durationHours;

  const ACTIONS = [
    { id: 'confirm', icon: 'check-circle', label: 'Confirmar', color: '#3D9E5A' },
    { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
    { id: 'no-show', icon: 'user-x', label: 'No Show', color: '#D00024' },
    { id: 'cancel', icon: 'x-circle', label: 'Cancelar', color: '#E24B4A' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
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
    </Modal>
  );
}

// ─── Componente: Formulario Cita ──────────────────────────────────────────────

function AppointmentFormModal({
  visible,
  initialData,
  onClose,
  onSave,
  colors,
}: {
  visible: boolean;
  initialData?: Appointment;
  onClose: () => void;
  onSave: (appt: Partial<Appointment>) => void;
  colors: any;
}) {
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('');
  const [worker, setWorker] = useState('');
  const [startHour, setStartHour] = useState(9);
  const [durationHours, setDurationHours] = useState(0.5);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setClientName(initialData.clientName);
        setService(initialData.service);
        setWorker(initialData.worker);
        setStartHour(initialData.startHour);
        setDurationHours(initialData.durationHours);
      } else {
        setClientName('');
        setService('');
        setWorker(MOCK_WORKERS[0].name);
        setStartHour(9);
        setDurationHours(0.5);
      }
    }
  }, [visible, initialData]);

  const handleSave = () => {
    onSave({
      clientName,
      service,
      worker,
      startHour,
      durationHours,
    });
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {initialData ? 'Editar Cita' : 'Nueva Cita'}
          </Text>

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Cliente</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={clientName}
            onChangeText={setClientName}
            placeholderTextColor={colors.textSecondary}
            placeholder="Nombre del cliente"
          />

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Servicio</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={service}
            onChangeText={setService}
            placeholderTextColor={colors.textSecondary}
            placeholder="Ej: Corte y barba"
          />

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Trabajador</Text>
          <View style={styles.modalRow}>
            {MOCK_WORKERS.map(w => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setWorker(w.name)}
                style={[styles.modalChip, worker === w.name && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
              >
                <Text style={[styles.modalChipText, worker === w.name ? { color: '#fff' } : { color: colors.textSecondary }]}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hora</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={String(startHour)}
                onChangeText={v => setStartHour(Number(v))}
                keyboardType="numeric"
                placeholder="Ej: 9.5"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Duración (hrs)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={String(durationHours)}
                onChangeText={v => setDurationHours(Number(v))}
                keyboardType="numeric"
                placeholder="Ej: 1"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border }]}>
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary }]}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CompanyAgendaScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>();

  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const nowPosition = useMemo(() => nowLinePosition(), []);

  // Stats
  const filteredAppointments = useMemo(() => {
    if (!selectedWorkerFilter) return appointments;
    return appointments.filter(a => a.worker === selectedWorkerFilter);
  }, [appointments, selectedWorkerFilter]);

  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const pending = filteredAppointments.filter(a => a.status === 'pending').length;
    const completed = filteredAppointments.filter(a => a.status === 'completed').length;
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

  const handleSheetAction = useCallback((actionId: string, appt: Appointment) => {
    if (actionId === 'confirm') {
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'confirmed' } : a));
    } else if (actionId === 'no-show') {
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'no-show' } : a));
    } else if (actionId === 'cancel') {
      setAppointments(prev => prev.filter(a => a.id !== appt.id));
    } else if (actionId === 'edit') {
      setEditingAppt(appt);
      setSheetVisible(false);
      setFormVisible(true);
    }
  }, []);

  const handleSaveAppt = useCallback((data: Partial<Appointment>) => {
    if (editingAppt) {
      setAppointments(prev => prev.map(a => a.id === editingAppt.id ? { ...a, ...data } as Appointment : a));
    } else {
      const workerInfo = MOCK_WORKERS.find(w => w.name === data.worker) || MOCK_WORKERS[0];
      const newAppt: Appointment = {
        id: 'new-' + Date.now(),
        clientName: data.clientName || 'Sin nombre',
        service: data.service || 'Servicio',
        worker: data.worker || workerInfo.name,
        workerColor: workerInfo.color,
        startHour: data.startHour || 9,
        durationHours: data.durationHours || 0.5,
        status: 'pending',
      };
      setAppointments(prev => [...prev, newAppt]);
    }
  }, [editingAppt]);

  const navigateDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  // ─── Vista de día: columnas por trabajador ────────────────────────────────

  const LABEL_WIDTH = 46;
  const PADDING = 16;
  const WORKERS = selectedWorkerFilter ? MOCK_WORKERS.filter(w => w.name === selectedWorkerFilter) : MOCK_WORKERS;
  const colWidth = Math.floor((SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2) / WORKERS.length);

  const renderDayGrid = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
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
        {HOURS.map(h => (
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
                },
              ]}
            >
              {appointments
                .filter(a => a.worker === w.name)
                .map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    columnWidth={colWidth}
                    onPress={() => openSheet(appt)}
                    colors={colors}
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
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
        {HOURS.map(h => (
          <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
            <Text style={[styles.hourLabel, { color: colors.textSecondary, width: LABEL_WIDTH }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
          </View>
        ))}
        <View style={[styles.columnsOverlay, { left: LABEL_WIDTH }]}>
          {weekDays.map((d, di) => (
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
                },
              ]}
            />
          ))}
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
        <TouchableOpacity
          style={[styles.filterChip, !selectedWorkerFilter && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
          onPress={() => setSelectedWorkerFilter(null)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterChipText, !selectedWorkerFilter ? { color: '#fff' } : { color: colors.textSecondary }]}>Todos</Text>
        </TouchableOpacity>
        {MOCK_WORKERS.map(w => (
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

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <View style={[styles.gridContainer, { borderTopColor: colors.border }]}>
        {viewMode === 'day' ? renderDayGrid() : renderWeekGrid()}
      </View>

      {/* ── FAB ──────────────────────────────────────────────────── */}
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

      {/* ── Modal Formulario ─────────────────────────────────────── */}
      <AppointmentFormModal
        visible={formVisible}
        initialData={editingAppt}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveAppt}
        colors={colors}
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
    height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
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
});