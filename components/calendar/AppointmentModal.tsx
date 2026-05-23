import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Appointment, AppointmentStatus, STATUS_CONFIG, WorkerRow } from '../../constants/appointments';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useIsGym } from '../../hooks/useIsGym';
import { ToastOptions } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import TimeWheelPicker from '../TimeWheelPicker';

export type ModalMode = 'create' | 'detail';

export type OpenCreatePayload = {
  mode: 'create';
  date: string;
  startHour?: number;
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

    // Create form state
    const [clientName, setClientName] = useState('');
    const [service, setService] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
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
            setSelectedWorkerId(selfWorker?.id ?? null);
          } else {
            setSelectedWorkerId(workers[0]?.id ?? null);
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
      const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id, start_hour, duration_hours')
        .eq('date', date)
        .eq('worker_id', workerForInsert)
        .neq('status', 'cancelled');

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
                  onPress: () => executeInsert(workerForInsert),
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
                  onPress: () => executeInsert(workerForInsert),
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

      await executeInsert(workerForInsert);
    };

    const handleStatusChange = async (newStatus: AppointmentStatus) => {
      if (!appointment) return;

      if (newStatus === 'cancelled') {
        const apptDate = new Date(appointment.date ?? '');
        apptDate.setHours(Math.floor(appointment.startHour), Math.round((appointment.startHour % 1) * 60));
        const diff = apptDate.getTime() - Date.now();
        if (diff < 2 * 60 * 60 * 1000) {
          showToast({ type: 'error', message: 'No puedes cancelar con menos de 2 horas de anticipación' });
          return;
        }
      }

      setSaving(true);
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
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
          {mode === 'create' ? (
            <>
              <Text style={[styles.title, { color: colors.textPrimary, marginBottom: 12 }]}>Nueva cita</Text>

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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Fecha</Text>
                  <View style={[styles.input, styles.readOnly, { backgroundColor: inputBg, borderColor: colors.border }]}>
                    <Text style={{ color: colors.textPrimary }}>{date}</Text>
                  </View>
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
                  <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Guardar cita</Text>
                )}
              </TouchableOpacity>
            </>
          ) : appointment ? (
            <>
              <View style={styles.detailHeader}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{appointment.service}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_CONFIG[appointment.status]?.bg ?? colors.surface },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[appointment.status]?.text ?? colors.textPrimary }]}>
                    {STATUS_CONFIG[appointment.status]?.label ?? appointment.status}
                  </Text>
                </View>
              </View>

              <DetailRow icon="user" label="Cliente" value={appointment.clientName} colors={colors} />
              <DetailRow icon="calendar" label="Fecha" value={appointment.date ?? '-'} colors={colors} />
              <DetailRow icon="clock" label="Hora" value={formatHour(appointment.startHour)} colors={colors} />
              <DetailRow icon="activity" label="Duración" value={`${appointment.durationHours * 60} min`} colors={colors} />
              <DetailRow icon="users" label="Trabajador" value={appointment.worker} colors={colors} />

              {role !== 'client' && (
                <View style={styles.actions}>
                  {appointment.status !== 'confirmed' && (
                    <ActionBtn
                      label="Confirmar"
                      color={colors.statusConfirmed}
                      onPress={() => handleStatusChange('confirmed')}
                      saving={saving}
                    />
                  )}
                  {appointment.status !== 'completed' && (
                    <ActionBtn
                      label="Completar"
                      color={colors.statusCompleted}
                      onPress={() => handleStatusChange('completed')}
                      saving={saving}
                    />
                  )}
                  {role === 'company' && appointment.status !== 'cancelled' && (
                    <ActionBtn
                      label="Cancelar"
                      color={colors.statusCancelled}
                      onPress={() => handleStatusChange('cancelled')}
                      saving={saving}
                    />
                  )}
                </View>
              )}
            </>
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
  onPress,
  saving,
}: {
  label: string;
  color: string;
  onPress: () => void;
  saving: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color, opacity: saving ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.75}
    >
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
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
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
