import { AppointmentStatus } from '../../../constants/appointments';
import { CalendarPermissions, CalendarRole } from '../types';

const WORKER_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  pending:     ['confirmed', 'cancelled', 'no-show'],
  confirmed:   ['completed', 'no-show', 'rescheduled', 'cancelled'],
  rescheduled: ['confirmed', 'cancelled'],
};

const CLIENT_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  pending:   ['cancelled'],
  confirmed: ['cancelled'],
};

/**
 * Devuelve las capacidades del calendario según el rol.
 * Función pura: sin side-effects, sin hooks internos.
 */
export function useCalendarPermissions(
  role: CalendarRole,
  isGym: boolean,
  gymMembershipActive: boolean,
  businessSuspended: boolean,
): CalendarPermissions {
  const canCreate = !businessSuspended && (
    role !== 'client' || !isGym || gymMembershipActive
  );

  switch (role) {
    case 'company':
      return {
        canCreate,
        canCreateForAnyWorker: true,
        canBlockTime: true,
        canManageStatus: true,
        canCancelOwn: false,
        visibilityMode: 'all',
        gymFeatures: false,
        showWorkerFilter: true,
        showStatsRow: true,
        showWorkerProfileModal: true,
        allowedStatusTransitions: WORKER_TRANSITIONS,
      };

    case 'worker':
      return {
        canCreate,
        canCreateForAnyWorker: false,
        canBlockTime: true,
        canManageStatus: true,
        canCancelOwn: false,
        visibilityMode: 'own',
        gymFeatures: false,
        showWorkerFilter: true,
        showStatsRow: true,
        showWorkerProfileModal: false,
        allowedStatusTransitions: WORKER_TRANSITIONS,
      };

    case 'client':
      return {
        canCreate,
        canCreateForAnyWorker: false,
        canBlockTime: false,
        canManageStatus: false,
        canCancelOwn: true,
        visibilityMode: 'all',
        gymFeatures: isGym,
        showWorkerFilter: true,
        showStatsRow: true,
        showWorkerProfileModal: false,
        allowedStatusTransitions: CLIENT_TRANSITIONS,
      };
  }
}
