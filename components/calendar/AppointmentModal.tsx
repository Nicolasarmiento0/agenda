import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { Appointment, AppointmentStatus, STATUS_CONFIG, WorkerRow } from '../../constants/appointments';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ToastOptions } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import GlassModal from '../GlassModal';
import TimeWheelPicker from '../TimeWheelPicker';

const SCREEN_W = Dimensions.get('window').width;

const DURATION_OPTIONS = [
  { label: '30 min', value: 0.5 },
  { label: '45 min', value: 0.75 },
  { label: '1 h', value: 1 },
  { label: '1.5 h', value: 1.5 },
  { label: '2 h', value: 2 },
  { label: '2.5 h', value: 2.5 },
  { label: '3 h', value: 3 },
  { label: '3.5 h', value: 3.5 },
  { label: '4 h', value: 4 },
  { label: '4.5 h', value: 4.5 },
  { label: '5 h', value: 5 },
];

export type ModalMode = 'create' | 'detail' | 'edit';

export type OpenCreatePayload = {
  mode: 'create';
  date: string;
  startHour?: number;
  workerId?: string;
};

export type OpenDetailPayload = {
  mode: 'detail';
  appointment: Appointment;
};

export type OpenEditPayload = {
  mode: 'edit';
  appointment: Appointment;
};

export type AppointmentModalHandle = {
  open: (payload: OpenCreatePayload | OpenDetailPayload | OpenEditPayload) => void;
  close: () => void;
};

type Props = {
  workers: WorkerRow[];
  businessId: string;
  onSaved: () => void;
  showToast: (opts: ToastOptions) => void;
  onDateChange?: (dateStr: string) => void;
};

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

function formatFriendlyDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);

  const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MONTHS_ES_LONG = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return `${DAYS_ES[d.getDay()]}, ${day} de ${MONTHS_ES_LONG[month]} de ${year}`;
}

