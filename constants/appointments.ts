// Tipos y constantes compartidas para el sistema de citas.
// Usados en company-agenda, worker-agenda y client-agenda.

export type AppointmentStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'no-show'
  | 'rescheduled'
  | 'cancelled'
  | 'blocked';

export type Appointment = {
  id: string;
  clientName: string;
  service: string;
  worker_id: string;
  worker: string;
  workerColor: string;
  startHour: number;     // ej: 9.5 = 9:30
  durationHours: number; // ej: 1.5 = 90 min
  status: AppointmentStatus;
  date?: string;
  price?: number;
  notes?: string;
  client_id?: string;
};

export type WorkerRow = {
  id: string;
  name: string;
  color: string;
  initials: string;
  avatar_url: string | null;
  specialty: string;
  user_id?: string;
};

export const STATUS_CONFIG: Record<AppointmentStatus, {
  label: string;
  bg: string;
  text: string;
  dot: string;
}> = {
  confirmed:   { label: 'Confirmado',   bg: '#EEF8F0', text: '#2E7D45', dot: '#3D9E5A' },
  pending:     { label: 'Pendiente',    bg: '#FFF5E5', text: '#A0660A', dot: '#F0A030' },
  completed:   { label: 'Completado',   bg: '#F0F0F0', text: '#555555', dot: '#888888' },
  rescheduled: { label: 'Reprogramado', bg: '#FFF5E5', text: '#F39C12', dot: '#F39C12' },
  'no-show':   { label: 'No Show',      bg: '#FDEAEB', text: '#D00024', dot: '#D00024' },
  cancelled:   { label: 'Cancelado',    bg: '#F0F0F0', text: '#555555', dot: '#888888' },
  blocked:     { label: 'Bloqueado',    bg: '#374151', text: '#E5E7EB', dot: '#9CA3AF' },
};

export const PASTEL_PALETTE = [
  // 1. Blue/Teal (Work)
  {
    light: { bg: '#E0F2FE', border: '#0EA5E9', text: '#0369A1' },
    dark: { bg: 'rgba(14, 165, 233, 0.2)', border: '#38BDF8', text: '#BAE6FD' }
  },
  // 2. Purple/Lavender (Data Science Team)
  {
    light: { bg: '#F3E8FF', border: '#A855F7', text: '#581C87' },
    dark: { bg: 'rgba(168, 85, 247, 0.2)', border: '#C084FC', text: '#E9D5FF' }
  },
  // 3. Green/Mint (Data Science Core)
  {
    light: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
    dark: { bg: 'rgba(16, 185, 129, 0.2)', border: '#34D399', text: '#A7F3D0' }
  },
  // 4. Yellow/Amber (Personal/Lunch)
  {
    light: { bg: '#FEF3C7', border: '#F59E0B', text: '#78350F' },
    dark: { bg: 'rgba(245, 158, 11, 0.2)', border: '#FBBF24', text: '#FDE68A' }
  },
  // 5. Orange/Coral (Kids/Q4)
  {
    light: { bg: '#FFECE5', border: '#F97316', text: '#7C2D12' },
    dark: { bg: 'rgba(249, 115, 22, 0.2)', border: '#FB923C', text: '#FFEDD5' }
  },
  // 6. Red/Salmon (Holidays/Performance)
  {
    light: { bg: '#FEE2E2', border: '#EF4444', text: '#7F1D1D' },
    dark: { bg: 'rgba(239, 68, 68, 0.2)', border: '#F87171', text: '#FCA5A5' }
  },
  // 7. Soft Blue (Virtual onsite)
  {
    light: { bg: '#E0F2FE', border: '#3B82F6', text: '#1E3A8A' },
    dark: { bg: 'rgba(59, 130, 246, 0.2)', border: '#60A5FA', text: '#93C5FD' }
  },
  // 8. Pink/Rose
  {
    light: { bg: '#FCE7F3', border: '#EC4899', text: '#701A75' },
    dark: { bg: 'rgba(236, 72, 153, 0.2)', border: '#F472B6', text: '#FBCFE8' }
  }
] as const;

export function getPastelColors(id: string, isDarkMode: boolean) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const p = PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
  return isDarkMode ? p.dark : p.light;
}

export const HOUR_HEIGHT = 72;
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 22;
