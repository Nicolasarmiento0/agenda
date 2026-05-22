import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Appointment, WorkerRow } from '../../constants/appointments';
import { supabase } from '../../lib/supabase';
import { appColors, glassColors } from '../../styles/appStyles';
import { useTheme } from '../../context/ThemeContext';
import TimeWheelPicker from '../TimeWheelPicker';
import { toLocalISOString } from './agendaHelpers';

type Role = 'company' | 'worker' | 'client';
type Colors = { textPrimary: string; textSecondary: string; border: string };

const DEFAULT_SERVICES = [
  { id: 'p1', name: 'Servicio 1', price: 0 },
  { id: 'p2', name: 'Servicio 2', price: 0 },
  { id: 'p3', name: 'Servicio 3', price: 0 },
];

const GYM_SERVICES = [
  { id: 'g1', name: 'CLASE', price: 0 },
  { id: 'g2', name: 'Taller Extraprogramático', price: 0 },
  { id: 'g3', name: 'Evaluación', price: 0 },
];

type Props = {
  visible: boolean;
  role: Role;
  initialData?: Appointment;
  isRescheduling?: boolean;
  onClose: () => void;
  onSave: (appt: Partial<Appointment>) => Promise<boolean>;
  businessId: string;
  workers: WorkerRow[];
  selectedDateStr: string;
  openingHour: number;
  closingHour: number;
  allowBlocking?: boolean;
  isGym?: boolean;
  showAlert: (opts: { title: string; message: string }) => void;
  colors: Colors;
};

