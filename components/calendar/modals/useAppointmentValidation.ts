import { useCallback } from 'react';
import { toLocalISOString } from './agendaHelpers';

type Role = 'company' | 'worker' | 'client';

interface ValidationOptions {
  role: Role;
  openingHour: number;
  closingHour: number;
  showAlert: (opts: { title: string; message: string }) => void;
}

export function useAppointmentValidation({ role, openingHour, closingHour, showAlert }: ValidationOptions) {
  const validateRoleRules = useCallback(
    (startHour: number, endHourCalc: number, durationHours: number, dateText: string, selectedSlot: string | null): boolean => {
      const now = new Date();
      const todayStr = toLocalISOString(now);
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toLocalISOString(tomorrow);
      
      const isFirstBlock = Math.abs(startHour - openingHour) <= 0.25;

      // Restricciones para el Cliente
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

      // Restricciones para el Trabajador
      if (role === 'worker') {
        // Corrección: Los trabajadores no tienen límite de anticipación ni restricciones en el primer bloque.
        // Solo verificamos que la duración no exceda las 5 horas para evitar errores.
        if (durationHours > 5) {
          showAlert({ title: 'Duración inválida', message: 'Las citas no pueden durar más de 5 horas.' });
          return false;
        }
      }

      // Restricciones Generales (Aplica a Client y Worker. Company es libre de agendar fuera de horario si quiere, pero mantengamos el horario de atención como base para todos).
      if (role !== 'company') {
        if (startHour < openingHour || endHourCalc > closingHour) {
          showAlert({
            title: 'Fuera de horario',
            message: `La cita debe estar dentro del horario de atención (${String(openingHour).padStart(2, '0')}:00 a ${String(closingHour).padStart(2, '0')}:00).`,
          });
          return false;
        }
      }

      return true;
    },
    [role, openingHour, closingHour, showAlert]
  );

  return { validateRoleRules };
}
