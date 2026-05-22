import { Appointment } from '../../../../constants/appointments';
import { toLocalISOString } from '../agendaHelpers';

type Role = 'company' | 'worker' | 'client';

export type AppointmentAction = 'confirm' | 'complete' | 'reschedule' | 'edit' | 'no-show' | 'cancel' | 'unblock';

export function useAppointmentPermissions(role: Role) {
  const getAvailableActions = (appt: Appointment): AppointmentAction[] => {
    if (!appt) return [];

    const isBlocked = appt.service === 'BLOQUEO';
    if (isBlocked) {
      if (role === 'client') return [];
      return ['unblock']; // company and worker can unblock
    }

    const s = appt.status;
    const actions: AppointmentAction[] = [];

    // Helper para determinar horas restantes (usado en reglas de cliente)
    const getHoursUntilAppt = () => {
      if (!appt.date) return 0;
      const [y, m, d] = appt.date.split('-').map(Number);
      const startH = Math.floor(appt.startHour);
      const startM = Math.round((appt.startHour % 1) * 60);
      const apptTime = new Date(y, m - 1, d, startH, startM).getTime();
      return (apptTime - Date.now()) / (1000 * 60 * 60);
    };

    const hoursUntil = getHoursUntilAppt();

    // -- ADMIN & WORKER PERMISSIONS --
    if (role === 'company' || role === 'worker') {
      if (s === 'pending') {
        actions.push('confirm', 'reschedule', 'edit', 'no-show', 'cancel');
      } else if (s === 'confirmed') {
        actions.push('complete', 'reschedule', 'edit', 'no-show', 'cancel');
      } else if (s === 'rescheduled') {
        actions.push('confirm', 'complete', 'edit', 'no-show', 'cancel');
      }
      // Completed, Cancelled and No-Show are terminal states for actions usually, 
      // but admins might want to edit notes on completed ones.
      if (s === 'completed' && role === 'company') {
        actions.push('edit');
      }
      return actions;
    }

    // -- CLIENT PERMISSIONS --
    if (role === 'client') {
      // Clientes solo pueden interactuar con pending, confirmed y rescheduled.
      if (['pending', 'confirmed', 'rescheduled'].includes(s)) {
        // Regla: Cancelación o reprogramación solo si faltan > 2h
        if (hoursUntil > 2) {
          actions.push('cancel');
          actions.push('reschedule');
        }
      }
      return actions;
    }

    return [];
  };

  return { getAvailableActions };
}
