import { Appointment, AppointmentStatus, WorkerRow } from '../../constants/appointments';

export type { Appointment, WorkerRow };

export type CalendarRole = 'company' | 'worker' | 'client';
export type CalendarViewMode = 'day' | 'week' | 'month';

export interface UnifiedCalendarProps {
  role: CalendarRole;
  /** Solo requerido para role="client": ID del negocio externo. */
  businessId?: string;
}

export interface CalendarPermissions {
  canCreate: boolean;
  canCreateForAnyWorker: boolean;
  canBlockTime: boolean;
  canManageStatus: boolean;
  canCancelOwn: boolean;
  visibilityMode: 'own' | 'filtered' | 'all';
  gymFeatures: boolean;
  showWorkerFilter: boolean;
  showStatsRow: boolean;
  showWorkerProfileModal: boolean;
  allowedStatusTransitions: Partial<Record<AppointmentStatus, AppointmentStatus[]>>;
}

export interface GhostSlot {
  /** worker.id en day view, ISO date string en week view */
  colKey: string;
  /** píxeles desde el tope del grid */
  top: number;
  /** hora snapeada (ej. 9.5 = 9:30) */
  hour: number;
}

export interface PressedSlotData {
  hour: number;
  workerId: string;
  workerName: string;
  workerColor: string;
  date: Date;
}

export interface GymMembership {
  id: string;
  status: 'active' | 'suspended' | 'cancelled' | string;
  plan?: string;
  classes_limit?: number;
  client_id?: string;
  business_id?: string;
  client_type?: 'static' | 'dynamic' | string;
}

export interface MembershipRequest {
  id: string;
  status: string;
}

export interface GymData {
  isGym: boolean;
  gymMembership: GymMembership | null;
  membershipRequest: MembershipRequest | null;
  gymMembershipLoading: boolean;
  weeklyClassesUsed: number;
  showWeeklyBanner: boolean;
  refetchGymMembership: () => Promise<void>;
}