function getDayMonthGrid(year: number, month: number): Date[] {
  const grid: Date[] = [];
  const first = new Date(year, month, 1);
  const firstDow = first.getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  for (let i = offset; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    grid.push(d);
  }

  const last = new Date(year, month + 1, 0);
  const totalDays = last.getDate();
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    grid.push(d);
  }

  const remaining = 42 - grid.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    grid.push(d);
  }

  return grid;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatHour(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${pad(hrs)}:${pad(mins)}`;
}

const AppointmentModal = forwardRef<AppointmentModalHandle, Props>(
  ({ workers, businessId, onSaved, showToast, onDateChange }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const { colors, isDarkMode } = useTheme();
    const { profile } = useAuth();
    const role = profile?.role ?? 'client';
    const { showAlert } = useAlert();

    const snapPoints = useMemo(() => ['55%', '92%'], []);

    const [mode, setMode] = useState<ModalMode>('create');
    const [appointment, setAppointment] = useState<Appointment | null>(null);

    const canEditOrCancel = useMemo(() => {
      if (role === 'admin') return false;
      if (!appointment) return false;
      if (role === 'company' || role === 'worker') return true;

      const isPastOrFinished = appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no-show';
      if (isPastOrFinished) return false;

      // Enforce ownership: clients can only edit or cancel their own appointments!
      if (appointment.client_id !== profile?.id) return false;

      const apptDate = new Date(appointment.date ?? '');
      apptDate.setHours(Math.floor(appointment.startHour), Math.round((appointment.startHour % 1) * 60));
      const diff = apptDate.getTime() - Date.now();
      return diff >= 2 * 60 * 60 * 1000;
    }, [appointment, role, profile?.id]);

    // Create form state
    const [clientName, setClientName] = useState('');
    const [service, setService] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [price, setPrice] = useState(0);
    const [date, setDate] = useState('');
    const [startHour, setStartHour] = useState(9);
    const [duration, setDuration] = useState(1);
    const [endHour, setEndHour] = useState(10);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

    const [isBlockedSlot, setIsBlockedSlot] = useState(false);
    const [busyIntervals, setBusyIntervals] = useState<{ start: number; end: number }[]>([]);
    const [businessServices, setBusinessServices] = useState<{ id: string; name: string; price: number; duration_min: number }[]>([]);

    const [businessSchedule, setBusinessSchedule] = useState<any>(null);
    const [businessOpening, setBusinessOpening] = useState<string>('09:00');
    const [businessClosing, setBusinessClosing] = useState<string>('21:00');

    const { pickerOpeningHour, pickerClosingHour, pickerClosedAfter } = useMemo(() => {
      let openH = 7;
      let closeH = 22;
      let closedAfter: number | undefined;

      const d = parseDateString(date);
      const dayOfWeek = d.getDay();
      const dayKey = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      const dayBlocks = businessSchedule ? businessSchedule[dayKey] : null;

      if (dayBlocks && Array.isArray(dayBlocks) && dayBlocks.length > 0) {
        let minStart = 24;
        let maxEnd = 0;
        dayBlocks.forEach((block: any) => {
          const [startH, startM] = block.start.split(':').map(Number);
          const [endH, endM] = block.end.split(':').map(Number);
          const startVal = startH + startM / 60;
          const endVal = endH + endM / 60;
          if (startVal < minStart) minStart = startVal;
          if (endVal > maxEnd) maxEnd = endVal;
        });
        openH = Math.floor(minStart);
        closeH = Math.ceil(maxEnd);
        closedAfter = maxEnd; // la hora exacta de cierre del último bloque
      } else if (businessOpening && businessClosing) {
        const [oH, oM] = businessOpening.split(':').map(Number);
        const [cH, cM] = businessClosing.split(':').map(Number);
        openH = oH;
        closeH = cM > 0 ? cH + 1 : cH;
        closedAfter = cH + cM / 60; // hora de cierre exacta del negocio
      }

      openH = Math.max(0, Math.min(23, openH));
      closeH = Math.max(openH + 1, Math.min(24, closeH));

      return { pickerOpeningHour: openH, pickerClosingHour: closeH, pickerClosedAfter: closedAfter };
    }, [date, businessSchedule, businessOpening, businessClosing]);

    const closedIntervals = useMemo(() => {
      const intervals: { start: number; end: number }[] = [];
      const d = parseDateString(date);
      const dayOfWeek = d.getDay();
      const dayKey = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      const dayBlocks = businessSchedule ? businessSchedule[dayKey] : null;

      if (dayBlocks && Array.isArray(dayBlocks)) {
        if (dayBlocks.length === 0) {
          intervals.push({ start: pickerOpeningHour, end: pickerClosingHour });
        } else {
          const sortedBlocks = [...dayBlocks]
            .map((block: any) => {
              const [startH, startM] = block.start.split(':').map(Number);
              const [endH, endM] = block.end.split(':').map(Number);
              return {
                start: startH + startM / 60,
                end: endH + endM / 60,
              };
            })
            .sort((a, b) => a.start - b.start);

          if (sortedBlocks[0].start > pickerOpeningHour) {
            intervals.push({ start: pickerOpeningHour, end: sortedBlocks[0].start });
          }

          for (let i = 0; i < sortedBlocks.length - 1; i++) {
            if (sortedBlocks[i].end < sortedBlocks[i + 1].start) {
              intervals.push({ start: sortedBlocks[i].end, end: sortedBlocks[i + 1].start });
            }
          }

          // El límite post-cierre se maneja vía closedAfter en el picker (inicio-exclusivo)
        }
      } else if (businessOpening && businessClosing) {
        const [openH, openM] = businessOpening.split(':').map(Number);
        const [closeH, closeM] = businessClosing.split(':').map(Number);
        const openTime = openH + (openM / 60);
        const closeTime = closeH + (closeM / 60);

        if (openTime > pickerOpeningHour) {
          intervals.push({ start: pickerOpeningHour, end: openTime });
        }
        // El límite post-cierre se maneja vía closedAfter en el picker (inicio-exclusivo)
      }

      return intervals;
    }, [date, businessSchedule, businessOpening, businessClosing, pickerOpeningHour, pickerClosingHour]);

    const combinedBusyIntervals = useMemo(() => {
      return [...busyIntervals, ...closedIntervals];
    }, [busyIntervals, closedIntervals]);

    useEffect(() => {
      if (startHour < pickerOpeningHour) {
        setStartHour(pickerOpeningHour);
      } else if (startHour > pickerClosingHour) {
        setStartHour(Math.max(pickerOpeningHour, pickerClosingHour));
      }
    }, [pickerOpeningHour, pickerClosingHour, startHour]);

    useEffect(() => {
      if (endHour <= startHour) {
        setEndHour(Math.min(pickerClosingHour, startHour + 1));
      } else if (endHour > pickerClosingHour) {
        setEndHour(pickerClosingHour);
      }
    }, [startHour, pickerClosingHour, endHour]);

    useEffect(() => {
      if (!businessId) return;
      supabase
        .from('businesses')
        .select('schedule, opening_time, closing_time')
        .eq('id', businessId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setBusinessSchedule(data.schedule);
            if (data.opening_time) setBusinessOpening(data.opening_time.slice(0, 5));
            if (data.closing_time) setBusinessClosing(data.closing_time.slice(0, 5));
          }
        });
    }, [businessId]);

    useEffect(() => {
      if (!businessId) {
        setBusinessServices([]);
        return;
      }
      supabase
        .from('business_services')
        .select('id, name, price, duration_min')
        .eq('business_id', businessId)
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setBusinessServices(data);
          } else {
            setBusinessServices([]);
          }
        });
    }, [businessId]);

    useEffect(() => {
      if (!date || !businessId || (mode !== 'create' && mode !== 'edit')) return;
      const workerForQuery = role === 'worker'
        ? (workers.find(w => w.user_id === profile?.id)?.id ?? workers[0]?.id)
        : (selectedWorkerId ?? workers[0]?.id);

      if (!workerForQuery) return;

      let query = supabase
        .from('availability_slots')
        .select('id, start_hour, duration_hours')
        .eq('date', date)
        .eq('worker_id', workerForQuery)
        .neq('status', 'cancelled');

      if (mode === 'edit' && appointment) {
        query = query.neq('id', appointment.id);
      }

      query.then(({ data, error }) => {
        if (!error && data) {
          setBusyIntervals(
            data.map((a: any) => ({
              start: Number(a.start_hour),
              end: Number(a.start_hour) + Number(a.duration_hours),
            }))
          );
        } else {
          setBusyIntervals([]);
        }
      });
    }, [date, selectedWorkerId, workers, businessId, role, profile?.id, mode, appointment?.id]);

    useImperativeHandle(ref, () => ({
      open(payload) {
        if (payload.mode === 'create') {
          setMode('create');
          setDate(payload.date);
          const parsed = parseDateString(payload.date);
          setCalendarYear(parsed.getFullYear());
          setCalendarMonth(parsed.getMonth());
          const initialStartHour = payload.startHour ?? 9;
          setStartHour(initialStartHour);
          setEndHour(initialStartHour + 1);
          setIsBlockedSlot(false);
          setClientName(role === 'client' ? (profile?.nickname ?? '') : '');
          setService('');
          setServiceSearch('');
          setDuration(1);
          if (role === 'worker') {
            const selfWorker = workers.find((w) => w.user_id === profile?.id) ?? workers[0];
            setSelectedWorkerId(payload.workerId ?? selfWorker?.id ?? null);
          } else {
            setSelectedWorkerId(payload.workerId ?? workers[0]?.id ?? null);
          }
          setAppointment(null);
          sheetRef.current?.snapToIndex(1);
        } else if (payload.mode === 'edit') {
          setMode('edit');
          const appt = payload.appointment;
          setAppointment(appt);
          setClientName(appt.clientName || '');
          setService(appt.service || '');
          setServiceSearch('');
          setDate(appt.date ?? '');
          if (appt.date) {
            const parsed = parseDateString(appt.date);
            setCalendarYear(parsed.getFullYear());
            setCalendarMonth(parsed.getMonth());
          }
          setStartHour(appt.startHour);
          setDuration(appt.durationHours);
          setEndHour(appt.startHour + appt.durationHours);
          setSelectedWorkerId(appt.worker_id || null);
          setIsBlockedSlot(appt.status === 'blocked');
          setPrice(appt.price || 0);
          sheetRef.current?.snapToIndex(1);
        } else {
          setMode('detail');
          setAppointment(payload.appointment);
          if (payload.appointment.date) {
            const parsed = parseDateString(payload.appointment.date);
            setCalendarYear(parsed.getFullYear());
            setCalendarMonth(parsed.getMonth());
          }
          sheetRef.current?.snapToIndex(0);
        }
      },
      close() {
        sheetRef.current?.close();
      },
    }));

    const executeInsert = async (workerIdVal: string) => {
      setSaving(true);
      const { error } = await supabase.from('appointments').insert({
        business_id: businessId,
        client_name: isBlockedSlot ? 'Bloqueo de horario' : clientName.trim(),
        service: isBlockedSlot ? (service.trim() || 'Bloqueo') : service.trim(),
        date,
        start_hour: startHour,
        duration_hours: duration,
        worker_id: workerIdVal,
        client_id: (role === 'client' && !isBlockedSlot) ? profile?.id : null,
        status: isBlockedSlot ? 'confirmed' : 'pending',
        price: isBlockedSlot ? 0 : price,
      });

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        setSaving(false);
        showToast({ type: 'error', message: `Error al guardar: ${error.message}` });
      } else {
        showToast({ type: 'success', message: isBlockedSlot ? 'Horario bloqueado' : 'Cita agendada' });
        await onSaved();
        setSaving(false);
        sheetRef.current?.close();
      }
    };

    const handleSave = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (!isBlockedSlot && (!clientName.trim() || !service.trim())) {
        showAlert({
          title: 'Campos incompletos',
          message: 'Por favor, completa el nombre del cliente y el tipo de servicio antes de guardar.',
        });
        return;
      }

      if (isBlockedSlot && endHour <= startHour) {
        showAlert({
          title: 'Horario inválido',
          message: 'La hora de término (Hasta) debe ser posterior a la hora de inicio (Desde).',
        });
        return;
      }

      const hrs = Math.floor(startHour);
      const mins = Math.round((startHour - hrs) * 60);
      const apptDate = new Date(date + 'T' + pad(hrs) + ':' + pad(mins) + ':00');
      const now = new Date();

      if (!isBlockedSlot) {
        // 1. Past time slot check — applies to all roles
        if (apptDate.getTime() < now.getTime()) {
          showAlert({
            title: 'Fecha inválida',
            message: 'No puedes agendar una cita en el pasado.',
          });
          return;
        }

        // 2. 2-hour minimum notice for clients
        if (role === 'client') {
          const diff = apptDate.getTime() - now.getTime();
          if (diff < 2 * 60 * 60 * 1000) {
            showAlert({
              title: 'Anticipación mínima',
              message: 'Las reservas deben realizarse con al menos 2 horas de anticipación.',
            });
            return;
          }
        }
      }

      // 3. Business hours constraint based on schedule blocks
      const dayOfWeek = parseDateString(date).getDay();
      const dayKey = dayOfWeek === 0 ? '7' : String(dayOfWeek);
      
      const dayBlocks = businessSchedule ? businessSchedule[dayKey] : null;
      
      if (dayBlocks && Array.isArray(dayBlocks)) {
        if (dayBlocks.length === 0) {
          showAlert({
            title: 'Negocio cerrado',
            message: 'El negocio se encuentra cerrado el día seleccionado.',
          });
          return;
        }
        
        // Check if the appointment interval [startHour, startHour + duration] fits within any of the working blocks
        const fitsInBlock = dayBlocks.some((block: any) => {
          const [startH, startM] = block.start.split(':').map(Number);
          const [endH, endM] = block.end.split(':').map(Number);
          const blockStart = startH + (startM / 60);
          const blockEnd = endH + (endM / 60);
          
          return startHour >= blockStart && (startHour + duration) <= blockEnd;
        });
        
        if (!fitsInBlock) {
          showAlert({
            title: 'Fuera de horario laboral',
            message: 'El horario seleccionado se encuentra fuera de los bloques de atención del negocio para este día.',
          });
          return;
        }
      } else {
        // Fallback to basic opening/closing hours
        const [openH, openM] = businessOpening.split(':').map(Number);
        const [closeH, closeM] = businessClosing.split(':').map(Number);
        const openTime = openH + (openM / 60);
        const closeTime = closeH + (closeM / 60);
        
        if (startHour < openTime || startHour + duration > closeTime) {
          showAlert({
            title: 'Fuera de horario laboral',
            message: `El horario seleccionado se encuentra fuera de la jornada laboral establecida (${businessOpening} - ${businessClosing}).`,
          });
          return;
        }
      }


      setSaving(true);
      const workerForInsert = role === 'worker'
        ? (workers.find(w => w.user_id === profile?.id)?.id ?? workers[0]?.id)
        : (selectedWorkerId ?? workers[0]?.id);

      // 5. Double Booking Conflict Detection
      let query = supabase
        .from('availability_slots')
        .select('id, start_hour, duration_hours')
        .eq('date', date)
        .eq('worker_id', workerForInsert)
        .neq('status', 'cancelled');

      if (mode === 'edit' && appointment) {
        query = query.neq('id', appointment.id);
      }

      const { data: conflicts, error: conflictError } = await query;

      if (!conflictError && conflicts && conflicts.length > 0) {
        const hasOverlap = conflicts.some(appt => {
          const apptStart = appt.start_hour;
          const apptEnd = appt.start_hour + appt.duration_hours;
          const newStart = startHour;
          const newEnd = startHour + duration;
          return apptStart < newEnd && apptEnd > newStart;
        });

        if (hasOverlap) {
          setSaving(false);
          if (isBlockedSlot) {
            showAlert({
              title: 'Bloqueo superpuesto',
              message: 'El profesional seleccionado ya cuenta con una cita en este bloque de horario. ¿Deseas bloquear el horario de todas formas (crear un sobrecupo)?',
              buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Bloquear de todas formas',
                  style: 'default',
                  onPress: () => mode === 'edit' ? executeUpdate(workerForInsert) : executeInsert(workerForInsert),
                },
              ],
            });
            return;
          } else if (role === 'company') {
            showAlert({
              title: 'Cita superpuesta',
              message: 'El profesional seleccionado ya cuenta con una cita en este bloque de horario. ¿Deseas agendar de todas formas (crear un sobrecupo)?',
              buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Agendar de todas formas',
                  style: 'default',
                  onPress: () => mode === 'edit' ? executeUpdate(workerForInsert) : executeInsert(workerForInsert),
                },
              ],
            });
            return;
          } else {
            showAlert({
              title: 'Horario ocupado',
              message: 'El profesional seleccionado ya tiene una cita agendada en este bloque de horario. Por favor, selecciona otro horario.',
            });
            return;
          }
        }
      }

      if (mode === 'edit') {
        await executeUpdate(workerForInsert);
      } else {
        await executeInsert(workerForInsert);
      }
    };

    const handleStatusChange = async (newStatus: AppointmentStatus) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (!appointment) return;

      if (role === 'client' && appointment.client_id !== profile?.id) {
        showToast({ type: 'error', message: 'No tienes permiso para modificar esta cita.' });
        return;
      }

      if (newStatus === 'cancelled' && role === 'client') {
        const apptDate = new Date(appointment.date ?? '');
        apptDate.setHours(Math.floor(appointment.startHour), Math.round((appointment.startHour % 1) * 60));
        const diff = apptDate.getTime() - Date.now();
        if (diff < 2 * 60 * 60 * 1000) {
          showToast({ type: 'error', message: 'No puedes cancelar con menos de 2 horas de anticipación' });
          return;
        }
      }

      setSaving(true);

      let updatePayload: any = { status: newStatus };
      if (newStatus === 'completed') {
        // Ensure price is set to sum up for barber & business
        const currentPrice = appointment.price || 0;
        if (currentPrice === 0) {
          const matchingService = businessServices.find(s => s.name === appointment.service);
          if (matchingService) {
            updatePayload.price = matchingService.price;
          }
        }
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      setSaving(false);
      if (error) {
        showToast({ type: 'error', message: 'Error al actualizar. Intenta de nuevo.' });
      } else {
        showToast({ type: 'success', message: `Cita ${STATUS_CONFIG[newStatus].label.toLowerCase()}` });
        onSaved();
        sheetRef.current?.close();
      }
    };

    const handleDelete = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (!appointment) return;

      if (role === 'client' && appointment.client_id !== profile?.id) {
        showToast({ type: 'error', message: 'No tienes permiso para modificar esta cita.' });
        return;
      }

      const isBlocked = appointment.status === 'blocked';

      showAlert({
        title: isBlocked ? 'DESBLOQUEAR HORARIO' : 'ELIMINAR CITA',
        message: isBlocked
          ? '¿Estás seguro de que deseas desbloquear este horario y quitar el bloqueo del calendario?'
          : '¿Estás seguro de que deseas eliminar permanentemente esta cita del calendario?',
        buttons: [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: isBlocked ? 'Desbloquear' : 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              setSaving(true);
              const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointment.id);

              setSaving(false);
              if (error) {
                showToast({ type: 'error', message: isBlocked ? 'Error al desbloquear. Intenta de nuevo.' : 'Error al eliminar. Intenta de nuevo.' });
              } else {
                showToast({ type: 'success', message: isBlocked ? 'Horario desbloqueado con éxito' : 'Cita eliminada permanentemente' });
                onSaved();
                sheetRef.current?.close();
              }
            },
          },
        ],
      });
    };

    const executeUpdate = async (workerIdVal: string) => {
      if (!appointment) return;

      if (role === 'client' && appointment.client_id !== profile?.id) {
        showToast({ type: 'error', message: 'No tienes permiso para modificar esta cita.' });
        return;
      }

      setSaving(true);
      const updatePayload: any = {
        client_name: isBlockedSlot ? 'Bloqueo de horario' : clientName.trim(),
        service: isBlockedSlot ? (service.trim() || 'Bloqueo') : service.trim(),
        date,
        start_hour: startHour,
        duration_hours: duration,
        worker_id: workerIdVal,
        price: isBlockedSlot ? 0 : price,
      };

      if (role === 'client') {
        if (appointment.reschedule_count && appointment.reschedule_count >= 1) {
          showToast({ type: 'error', message: 'No puedes volver a reagendar esta cita. Límite de 1 reagendamiento alcanzado.' });
          setSaving(false);
          return;
        }
        if (appointment.status === 'confirmed' || appointment.status === 'rescheduled') {
          updatePayload.status = 'pending';
        }
        updatePayload.created_at = new Date().toISOString();
        updatePayload.reschedule_count = (appointment.reschedule_count || 0) + 1;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointment.id);

      if (error) {
        console.error("SUPABASE UPDATE ERROR:", error);
        setSaving(false);
        showToast({ type: 'error', message: `Error al guardar cambios: ${error.message}` });
      } else {
        showToast({ type: 'success', message: 'Cita modificada con éxito' });
        await onSaved();
        setSaving(false);
        sheetRef.current?.close();
      }
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const renderBackground = useCallback(
      (props: any) => (
        <View
          style={[
            props.style,
            {
              backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.85)' : 'rgba(242, 242, 247, 0.85)',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1.5,
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: isDarkMode ? 0.3 : 0.15,
              shadowRadius: 16,
              elevation: 10,
            },
          ]}
        >
          <BlurView
            intensity={isDarkMode ? 20 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ),
      [isDarkMode],
    );

    const bg = isDarkMode ? '#1C1C1E' : '#F2F2F7';
    const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const filteredServices = useMemo(() => {
      if (!serviceSearch.trim()) return businessServices;
      return businessServices.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
      );
    }, [businessServices, serviceSearch]);

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundComponent={renderBackground}
          backgroundStyle={{ backgroundColor: 'transparent' }}
          handleIndicatorStyle={{
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
            width: 44,
            height: 5,
            borderRadius: 2.5,
          }}
        >
          <BottomSheetScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
          >
            {mode === 'create' || mode === 'edit' ? (
              <>
                {mode === 'edit' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                    <TouchableOpacity onPress={() => setMode('detail')} style={{ paddingRight: 4 }}>
                      <Feather name="arrow-left" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.textPrimary, marginBottom: 0 }]}>
                      {isBlockedSlot ? 'Editar bloqueo' : 'Editar cita'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.title, { color: colors.textPrimary, marginBottom: 12 }]}>Nueva cita</Text>
                )}

                {role !== 'client' && (
                  <View style={[styles.tabs, { backgroundColor: colors.surface, marginBottom: 16 }]}>
                    <TouchableOpacity
                      style={[styles.tab, !isBlockedSlot && { backgroundColor: colors.accentDim }]}
                      onPress={() => {
                        setIsBlockedSlot(false);
                        setClientName('');
                        setService('');
                      }}
                    >
                      <Text style={[styles.tabText, { color: !isBlockedSlot ? colors.accent : colors.textSecondary }]}>
                        Agendar cita
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, isBlockedSlot && { backgroundColor: colors.accentDim }]}
                      onPress={() => {
                        setIsBlockedSlot(true);
                        setClientName('Bloqueo de horario');
                        setService('Bloqueo');
                        setEndHour(startHour + 1);
                        setDuration(1);
                      }}
                    >
                      <Text style={[styles.tabText, { color: isBlockedSlot ? colors.accent : colors.textSecondary }]}>
                        Bloquear horario
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isBlockedSlot && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Cliente</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: inputBg, color: colors.textPrimary, borderColor: colors.border },
                        role === 'client' && { opacity: 0.7, color: colors.textSecondary }
                      ]}
                      placeholderTextColor={colors.textSecondary}
                      placeholder="Nombre del cliente"
                      value={clientName}
                      onChangeText={setClientName}
                      editable={role !== 'client'}
                    />
                  </>
                )}

                {!isBlockedSlot && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Servicio</Text>
                    {businessServices.length === 0 ? (
                      <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholderTextColor={colors.textSecondary}
                        placeholder="Tipo de servicio"
                        value={service}
                        onChangeText={setService}
                      />
                    ) : (
                      <>
                        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: colors.border }]}>
                          <Feather name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                          <TextInput
                            style={[styles.searchTextInput, { color: colors.textPrimary }]}
                            placeholder="Buscar servicio..."
                            placeholderTextColor={colors.textSecondary}
                            value={serviceSearch}
                            onChangeText={setServiceSearch}
                          />
                          {serviceSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setServiceSearch('')}>
                              <Feather name="x" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={{ position: 'relative', marginTop: 8, marginBottom: 12 }}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingBottom: 8, paddingRight: 36 }}
                            snapToInterval={145 + 12} // card width + gap
                            snapToAlignment="start"
                            decelerationRate="fast"
                          >
                            {filteredServices.length === 0 ? (
                              <Text style={[styles.noResults, { color: colors.textSecondary, width: SCREEN_W - 32, textAlign: 'center', paddingVertical: 20 }]}>
                                No se encontraron servicios
                              </Text>
                            ) : (
                              filteredServices.map((s) => {
                                const isSelected = service === s.name;
                                const cardBg = isSelected
                                  ? colors.accentDim
                                  : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)');
                                const cardBorderColor = isSelected ? colors.accent : colors.border;

                                return (
                                  <TouchableOpacity
                                    key={s.id}
                                    style={{
                                      backgroundColor: cardBg,
                                      borderColor: cardBorderColor,
                                      width: 145,
                                      height: 86,
                                      padding: 12,
                                      borderRadius: 14,
                                      borderWidth: 1.5,
                                      justifyContent: 'space-between',
                                    }}
                                    onPress={() => {
                                      setService(s.name);
                                      if (s.duration_min) {
                                        setDuration(s.duration_min / 60);
                                      }
                                      setPrice(s.price || 0);
                                    }}
                                    activeOpacity={0.8}
                                  >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <View style={{ flex: 1, marginRight: 4 }}>
                                        <Text style={{ color: isSelected ? colors.accent : colors.textPrimary, fontSize: 12, fontFamily: 'Inter_600SemiBold', lineHeight: 15 }} numberOfLines={2}>
                                          {s.name}
                                        </Text>
                                      </View>
                                      {isSelected && (
                                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                                          <Feather name="check" size={10} color={colors.primaryText || '#fff'} />
                                        </View>
                                      )}
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                                      <View style={{
                                        backgroundColor: isSelected
                                          ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                                          : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                      }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? colors.accent : colors.textSecondary, fontFamily: 'Inter_700Bold' }}>
                                          ${Math.round(s.price)}
                                        </Text>
                                      </View>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })
                            )}
                          </ScrollView>
                          <View style={styles.fadeOverlay} pointerEvents="none">
                            <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.05 }} />
                            <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.15 }} />
                            <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.25 }} />
                            <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.50 }} />
                            <View style={{ width: 12, height: '100%', backgroundColor: bg, opacity: 0.75 }} />
                          </View>
                        </View>
                      </>
                    )}
                  </>
                )}

                {isBlockedSlot && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Motivo del bloqueo</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholderTextColor={colors.textSecondary}
                      placeholder="Almuerzo, descanso, reunión..."
                      value={service}
                      onChangeText={setService}
                    />
                  </>
                )}

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha</Text>
                    <TouchableOpacity
                      style={[
                        styles.input,
                        {
                          backgroundColor: inputBg,
                          borderColor: colors.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        },
                      ]}
                      onPress={() => setShowCalendarModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                        {formatFriendlyDate(date) || 'Selecciona una fecha'}
                      </Text>
                      <Feather name="calendar" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isBlockedSlot ? (
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Desde (Hora de inicio)</Text>
                    <TimeWheelPicker
                      openingHour={pickerOpeningHour}
                      closingHour={pickerClosingHour}
                      selectedSlot={formatHour(startHour)}
                      onSlotSelect={(slot) => {
                        const parts = slot.split(':');
                        const h = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const newStart = h + m / 60;
                        setStartHour(newStart);
                        if (endHour <= newStart) {
                          const newEnd = Math.min(pickerClosingHour, newStart + 1);
                          setEndHour(newEnd);
                          setDuration(newEnd - newStart);
                        } else {
                          setDuration(endHour - newStart);
                        }
                      }}
                      busyIntervals={combinedBusyIntervals}
                      durationMinutes={10}
                      isDarkMode={isDarkMode}
                      closedAfter={pickerClosedAfter}
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Hasta (Hora de término)</Text>
                    <TimeWheelPicker
                      openingHour={pickerOpeningHour}
                      closingHour={pickerClosingHour}
                      selectedSlot={formatHour(endHour)}
                      onSlotSelect={(slot) => {
                        const parts = slot.split(':');
                        const h = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        const newEnd = h + m / 60;
                        setEndHour(newEnd);
                        setDuration(newEnd - startHour);
                      }}
                      busyIntervals={[]}
                      durationMinutes={10}
                      isDarkMode={isDarkMode}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Hora</Text>
                    <TimeWheelPicker
                      openingHour={pickerOpeningHour}
                      closingHour={pickerClosingHour}
                      selectedSlot={formatHour(startHour)}
                      onSlotSelect={(slot) => {
                        const parts = slot.split(':');
                        const h = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10);
                        setStartHour(h + m / 60);
                      }}
                      busyIntervals={combinedBusyIntervals}
                      durationMinutes={duration * 60}
                      isDarkMode={isDarkMode}
                      closedAfter={pickerClosedAfter}
                    />
                  </>
                )}

                {role !== 'worker' && workers.length > 0 && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Trabajador</Text>
                    <View style={styles.pills}>
                      {workers.map((w) => (
                        <TouchableOpacity
                          key={w.id}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: selectedWorkerId === w.id ? colors.accentDim : inputBg,
                              borderColor: selectedWorkerId === w.id ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedWorkerId(w.id)}
                        >
                          <Feather
                            name="user"
                            size={14}
                            color={selectedWorkerId === w.id ? colors.accent : colors.textSecondary}
                            style={{ marginRight: 2 }}
                          />
                          <Text style={[styles.pillText, { color: selectedWorkerId === w.id ? colors.accent : colors.textPrimary }]}>{w.name.split(' ')[0]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryText} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>
                      {mode === 'edit' ? 'Guardar cambios' : 'Guardar cita'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : appointment ? (
              role === 'client' && appointment.client_id !== profile?.id ? (
                <>
                  <View style={styles.detailHeader}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={[styles.detailServiceLabel, { color: colors.textSecondary }]}>SERVICIO</Text>
                      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                        {appointment.status === 'blocked' ? 'BLOQUEADO' : 'RESERVADO'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                        },
                      ]}
                    >
                      <Feather name="lock" size={12} color={colors.textSecondary} />
                      <Text style={[styles.statusText, { color: colors.textSecondary, fontWeight: '700' }]}>
                        {appointment.status === 'blocked' ? 'BLOQUEADO' : 'OCUPADO'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 24 }]}
                    onPress={() => sheetRef.current?.close()}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.saveBtnText, { color: colors.textPrimary }]}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.detailHeader}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                      <Text style={[styles.detailServiceLabel, { color: colors.textSecondary }]}>SERVICIO</Text>
                      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{appointment.service}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_CONFIG[appointment.status]?.bg ?? colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: STATUS_CONFIG[appointment.status]?.text ?? colors.textPrimary, fontWeight: '700' }]}>
                        {STATUS_CONFIG[appointment.status]?.label?.toUpperCase() ?? appointment.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <BlurView
                    intensity={isDarkMode ? 15 : 40}
                    tint={isDarkMode ? 'dark' : 'light'}
                    style={[
                      styles.premiumCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                        overflow: 'hidden'
                      }
                    ]}
                  >
                    {/* Date & Time Row */}
                    <View style={styles.premiumDetailRow}>
                      <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                        <Feather name="calendar" size={18} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Fecha y Hora</Text>
                        <Text style={[styles.premiumValue, { color: colors.textPrimary }]}>
                          {appointment.date}  •  {formatHour(appointment.startHour)} hs
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Duration Row */}
                    <View style={styles.premiumDetailRow}>
                      <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}>
                        <Feather name="clock" size={18} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Duración</Text>
                        <Text style={[styles.premiumValue, { color: colors.textPrimary }]}>
                          {appointment.durationHours >= 1
                            ? `${appointment.durationHours} ${appointment.durationHours === 1 ? 'hora' : 'horas'}`
                            : `${appointment.durationHours * 60} minutos`}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Client Row */}
                    <View style={styles.premiumDetailRow}>
                      <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)' }]}>
                        <Feather name="user" size={18} color="#A855F7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Cliente</Text>
                        <Text style={[styles.premiumValue, { color: colors.textPrimary, fontWeight: '600' }]}>
                          {appointment.clientName}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Worker Row */}
                    <View style={styles.premiumDetailRow}>
                      <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? 'rgba(48, 209, 88, 0.15)' : 'rgba(48, 209, 88, 0.1)' }]}>
                        <Feather name="users" size={18} color="#30D158" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Profesional asignado</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.smallDot, { backgroundColor: '#30D158' }]} />
                          <Text style={[styles.premiumValue, { color: colors.textPrimary, fontWeight: '600' }]}>
                            {appointment.worker}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </BlurView>

                  {role === 'client' && appointment.reschedule_count && appointment.reschedule_count >= 1 ? (
                    <Text style={{ fontSize: 12, color: '#DC2626', textAlign: 'center', marginTop: 12, fontFamily: 'Inter_500Medium' }}>
                      * Ya has reagendado esta cita. Límite de 1 reagendamiento permitido.
                    </Text>
                  ) : null}

                  <View style={[styles.actions, { flexDirection: 'row', gap: 8, width: '100%', marginTop: 20 }]}>
                    {/* 1. Primary Action (Confirmar or Completar) */}
                    {role !== 'client' && role !== 'admin' && appointment.status !== 'blocked' && (
                      <>
                        {appointment.status === 'pending' && (
                          <ActionBtn
                            label="Confirmar"
                            color="#2E7D45"
                            onPress={() => handleStatusChange('confirmed')}
                            saving={saving}
                            style={{ flex: 1.4 }}
                          />
                        )}
                        {appointment.status === 'confirmed' && (
                          <ActionBtn
                            label="Completar"
                            color="#2563EB"
                            onPress={() => handleStatusChange('completed')}
                            saving={saving}
                            style={{ flex: 1.4 }}
                          />
                        )}
                      </>
                    )}

                    {/* 2. Secondary Actions (Editar, Eliminar) */}
                    {canEditOrCancel && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      (role !== 'client' || !appointment.reschedule_count || appointment.reschedule_count < 1) ? (
                        <ActionBtn
                          label="Editar"
                          color="#fda428ff"
                          onPress={() => {
                            setMode('edit');
                            setClientName(appointment.clientName);
                            setService(appointment.service);
                            setServiceSearch('');
                            setDate(appointment.date ?? '');
                            if (appointment.date) {
                              const parsed = parseDateString(appointment.date);
                              setCalendarYear(parsed.getFullYear());
                              setCalendarMonth(parsed.getMonth());
                            }
                            setStartHour(appointment.startHour);
                            setDuration(appointment.durationHours);
                            setEndHour(appointment.startHour + appointment.durationHours);
                            setSelectedWorkerId(appointment.worker_id);
                            setIsBlockedSlot(appointment.status === 'blocked');
                            setPrice(appointment.price || 0);
                            sheetRef.current?.snapToIndex(1);
                          }}
                          saving={saving}
                          style={{ flex: 1 }}
                        />
                      ) : null
                    )}

                    {canEditOrCancel && (
                      <ActionBtn
                        label={appointment.status === 'blocked' ? 'Desbloquear' : 'Eliminar'}
                        color="#DC2626"
                        onPress={handleDelete}
                        saving={saving}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
                </>
              )
            ) : null}
          </BottomSheetScrollView>
        </BottomSheet>

        <GlassModal visible={showCalendarModal} onClose={() => setShowCalendarModal(false)}>
          <View style={{ width: '100%', gap: 16 }}>
            {/* Header: Month and Chevrons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  setCalendarMonth((prev) => {
                    if (prev === 0) {
                      setCalendarYear((y) => y - 1);
                      return 11;
                    }
                    return prev - 1;
                  });
                }}
                style={{ padding: 8, borderRadius: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                <Feather name="chevron-left" size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.textPrimary, textTransform: 'capitalize' }}>
                {new Date(calendarYear, calendarMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setCalendarMonth((prev) => {
                    if (prev === 11) {
                      setCalendarYear((y) => y + 1);
                      return 0;
                    }
                    return prev + 1;
                  });
                }}
                style={{ padding: 8, borderRadius: 8, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              >
                <Feather name="chevron-right" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, index) => (
                <View key={index} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, opacity: 0.7 }}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
              {getDayMonthGrid(calendarYear, calendarMonth).map((d, index) => {
                const dStr = toLocalISO(d);
                const isSelected = date === dStr;
                const isCurrentMonth = d.getMonth() === calendarMonth;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = d < today;
                const isTodayDate = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
                const isDisabled = isPast;

                return (
                  <TouchableOpacity
                    key={index}
                    disabled={isDisabled}
                    style={{
                      width: `${100 / 7}%`,
                      aspectRatio: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => {
                      setDate(dStr);
                      if (onDateChange) {
                        onDateChange(dStr);
                      }
                      setShowCalendarModal(false);
                    }}
                  >
                    <View
                      style={[
                        {
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        },
                        isSelected && {
                          backgroundColor: colors.accent,
                        },
                        isTodayDate && !isSelected && {
                          borderWidth: 1,
                          borderColor: colors.accent,
                        }
                      ]}
                    >
                      <Text
                        style={[
                          {
                            fontSize: 13,
                            fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_500Medium',
                            color: isSelected
                              ? (colors.primaryText || '#fff')
                              : isCurrentMonth
                                ? colors.textPrimary
                                : colors.textSecondary,
                          },
                          !isCurrentMonth && !isSelected && {
                            opacity: 0.35,
                          },
                          isDisabled && {
                            color: colors.textSecondary,
                            opacity: 0.25,
                            textDecorationLine: 'line-through',
                          }
                        ]}
                      >
                        {d.getDate()}
                      </Text>

                      {isTodayDate && isSelected && (
                        <View style={{
                          position: 'absolute',
                          bottom: 3,
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.primaryText || '#fff'
                        }} />
                      )}

                      {isTodayDate && !isSelected && (
                        <View style={{
                          position: 'absolute',
                          bottom: 3,
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.accent
                        }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCalendarModal(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassModal>
      </>
    );
  },
);

AppointmentModal.displayName = 'AppointmentModal';

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon as any} size={16} color={colors.textSecondary} style={{ width: 20 }} />
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({
  label,
  color,
  textColor,
  onPress,
  saving,
  style,
}: {
  label: string;
  color: string;
  textColor?: string;
  onPress: () => void;
  saving: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const finalTextColor = textColor || '#FFFFFF';
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        {
          backgroundColor: color,
          borderColor: color,
          opacity: saving ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.75}
    >
      <Text style={[styles.actionBtnText, { color: finalTextColor, textAlign: 'center', fontWeight: '700' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default AppointmentModal;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Varien',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  readOnly: {
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 4,
  },
  listContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  serviceSubText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  noResults: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingVertical: 20,
  },
  fadeOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 36,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  workerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  saveBtn: {
    marginTop: 28,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Varien',
    letterSpacing: 0.5,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 28,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  detailServiceLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  premiumCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  premiumDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  premiumValue: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    height: 1,
    opacity: 0.3,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
