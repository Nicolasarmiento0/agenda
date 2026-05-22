import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Appointment, DEFAULT_END_HOUR, DEFAULT_START_HOUR } from '../../../constants/appointments';
import { useAuth } from '../../../context/AuthContext';
import { useAgendaAppointments } from '../../../hooks/useAgendaAppointments';
import { useWorkers } from '../../../hooks/useWorkers';
import { supabase } from '../../../lib/supabase';
import { getWeekDays, toLocalISOString } from '../../calendar/modals/agendaHelpers';
import { CalendarRole, CalendarViewMode, GymData, GymMembership, MembershipRequest, WorkerRow } from '../types';

export interface UseCalendarDataReturn {
  appointments: Appointment[];
  /** Appointments ya filtradas por selectedWorkerFilter */
  filteredAppointments: Appointment[];
  workers: WorkerRow[];
  startHour: number;
  endHour: number;
  hoursGrid: number[];
  stats: Array<{ label: string; value: string }>;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => Promise<void>;
  /** ID del worker logueado (solo role="worker") */
  selfWorkerId: string | undefined;
  /** Datos gym (solo role="client" + isGym, undefined en otros roles) */
  gymData: GymData | undefined;
  /** Range de fechas para el view actual */
  rangeDays: Date[];
  /** Objeto negocio activo (para getUnavailableBlocks y validaciones) */
  activeBusiness: any;
  /** Refetch appointments (para uso en UnifiedCalendar tras mutations) */
  refetchAppts: () => Promise<void>;
}

