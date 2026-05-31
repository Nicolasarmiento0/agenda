import { useCallback, useEffect, useState } from 'react';
import { WorkerRow } from '../constants/appointments';
import { supabase } from '../lib/supabase';

export function useWorkers(businessId: string | undefined): {
  workers: WorkerRow[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('workers')
      .select('*, profiles(avatar_url)')
      .eq('business_id', businessId)
      .eq('active', true);

    if (!error && data) {
      setWorkers(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((w: any) => ({
          id: w.id,
          name: w.name,
          color: w.color || '#D00024',
          initials: w.name.substring(0, 2).toUpperCase(),
          avatar_url: w.profiles?.avatar_url ?? null,
          specialty: w.specialty || '',
          user_id: w.user_id ?? undefined,
        }))
      );
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { workers, loading, refetch };
}