export default function AppointmentFormModal({
  visible,
  role,
  initialData,
  isRescheduling,
  onClose,
  onSave,
  businessId,
  workers,
  selectedDateStr,
  openingHour,
  closingHour,
  allowBlocking = true,
  isGym = false,
  showAlert,
  colors,
}: Props) {
  const { isDarkMode } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
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
  const [notes, setNotes] = useState('');
  const [pickerScrollEnabled, setPickerScrollEnabled] = useState(true);
  const formScrollRef = useRef<ScrollView>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);

  const canBlock = role !== 'client' && allowBlocking;
  const showClientName = role !== 'client';

  useEffect(() => {
    if (!visible || !businessId) return;
    if (isGym) {
      setServices(GYM_SERVICES);
      return;
    }
    const fetchServices = async () => {
      try {
        const { data: bizServices, error: bizError } = await supabase
          .from('business_services')
          .select('name, price')
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (!bizError && bizServices && bizServices.length > 0) {
          setServices(bizServices);
          return;
        }

        const { data: bizData } = await supabase
          .from('businesses')
          .select('category_id')
          .eq('id', businessId)
          .single();

        if (bizData?.category_id) {
          const { data: catServices } = await supabase
            .from('catalog_services')
            .select('name')
            .eq('category_id', bizData.category_id);

          if (catServices && catServices.length > 0) {
            setServices(catServices.map((s: { name: string }) => ({ id: s.name, name: s.name, price: 0 })));
            return;
          }
        }

        setServices(DEFAULT_SERVICES);
      } catch {
        setServices(DEFAULT_SERVICES);
      }
    };
    fetchServices();
  }, [visible, businessId, isGym]);

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
        setNotes(initialData.notes || '');
      } else {
        setClientName('');
        setService('');
        setWorkerId('');
        setSelectedSlot(`${String(openingHour).padStart(2, '0')}:00`);
        setEndSlot(`${String(Math.min(openingHour + 1, closingHour - 1)).padStart(2, '0')}:00`);
        setDateText(selectedDateStr);
        setIsBlocking(false);
        setNotes('');
      }
      setLoading(false);
      setShowCalendar(false);
    }
  }, [visible, initialData, selectedDateStr, openingHour, closingHour]);

  useEffect(() => {
    if (!workerId || !dateText || !businessId) {
      setBusyIntervals([]);
      return;
    }
    setSlotsLoading(true);
    supabase
      .from('appointments')
      .select('id, start_hour, duration_hours')
      .eq('business_id', businessId)
      .eq('worker_id', workerId)
      .eq('date', dateText)
      .in('status', ['confirmed', 'pending', 'rescheduled'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        const intervals = (data ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((a: any) => a.id !== initialData?.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((a: any) => ({ start: Number(a.start_hour), end: Number(a.start_hour) + Number(a.duration_hours) }));
        setBusyIntervals(intervals);
        setSlotsLoading(false);
      });
  }, [workerId, dateText, businessId, initialData?.id]);

  const validateRoleRules = useCallback((
    startHour: number,
    endHourCalc: number,
    durationHours: number,
    dateText: string,
  ): boolean => {
    const now = new Date();
    const todayStr = toLocalISOString(now);
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toLocalISOString(tomorrow);
    const isFirstBlock = Math.abs(startHour - openingHour) <= 0.25;

    if (role === 'worker') {
      if (dateText === todayStr && startHour <= currentHour + 1) {
        showAlert({ title: 'Hora inválida', message: 'Debes agendar con al menos 1 hora de anticipación.' });
        return false;
      }
      if (durationHours > 5) {
        showAlert({ title: 'Hora inválida', message: 'Las citas no pueden durar más de 5 horas.' });
        return false;
      }
      if (isFirstBlock) {
        if (dateText === todayStr) {
          showAlert({ title: 'Hora no disponible', message: 'El primer bloque del día solo puede agendarse hasta las 22:00 del día anterior.' });
          return false;
        }
        if (dateText === tomorrowStr && currentHour >= 22) {
          showAlert({ title: 'Hora no disponible', message: 'El primer bloque del día solo puede agendarse hasta las 22:00 del día anterior.' });
          return false;
        }
      }
    }

    if (role === 'client') {
      const [yStr, mStr, dStr] = dateText.split('-');
      const [hhStr, mmStr] = (selectedSlot ?? '00:00').split(':');
      const apptDateTime = new Date(
        parseInt(yStr, 10),
        parseInt(mStr, 10) - 1,
        parseInt(dStr, 10),
        parseInt(hhStr, 10),
        parseInt(mmStr || '0', 10),
        0,
      );
      const diffHours = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < 2) {
        showAlert({ title: 'Reserva no permitida', message: 'Debes reservar con al menos 2 horas de anticipación.' });
        return false;
      }
      if (isFirstBlock) {
        if (dateText === todayStr) {
          showAlert({ title: 'Hora no disponible', message: 'El primer bloque del día solo puede agendarse hasta las 22:00 del día anterior.' });
          return false;
        }
        if (dateText === tomorrowStr && currentHour >= 22) {
          showAlert({ title: 'Hora no disponible', message: 'El primer bloque del día solo puede agendarse hasta las 22:00 del día anterior.' });
          return false;
        }
      }
    }

    if (startHour < openingHour || endHourCalc > closingHour) {
      showAlert({
        title: 'Fuera de horario',
        message: `La cita debe estar dentro del horario de atención (${String(openingHour).padStart(2, '0')}:00 a ${String(closingHour).padStart(2, '0')}:00).`,
      });
      return false;
    }

    return true;
  }, [role, openingHour, closingHour, selectedSlot, showAlert]);

  const handleSave = async () => {
    if (loading) return;

    if (!isBlocking) {
      if (showClientName && !clientName.trim()) {
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
    const startHour = parseInt(hhStr, 10) + parseInt(mmStr || '0', 10) / 60;
    const [ehStr, emStr] = endSlot.split(':');
    const endHourCalc = parseInt(ehStr, 10) + parseInt(emStr || '0', 10) / 60;
    const durationHours = endHourCalc - startHour;

    if (durationHours <= 0) {
      showAlert({ title: 'Hora inválida', message: 'La hora de fin debe ser posterior a la de inicio.' });
      return;
    }

    const todayStr = toLocalISOString(new Date());
    if (dateText < todayStr) {
      showAlert({ title: 'Fecha inválida', message: 'No puedes agendar citas para fechas que ya pasaron.' });
      return;
    }

    if (!validateRoleRules(startHour, endHourCalc, durationHours, dateText)) return;

    setLoading(true);
    const selectedServiceObj = services.find((s: { name: string }) => s.name === (service || 'Servicio'));
    const price = selectedServiceObj ? Number(selectedServiceObj.price || 0) : 0;

    const success = await onSave({
      clientName: isBlocking ? (clientName || 'No disponible') : clientName,
      service: isBlocking ? 'BLOQUEO' : service,
      worker_id: workerId,
      startHour,
      durationHours,
      date: dateText,
      price,
      notes: notes.trim() || undefined,
    });
    setLoading(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); onClose(); }, 1400);
    }
  };

  if (!visible) return null;

  const durationForPicker = (() => {
    if (!selectedSlot || !endSlot) return 60;
    const [sh, sm] = selectedSlot.split(':').map(Number);
    const [eh, em] = endSlot.split(':').map(Number);
    return Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
  })();

  const inputStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDarkMode ? glassColors.borderDarkStrong : glassColors.borderLightStrong,
    backgroundColor: isDarkMode ? glassColors.surfaceDark : glassColors.surfaceLight,
    marginBottom: 4,
  };

  const todayStr = toLocalISOString(new Date());
  const sheetBg = isDarkMode ? glassColors.sheetDark : glassColors.sheetLight;
  const sheetBorder = isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle;
  const SHEET_MAX_HEIGHT = Math.min(screenHeight * 0.78, 660);
  const SCROLL_MAX_HEIGHT = SHEET_MAX_HEIGHT - 20;

  const modalTitle = (() => {
    if (isRescheduling) return 'Reprogramar cita';
    if (initialData) return 'Editar cita';
    if (isBlocking) return 'Bloquear horario';
    if (role === 'client') return 'Solicitar cita';
    return 'Nueva cita';
  })();

  const notesLabel = role === 'client' ? 'MENSAJE PARA EL NEGOCIO (OPCIONAL)' : 'NOTAS INTERNAS (OPCIONAL)';
  const notesPlaceholder = role === 'client' ? 'Agrega información adicional...' : 'Notas para el equipo...';

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.overlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

          {showSuccess && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}>
              <View style={[styles.successCard, { overflow: 'hidden' }]}>
                <BlurView intensity={isDarkMode ? 70 : 85} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, {
                  backgroundColor: isDarkMode ? 'rgba(12,18,12,0.5)' : 'rgba(240,255,240,0.5)',
                  borderRadius: 24,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(61,158,90,0.4)',
                }]} />
                <Feather name="check-circle" size={52} color="#3D9E5A" />
                <Text style={[styles.successTitle, { color: colors.textPrimary }]}>¡Listo!</Text>
                <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                  {isBlocking ? 'Horario bloqueado' : role === 'client' ? 'Cita solicitada' : 'Cita agendada'}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.sheet, { overflow: 'hidden', maxHeight: SHEET_MAX_HEIGHT }]}>
            <BlurView
              intensity={isDarkMode ? 65 : 85}
              tint={isDarkMode ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
            />
            <View style={[StyleSheet.absoluteFill, {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: sheetBg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: sheetBorder,
            }]} />

            <View style={[styles.handle, { backgroundColor: isDarkMode ? glassColors.handleDark : glassColors.handleLight }]} />

            <ScrollView
              ref={formScrollRef}
              style={{ maxHeight: SCROLL_MAX_HEIGHT }}
              scrollEnabled={pickerScrollEnabled}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 48 : 32 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{modalTitle}</Text>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Toggle bloqueo — solo company/worker en cita nueva */}
              {canBlock && !initialData && (
                <TouchableOpacity
                  onPress={() => { setIsBlocking(!isBlocking); setClientName(''); }}
                  style={[styles.blockToggle, {
                    borderColor: isBlocking ? 'rgba(227,25,55,0.4)' : sheetBorder,
                    backgroundColor: isBlocking ? 'rgba(227,25,55,0.1)' : 'transparent',
                  }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, {
                    borderColor: isBlocking ? appColors.primary : colors.textSecondary,
                    backgroundColor: isBlocking ? appColors.primary : 'transparent',
                  }]}>
                    {isBlocking && <Feather name="lock" size={10} color="#111827" />}
                  </View>
                  <Text style={[styles.blockToggleText, { color: isBlocking ? appColors.primary : colors.textSecondary }]}>
                    Bloquear este horario
                  </Text>
                </TouchableOpacity>
              )}

              {/* Nombre del cliente — visible para company y worker */}
              {showClientName && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {isBlocking ? 'RAZÓN (OPCIONAL)' : 'CLIENTE'}
                  </Text>
                  <TextInput
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={[inputStyle, { color: colors.textPrimary, justifyContent: 'flex-start' } as any]}
                    value={clientName}
                    onChangeText={setClientName}
                    placeholderTextColor={isDarkMode ? glassColors.placeholderDark : glassColors.placeholderLight}
                    placeholder={isBlocking ? 'Ej: Colación, Descanso...' : 'Nombre del cliente'}
                  />
                </>
              )}

              {!isBlocking && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>SERVICIO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 8 }}>
                    {services.map((s, index) => (
                      <TouchableOpacity
                        key={s.id || `${s.name}-${index}`}
                        onPress={() => setService(s.name)}
                        style={[styles.serviceChip, {
                          backgroundColor: service === s.name ? appColors.primary : (isDarkMode ? glassColors.surfaceDark : glassColors.surfaceLight),
                          borderColor: service === s.name ? appColors.primary : (isDarkMode ? glassColors.borderDarkStrong : glassColors.borderLightSubtle),
                        }]}
                      >
                        <Text style={[styles.serviceChipText, { color: service === s.name ? '#111827' : colors.textSecondary }]}>
                          {s.name}{s.price > 0 ? `  $${Number(s.price).toLocaleString('es-CL')}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>PROFESIONAL</Text>
              <View style={styles.workerRow}>
                {workers.map((w) => {
                  const selected = workerId === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setWorkerId(w.id)}
                      activeOpacity={0.8}
                      style={[styles.workerCircle, {
                        backgroundColor: w.color ?? appColors.primary,
                        borderWidth: selected ? 3 : 1.5,
                        borderColor: selected ? '#fff' : (w.color ?? appColors.primary) + '80',
                        shadowColor: selected ? (w.color ?? appColors.primary) : 'transparent',
                        shadowOpacity: 0.7,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 0 },
                      }]}
                    >
                      <Text style={styles.workerInitial}>{w.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!workerId && (
                <Text style={[styles.workerName, { color: colors.textSecondary }]}>
                  {workers.find((w) => w.id === workerId)?.name ?? ''}
                </Text>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>FECHA</Text>
              <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} style={inputStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="calendar" size={15} color={colors.textSecondary} />
                  <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{dateText || 'Seleccionar fecha'}</Text>
                </View>
                <Feather name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {showCalendar && (
                <View style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: sheetBorder }}>
                  <Calendar
                    minDate={todayStr}
                    onDayPress={(day: { dateString: string }) => { setDateText(day.dateString); setShowCalendar(false); }}
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
                onTouchStart={() => setPickerScrollEnabled(false)}
                onTouchEnd={() => setTimeout(() => setPickerScrollEnabled(true), 600)}
                onTouchCancel={() => setPickerScrollEnabled(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>DESDE</Text>
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
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>HASTA</Text>
                  <TimeWheelPicker
                    openingHour={openingHour}
                    closingHour={closingHour + 1}
                    selectedSlot={endSlot}
                    onSlotSelect={setEndSlot}
                    busyIntervals={[]}
                    durationMinutes={0}
                    isDarkMode={isDarkMode}
                  />
                </View>
              </View>

              {!isBlocking && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{notesLabel}</Text>
                  <TextInput
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={[inputStyle, { color: colors.textPrimary, justifyContent: 'flex-start', minHeight: 72, textAlignVertical: 'top', alignItems: 'flex-start' } as any]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholderTextColor={isDarkMode ? glassColors.placeholderDark : glassColors.placeholderLight}
                    placeholder={notesPlaceholder}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                  />
                </>
              )}

              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[styles.saveBtn, { backgroundColor: appColors.primary, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#111827" />
                  : <Text style={styles.saveBtnText}>
                      {isRescheduling ? 'CONFIRMAR CAMBIO' : initialData ? 'GUARDAR CAMBIOS' : isBlocking ? 'BLOQUEAR' : role === 'client' ? 'SOLICITAR CITA' : 'CONFIRMAR CITA'}
                    </Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: glassColors.overlayHeavy,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: 'Inter_700Bold',
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
    letterSpacing: 2,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
    marginTop: 14,
    paddingHorizontal: 20,
  },
  blockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  serviceChipText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  workerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  workerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  workerName: {
    fontSize: 12,
    letterSpacing: 0.3,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  successCard: {
    width: 200,
    height: 200,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  successSub: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
  },
});
