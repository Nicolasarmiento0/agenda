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
  { light: { bg: '#EDE8F5', border: '#C5B4E8' }, dark: { bg: 'rgba(130,90,200,0.98)',  border: '#C5B4E8' } },
  { light: { bg: '#D5EDE0', border: '#9ACBAA' }, dark: { bg: 'rgba(60,152,90,0.96)',   border: '#9ACBAA' } },
  { light: { bg: '#FAE3D4', border: '#EEB898' }, dark: { bg: 'rgba(210,118,70,0.97)',  border: '#EEB898' } },
  { light: { bg: '#D4E8F8', border: '#94C0EE' }, dark: { bg: 'rgba(60,132,220,0.97)',  border: '#94C0EE' } },
  { light: { bg: '#FAD8E4', border: '#EDA0B8' }, dark: { bg: 'rgba(210,80,120,0.97)',  border: '#EDA0B8' } },
  { light: { bg: '#F8F0D4', border: '#E0CC80' }, dark: { bg: 'rgba(200,175,50,0.97)',  border: '#E0CC80' } },
  { light: { bg: '#D4F4EC', border: '#86CCBC' }, dark: { bg: 'rgba(50,175,150,0.97)',  border: '#86CCBC' } },
  { light: { bg: '#F0E8D4', border: '#D4C098' }, dark: { bg: 'rgba(190,155,90,0.97)',  border: '#D4C098' } },
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