export function useCalendarData(
  role: CalendarRole,
  businessId: string | undefined,
  viewMode: CalendarViewMode,
  selectedDate: Date,
  selectedWorkerFilter: string | null,
): UseCalendarDataReturn {
  const { business: authBusiness, profile } = useAuth();

  // El ID del negocio efectivo: parámetro para client, contexto para worker/company
  const effectiveBusinessId = role === 'client' ? businessId : authBusiness?.id;

  // ─── Business data para client role ─────────────────────────────────────────
  const [clientBusiness, setClientBusiness] = useState<{ id: string; opening_time?: string; closing_time?: string; booking_window_day?: number; booking_window_open_time?: string; booking_window_close_time?: string; schedule?: any; status?: string; category_id?: string } | null>(null);

  useEffect(() => {
    if (role !== 'client' || !effectiveBusinessId) return;
    supabase
      .from('businesses')
      .select('id, opening_time, closing_time, booking_window_day, booking_window_open_time, booking_window_close_time, schedule, status, category_id')
      .eq('id', effectiveBusinessId)
      .single()
      .then(({ data }) => { if (data) setClientBusiness(data); });
  }, [role, effectiveBusinessId]);

  const activeBusiness = role === 'client' ? clientBusiness : authBusiness;

  // ─── Business hours ──────────────────────────────────────────────────────────
  const startHour = useMemo(() => {
    if (!activeBusiness?.opening_time) return DEFAULT_START_HOUR;
    return parseInt(activeBusiness.opening_time.split(':')[0]);
  }, [activeBusiness?.opening_time]);

  const endHour = useMemo(() => {
    if (!activeBusiness?.closing_time) return DEFAULT_END_HOUR;
    const h = parseInt(activeBusiness.closing_time.split(':')[0]);
    const m = parseInt(activeBusiness.closing_time.split(':')[1] ?? '0');
    return m > 0 ? h + 1 : h;
  }, [activeBusiness?.closing_time]);

  const hoursGrid = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  // ─── Range de fechas según viewMode ─────────────────────────────────────────
  const rangeDays = useMemo(() => {
    if (viewMode === 'month') {
      const firstOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const startDay = firstOfMonth.getDay();
      const gridStart = new Date(firstOfMonth);
      gridStart.setDate(1 - (startDay === 0 ? 6 : startDay - 1));
      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
      });
    }
    return getWeekDays(selectedDate);
  }, [viewMode, selectedDate]);

  // ─── Workers ─────────────────────────────────────────────────────────────────
  const { workers: hookWorkers, loading: workersLoading, refetch: refetchWorkers } = useWorkers(effectiveBusinessId);

  // Para client: workers enriquecidos con blocks para getUnavailableBlocks
  const [clientWorkers, setClientWorkers] = useState<WorkerRow[]>([]);

  useEffect(() => {
    if (role !== 'client' || !effectiveBusinessId) return;
    supabase
      .from('workers')
      .select('*, profiles(avatar_url)')
      .eq('business_id', effectiveBusinessId)
      .then(({ data, error }) => {
        if (!error && data) {
          setClientWorkers(data.map((w: any) => ({
            id: w.id,
            name: w.name,
            color: w.color || '#D00024',
            initials: w.name ? String(w.name).substring(0, 2).toUpperCase() : 'W',
            avatar_url: w.profiles?.avatar_url ?? null,
            specialty: w.specialty || '',
            blocks: w.blocks || [],
          })));
        }
      });
  }, [role, effectiveBusinessId]);

  const workers: WorkerRow[] = role === 'client' ? clientWorkers : hookWorkers;

  // ─── Self worker ID (worker role) ────────────────────────────────────────────
  const [selfWorkerId, setSelfWorkerId] = useState<string | undefined>();

  useEffect(() => {
    if (role !== 'worker' || !profile?.id) return;
    supabase
      .from('workers')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setSelfWorkerId(data.id); });
  }, [role, profile?.id]);

  // ─── Appointments ─────────────────────────────────────────────────────────────
  const workerId = role === 'worker' ? selfWorkerId : undefined;

  const { appointments: rawAppointments, loading: apptsLoading, refetch: refetchAppts } = useAgendaAppointments(
    effectiveBusinessId,
    rangeDays,
    workerId,
  );

  // Masking para client role: ocultar datos de citas ajenas
  const appointments = useMemo(() => {
    if (role !== 'client' || !profile) return rawAppointments;
    return rawAppointments.map(a => {
      const isMine = a.client_id === profile.id;
      const isBlocked = a.service === 'BLOQUEO';
      if (isMine || isBlocked) return a;
      return {
        ...a,
        clientName: '',
        service: 'Reservado',
        notes: undefined,
      };
    });
  }, [role, profile, rawAppointments]);

  const filteredAppointments = useMemo(() => {
    if (!selectedWorkerFilter) return appointments;
    return appointments.filter(a => a.worker_id === selectedWorkerFilter);
  }, [appointments, selectedWorkerFilter]);

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const todayStr = toLocalISOString(new Date());
  const stats = useMemo(() => {
    const todayAppts = appointments.filter(a => a.date === todayStr);
    const pending = todayAppts.filter(a => a.status === 'pending').length;
    const done = todayAppts.filter(a => a.status === 'completed' || a.status === 'no-show').length;
    return [
      { label: 'CITAS HOY', value: String(todayAppts.length) },
      { label: 'PENDIENTES', value: String(pending) },
      { label: 'HECHAS', value: String(done) },
    ];
  }, [appointments, todayStr]);

  // ─── Gym data (client only) ───────────────────────────────────────────────────
  const [isGym, setIsGym] = useState(false);
  const [gymMembership, setGymMembership] = useState<GymMembership | null>(null);
  const [membershipRequest, setMembershipRequest] = useState<MembershipRequest | null>(null);
  const [gymMembershipLoading, setGymMembershipLoading] = useState(false);
  const [weeklyClassesUsed, setWeeklyClassesUsed] = useState(0);
  const [showWeeklyBanner, setShowWeeklyBanner] = useState(false);

  useEffect(() => {
    if (role !== 'client' || !clientBusiness?.category_id) return;
    supabase
      .from('service_categories')
      .select('name')
      .eq('id', clientBusiness.category_id)
      .single()
      .then(({ data }) => {
        if (data) {
          const lower = data.name.toLowerCase();
          setIsGym(lower.includes('gimnasio') || lower.includes('fitness'));
        }
      });
  }, [role, clientBusiness?.category_id]);

  const refetchGymMembership = useCallback(async () => {
    if (!isGym || !effectiveBusinessId || !profile?.id) return;
    setGymMembershipLoading(true);
    const [{ data: mem }, { data: req }] = await Promise.all([
      supabase.from('gym_memberships').select('*').eq('business_id', effectiveBusinessId).eq('client_id', profile.id).maybeSingle(),
      supabase.from('membership_requests').select('id, status').eq('business_id', effectiveBusinessId).eq('client_id', profile.id).maybeSingle(),
    ]);
    setGymMembership(mem ?? null);
    setMembershipRequest(req ?? null);
    setGymMembershipLoading(false);
  }, [isGym, effectiveBusinessId, profile?.id]);

  useEffect(() => {
    if (isGym) refetchGymMembership();
  }, [isGym, refetchGymMembership]);

  // Contador semanal de clases usadas
  useEffect(() => {
    if (!isGym || gymMembership?.status !== 'active' || !effectiveBusinessId || !profile?.id) return;
    const weekStart = toLocalISOString(rangeDays[0]);
    const weekEnd = toLocalISOString(rangeDays[Math.min(6, rangeDays.length - 1)]);
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', effectiveBusinessId)
      .eq('client_id', profile.id)
      .eq('service', 'CLASE')
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .in('status', ['confirmed', 'pending'])
      .then(({ count }) => setWeeklyClassesUsed(count ?? 0));
  }, [isGym, gymMembership?.status, effectiveBusinessId, profile?.id, rangeDays]);

  // Banner dominical para clientes estáticos
  useEffect(() => {
    if (!isGym || gymMembership?.client_type !== 'static' || !clientBusiness) {
      setShowWeeklyBanner(false);
      return;
    }
    const now = new Date();
    const bookingDay = clientBusiness.booking_window_day ?? 0;
    if (now.getDay() !== bookingDay) { setShowWeeklyBanner(false); return; }
    const openStr = clientBusiness.booking_window_open_time;
    const closeStr = clientBusiness.booking_window_close_time;
    if (!openStr || !closeStr) { setShowWeeklyBanner(false); return; }
    const [oH, oM] = openStr.split(':').map(Number);
    const [cH, cM] = closeStr.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    setShowWeeklyBanner(nowMin >= oH * 60 + oM && nowMin <= cH * 60 + cM);
  }, [isGym, gymMembership, clientBusiness]);

  // ─── Refresh ──────────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAppts(),
      refetchWorkers(),
      role === 'client' && isGym ? refetchGymMembership() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [refetchAppts, refetchWorkers, role, isGym, refetchGymMembership]);

  const gymData: GymData | undefined = role === 'client' ? {
    isGym,
    gymMembership,
    membershipRequest,
    gymMembershipLoading,
    weeklyClassesUsed,
    showWeeklyBanner,
    refetchGymMembership,
  } : undefined;

  return {
    appointments,
    filteredAppointments,
    workers,
    startHour,
    endHour,
    hoursGrid,
    stats,
    refreshing,
    loading: workersLoading || apptsLoading,
    onRefresh,
    selfWorkerId,
    gymData,
    rangeDays,
    activeBusiness,
    refetchAppts,
  };
}
