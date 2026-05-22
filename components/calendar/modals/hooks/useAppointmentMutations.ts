import { useCallback, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Appointment } from '../../../../constants/appointments';

type OptimisticUpdater = (apptId: string, updates: Partial<Appointment>) => void;
type RollbackFn = (apptId: string, originalData: Partial<Appointment>) => void;

interface MutationsProps {
  onOptimisticUpdate?: OptimisticUpdater;
  onRollback?: RollbackFn;
  showAlert: (opts: { title: string; message: string }) => void;
  refetchAppts: () => void;
}

export function useAppointmentMutations({ onOptimisticUpdate, onRollback, showAlert, refetchAppts }: MutationsProps) {
  const [isMutating, setIsMutating] = useState(false);

  // Helper local para notificaciones futuras
  const triggerNotifications = async (appt: Appointment, action: string) => {
    // Aquí se insertarán las llamadas a las tablas `notifications` y/o `inbox` en Supabase.
    // Ej: await supabase.from('inbox').insert({...})
    console.log(`[Notification Engine] Triggered for action: ${action} on appointment: ${appt.id}`);
  };

  const changeAppointmentStatus = useCallback(async (appt: Appointment, newStatus: string) => {
    if (!appt) return false;
    
    setIsMutating(true);
    
    // Guardamos estado original para rollback
    const originalStatus = appt.status;
    
    // Optimistic Update
    if (onOptimisticUpdate) {
      onOptimisticUpdate(appt.id, { status: newStatus as any });
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appt.id);

      if (error) {
        throw error;
      }

      // Disparamos notificaciones tras éxito (asíncrono, no bloqueante)
      triggerNotifications(appt, newStatus).catch(() => {});
      
      setIsMutating(false);
      return true;
    } catch (err: any) {
      // Rollback
      if (onRollback) {
        onRollback(appt.id, { status: originalStatus });
      }
      showAlert({ title: 'Error de conexión', message: 'No se pudo actualizar el estado de la cita. Intentando revertir...' });
      
      // Refetch de seguridad
      refetchAppts();
      setIsMutating(false);
      return false;
    }
  }, [onOptimisticUpdate, onRollback, showAlert, refetchAppts]);

  const deleteAppointment = useCallback(async (appt: Appointment) => {
    // Si la acción real es "Cancelar", usamos update a status 'cancelled'. 
    // Delete físico solo lo debe hacer la app si es necesario, pero el documento pide 'cancelled'.
    return changeAppointmentStatus(appt, 'cancelled');
  }, [changeAppointmentStatus]);

  return { changeAppointmentStatus, deleteAppointment, isMutating };
}
