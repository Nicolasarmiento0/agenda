import { useCallback, useEffect, useRef, useState } from 'react';
import { Appointment } from '../constants/appointments';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function toLocalISOString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useAgendaAppointments(
  businessId: string | undefined,
  weekDays: Date[],
  workerId?: string
): {
  appointments: Appointment[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const activeRequestToken = useRef<number>(0);

  const refetch = useCallback(async () => {
    const lastDay = weekDays[weekDays.length - 1];
    if (!businessId || !weekDays[0] || !lastDay) return;
    const token = ++activeRequestToken.current;
    setLoading(true);

    const startStr = toLocalISOString(weekDays[0]);
    const endStr   = toLocalISOString(lastDay);
    const role = profile?.role ?? 'client';
    const isClient = role === 'client';

    let data: any[] = [];
    let error: any = null;

    if (isClient) {
      // 1. Obtener todos los slots ocupados (sin PII) desde la vista segura
      let slotsQuery = supabase
        .from('availability_slots')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', startStr)
        .lte('date', endStr)
        .neq('status', 'cancelled');

      if (workerId) {
        slotsQuery = slotsQuery.eq('worker_id', workerId);
      }

      // 2. Obtener las citas propias detalladas (filtradas por RLS) si está logueado
      let ownQuery = supabase
        .from('appointments')
        .select('*, workers(name, color)')
        .eq('business_id', businessId)
        .gte('date', startStr)
        .lte('date', endStr);

      if (workerId) {
        ownQuery = ownQuery.eq('worker_id', workerId);
      }

      const [slotsRes, ownRes] = await Promise.all([
        slotsQuery,
        profile?.id ? ownQuery : Promise.resolve({ data: [], error: null })
      ]);

      if (slotsRes.error) {
        error = slotsRes.error;
      } else if (slotsRes.data) {
        const ownMap = new Map<string, any>();
        if (ownRes.data) {
          ownRes.data.forEach((a: any) => ownMap.set(a.id, a));
        }

        data = slotsRes.data.map((slot: any) => {
          const ownAppt = ownMap.get(slot.id);
          if (ownAppt) {
            return {
              id: ownAppt.id,
              client_name: ownAppt.client_name,
              service: ownAppt.service,
              worker_id: ownAppt.worker_id,
              worker_name: ownAppt.workers?.name || 'Desconocido',
              worker_color: ownAppt.workers?.color || '#000',
              start_hour: ownAppt.start_hour,
              duration_hours: ownAppt.duration_hours,
              status: ownAppt.status,
              date: ownAppt.date,
              price: ownAppt.price || 0,
              notes: ownAppt.notes,
              client_id: ownAppt.client_id,
              reschedule_count: ownAppt.reschedule_count,
            };
          } else {
            const isBlocked = slot.status === 'blocked';
            return {
              id: slot.id,
              client_name: isBlocked ? 'Bloqueo de horario' : 'Reservado',
              service: isBlocked ? 'Bloqueo de horario' : 'RESERVADO',
              worker_id: slot.worker_id,
              worker_name: slot.worker_name || 'Desconocido',
              worker_color: slot.worker_color || '#000',
              start_hour: slot.start_hour,
              duration_hours: slot.duration_hours,
              status: isBlocked ? 'blocked' : slot.status,
              date: slot.date,
              price: 0,
              notes: undefined,
              client_id: 'other_client',
            };
          }
        });
      }
    } else {
      // Para admin / worker: cargar todo con detalles desde la tabla appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*, workers(name, color)')
        .eq('business_id', businessId)
        .gte('date', startStr)
        .lte('date', endStr)
        .neq('status', 'cancelled');

      if (workerId) {
        appointmentsQuery = appointmentsQuery.eq('worker_id', workerId);
      }

      const res = await appointmentsQuery;
      error = res.error;
      if (res.data) {
        data = res.data.map((a: any) => ({
          id: a.id,
          client_name: a.client_name,
          service: a.service,
          worker_id: a.worker_id,
          worker_name: a.workers?.name || 'Desconocido',
          worker_color: a.workers?.color || '#000',
          start_hour: a.start_hour,
          duration_hours: a.duration_hours,
          status: a.status,
          date: a.date,
          price: a.price || 0,
          notes: a.notes,
          client_id: a.client_id,
          reschedule_count: a.reschedule_count,
        }));
      }
    }

    if (token !== activeRequestToken.current) return;

    if (!error && data) {
      setAppointments(
        data.map((a: any) => ({
          id: a.id,
          clientName: a.client_name,
          service: a.service,
          worker_id: a.worker_id,
          worker: a.worker_name,
          workerColor: a.worker_color,
          startHour: Number(a.start_hour),
          durationHours: Number(a.duration_hours),
          status: (a.client_name === 'Bloqueo de horario' || a.status === 'blocked') ? 'blocked' : a.status,
          date: a.date,
          price: a.price || 0,
          notes: a.notes || undefined,
          client_id: a.client_id || undefined,
          reschedule_count: a.reschedule_count || 0,
        }))
      );
    }
    setLoading(false);
  }, [businessId, weekDays, workerId, profile]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    return () => {
      activeRequestToken.current = -1;
    };
  }, []);

  // Sincronización en tiempo real via Supabase Realtime
  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  useEffect(() => {
    if (!businessId) return;
    const channelName = `agenda-appointments-${businessId}${workerId ? `-${workerId}` : ''}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${businessId}` },
        () => { refetchRef.current(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId, workerId]);

  return { appointments, loading, refetch };
}
