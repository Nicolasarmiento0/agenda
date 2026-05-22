import { useCallback, useEffect, useRef, useState } from 'react';
import { Appointment } from '../constants/appointments';
import { supabase } from '../lib/supabase';

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!businessId || !weekDays[0] || !weekDays[6]) return;
    setLoading(true);

    const startStr = toLocalISOString(weekDays[0]);
    const endStr   = toLocalISOString(weekDays[6]);

    let query = supabase
      .from('appointments')
      .select('*, workers(name, color)')
      .eq('business_id', businessId)
      .gte('date', startStr)
      .lte('date', endStr)
      .neq('status', 'cancelled');

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAppointments(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((a: any) => ({
          id: a.id,
          clientName: a.client_name,
          service: a.service,
          worker_id: a.worker_id,
          worker: a.workers?.name || 'Desconocido',
          workerColor: a.workers?.color || '#000',
          startHour: Number(a.start_hour),
          durationHours: Number(a.duration_hours),
          status: a.status,
          date: a.date,
          price: a.price || 0,
          notes: a.notes || undefined,
          client_id: a.client_id || undefined,
        }))
      );
    }
    setLoading(false);
  }, [businessId, weekDays, workerId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
