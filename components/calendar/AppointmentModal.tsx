import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
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
import { useIsGym } from '../../hooks/useIsGym';
import { ToastOptions } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import TimeWheelPicker from '../TimeWheelPicker';

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

export type AppointmentModalHandle = {
  open: (payload: OpenCreatePayload | OpenDetailPayload) => void;
  close: () => void;
};

type Props = {
  workers: WorkerRow[];
  businessId: string;
  onSaved: () => void;
  showToast: (opts: ToastOptions) => void;
};

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

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatHour(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${pad(hrs)}:${pad(mins)}`;
}

const AppointmentModal = forwardRef<AppointmentModalHandle, Props>(
  ({ workers, businessId, onSaved, showToast }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const { colors, isDarkMode } = useTheme();
    const { profile } = useAuth();
    const role = profile?.role ?? 'client';
    const { showAlert } = useAlert();
    const isGym = useIsGym();

    const snapPoints = useMemo(() => ['55%', '92%'], []);

    const [mode, setMode] = useState<ModalMode>('create');
    const [appointment, setAppointment] = useState<Appointment | null>(null);

    const canEditOrCancel = useMemo(() => {
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
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [isBlockedSlot, setIsBlockedSlot] = useState(false);
    const [busyIntervals, setBusyIntervals] = useState<{ start: number; end: number }[]>([]);
    const [businessServices, setBusinessServices] = useState<{ id: string; name: string; price: number; duration_min: number }[]>([]);

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
      if (!date || !businessId || mode !== 'create') return;
      const workerForQuery = role === 'worker'
        ? (workers.find(w => w.user_id === profile?.id)?.id ?? workers[0]?.id)
        : (selectedWorkerId ?? workers[0]?.id);

      if (!workerForQuery) return;

      supabase
        .from('appointments')
        .select('start_hour, duration_hours')
        .eq('date', date)
        .eq('worker_id', workerForQuery)
        .neq('status', 'cancelled')
        .then(({ data, error }) => {
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
    }, [date, selectedWorkerId, workers, businessId, role, profile?.id, mode]);

    useImperativeHandle(ref, () => ({
      open(payload) {
        if (payload.mode === 'create') {
          setMode('create');
          setDate(payload.date);
          setStartHour(payload.startHour ?? 9);
          setIsBlockedSlot(false);
          setClientName(role === 'client' ? (profile?.nickname ?? '') : '');
          setService(isGym ? 'CLASE' : '');
          setServiceSearch('');
          setDuration(1);
          if (role === 'worker') {
            const selfWorker = workers.find((w) => w.user_id === profile?.id) ?? workers[0];
            setSelectedWorkerId(payload.workerId ?? selfWorker?.id ?? null);
          } else {
            setSelectedWorkerId(payload.workerId ?? workers[0]?.id ?? null);
          }
          setAppointment(null);
        } else {
          setMode('detail');
          setAppointment(payload.appointment);
        }
        sheetRef.current?.snapToIndex(0);
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
      if (!isBlockedSlot && (!clientName.trim() || !service.trim())) {
        showAlert({
          title: 'Campos incompletos',
          message: 'Por favor, completa el nombre del cliente y el tipo de servicio antes de guardar.',
        });
        return;
      }

      const hrs = Math.floor(startHour);
      const mins = Math.round((startHour - hrs) * 60);
      const apptDate = new Date(date + 'T' + pad(hrs) + ':' + pad(mins) + ':00');
      const now = new Date();

      if (!isBlockedSlot) {
        // 1. Past dates check for clients and workers
        if (role !== 'company' && apptDate.getTime() < now.getTime()) {
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

      // 3. Business hours constraint (07:00 to 22:00)
      if (startHour < 7 || startHour + duration > 22) {
        showAlert({
          title: 'Fuera de horario laboral',
          message: 'El horario seleccionado se encuentra fuera de la jornada laboral establecida (07:00 - 22:00).',
        });
        return;
      }

      // 4. Gym membership cap validation for clients
      if (!isBlockedSlot && isGym && role === 'client') {
        // Query active membership
        const { data: membership, error: memError } = await supabase
          .from('gym_memberships')
          .select('*')
          .eq('business_id', businessId)
          .eq('client_id', profile?.id)
          .maybeSingle();

        if (memError || !membership || membership.status !== 'active') {
          showAlert({
            title: 'Membresía inactiva',
            message: 'No cuentas con una membresía activa en este gimnasio. Por favor acércate a recepción para habilitar tu cuenta.',
          });
          return;
        }

        // Active plan weekly class check
        const PLAN_LIMITS: Record<string, number> = { basic: 1, premium: 3, vip: 5 };
        const limit = PLAN_LIMITS[membership.plan] ?? 1;

        // Calculate Monday-to-Sunday dates for the selected week
        const d = new Date(apptDate);
        const day = d.getDay();
        const diffDays = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diffDays));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const isoStart = monday.toISOString().split('T')[0];
        const isoEnd = sunday.toISOString().split('T')[0];

        // Fetch counts for this client in this target week
        const { count: weekCount, error: countError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('client_id', profile?.id)
          .gte('date', isoStart)
          .lte('date', isoEnd)
          .in('status', ['confirmed', 'pending']);

        if (!countError && weekCount !== null && weekCount >= limit) {
          showAlert({
            title: 'Límite de plan alcanzado',
            message: `Has alcanzado el límite semanal de clases permitido por tu plan ${membership.plan.toUpperCase()} (${limit} ${limit === 1 ? 'clase' : 'clases'} por semana).`,
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
        .from('appointments')
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
      const { error } = await supabase
        .from('appointments')
        .update({
          client_name: isBlockedSlot ? 'Bloqueo de horario' : clientName.trim(),
          service: isBlockedSlot ? (service.trim() || 'Bloqueo') : service.trim(),
          date,
          start_hour: startHour,
          duration_hours: duration,
          worker_id: workerIdVal,
          price: isBlockedSlot ? 0 : price,
        })
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

    const bg = isDarkMode ? '#1C1C1E' : '#F2F2F7';
    const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const filteredServices = useMemo(() => {
      if (!serviceSearch.trim()) return businessServices;
      return businessServices.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
      );
    }, [businessServices, serviceSearch]);

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: bg }}
        handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
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
                      setService(isGym ? 'CLASE' : '');
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

                      <View style={[styles.listContainer, { borderColor: colors.border, backgroundColor: inputBg }]}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                          {filteredServices.length === 0 ? (
                            <Text style={[styles.noResults, { color: colors.textSecondary }]}>No se encontraron servicios</Text>
                          ) : (
                            filteredServices.map((s) => {
                              const isSelected = service === s.name;
                              return (
                                <TouchableOpacity
                                  key={s.id}
                                  style={[
                                    styles.serviceRow,
                                    {
                                      backgroundColor: isSelected ? colors.accent + '22' : 'transparent',
                                      borderBottomColor: colors.border,
                                    },
                                  ]}
                                  onPress={() => {
                                    setService(s.name);
                                    if (s.duration_min) {
                                      setDuration(s.duration_min / 60);
                                    }
                                    setPrice(s.price || 0);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.serviceName, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                                      {s.name}
                                    </Text>
                                    <Text style={[styles.serviceSubText, { color: colors.textSecondary }]}>
                                      {s.duration_min} min • ${Math.round(s.price)}
                                    </Text>
                                  </View>
                                  {isSelected && (
                                    <Feather name="check" size={18} color={colors.accent} />
                                  )}
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </ScrollView>
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {mode === 'edit' ? 'Fecha (AAAA-MM-DD)' : 'Fecha'}
                  </Text>
                  {mode === 'edit' ? (
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholderTextColor={colors.textSecondary}
                      placeholder="AAAA-MM-DD"
                      value={date}
                      onChangeText={setDate}
                    />
                  ) : (
                    <View style={[styles.input, styles.readOnly, { backgroundColor: inputBg, borderColor: colors.border }]}>
                      <Text style={{ color: colors.textPrimary }}>{date}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Hora</Text>
              <TimeWheelPicker
                openingHour={7}
                closingHour={22}
                selectedSlot={formatHour(startHour)}
                onSlotSelect={(slot) => {
                  const parts = slot.split(':');
                  const h = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10);
                  setStartHour(h + m / 60);
                }}
                busyIntervals={busyIntervals}
                durationMinutes={duration * 60}
                isDarkMode={isDarkMode}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Duración</Text>
              <View style={{ position: 'relative' }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 36, paddingBottom: 4 }}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: duration === opt.value ? colors.accent : inputBg,
                          borderColor: duration === opt.value ? colors.accent : colors.border,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setDuration(opt.value)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: duration === opt.value ? colors.primaryText : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.fadeOverlay} pointerEvents="none">
                  <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.05 }} />
                  <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.15 }} />
                  <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.25 }} />
                  <View style={{ width: 8, height: '100%', backgroundColor: bg, opacity: 0.50 }} />
                  <View style={{ width: 12, height: '100%', backgroundColor: bg, opacity: 0.75 }} />
                </View>
              </View>

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
                            backgroundColor: selectedWorkerId === w.id ? w.color + '33' : inputBg,
                            borderColor: selectedWorkerId === w.id ? w.color : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedWorkerId(w.id)}
                      >
                        <View style={[styles.workerDot, { backgroundColor: w.color }]} />
                        <Text style={[styles.pillText, { color: colors.textPrimary }]}>{w.name.split(' ')[0]}</Text>
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
                      {appointment.status === 'blocked' ? 'Horario Bloqueado' : 'Reservado'}
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

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                    borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    gap: 10,
                  }}
                >
                  <Feather name="info" size={16} color="#3B82F6" />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
                    Este espacio ya está reservado. Los detalles específicos del cliente y del servicio no están visibles por motivos de privacidad.
                  </Text>
                </View>

                <BlurView
                  intensity={isDarkMode ? 15 : 40}
                  tint={isDarkMode ? 'dark' : 'light'}
                  style={[
                    styles.premiumCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                      overflow: 'hidden',
                    },
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

                  {/* Worker Row */}
                  <View style={styles.premiumDetailRow}>
                    <View style={[styles.iconContainer, { backgroundColor: appointment.workerColor + '25' }]}>
                      <Feather name="users" size={18} color={appointment.workerColor || colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Profesional asignado</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.smallDot, { backgroundColor: appointment.workerColor }]} />
                        <Text style={[styles.premiumValue, { color: colors.textPrimary, fontWeight: '600' }]}>
                          {appointment.worker}
                        </Text>
                      </View>
                    </View>
                  </View>
                </BlurView>

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
                        {appointment.durationHours * 60} minutos
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
                    <View style={[styles.iconContainer, { backgroundColor: appointment.workerColor + '25' }]}>
                      <Feather name="users" size={18} color={appointment.workerColor || colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.premiumLabel, { color: colors.textSecondary }]}>Profesional asignado</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.smallDot, { backgroundColor: appointment.workerColor }]} />
                        <Text style={[styles.premiumValue, { color: colors.textPrimary, fontWeight: '600' }]}>
                          {appointment.worker}
                        </Text>
                      </View>
                    </View>
                  </View>
                </BlurView>

                <View style={[styles.actions, { flexDirection: 'row', gap: 8, width: '100%', marginTop: 20 }]}>
                  {/* 1. Primary Action (Confirmar or Completar) */}
                  {role !== 'client' && appointment.status !== 'blocked' && (
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
                    <ActionBtn
                      label="Editar"
                      color="#fda428ff"
                      onPress={() => {
                        setMode('edit');
                        setClientName(appointment.clientName);
                        setService(appointment.service);
                        setServiceSearch('');
                        setDate(appointment.date ?? '');
                        setStartHour(appointment.startHour);
                        setDuration(appointment.durationHours);
                        setSelectedWorkerId(appointment.worker_id);
                        setIsBlockedSlot(appointment.status === 'blocked');
                        setPrice(appointment.price || 0);
                      }}
                      saving={saving}
                      style={{ flex: 1 }}
                    />
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
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
