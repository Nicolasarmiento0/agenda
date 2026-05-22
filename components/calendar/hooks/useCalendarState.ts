import { useRef, useState } from 'react';
import { getWeekDays, toLocalISOString } from '../../agenda/agendaHelpers';
import { Appointment, CalendarViewMode, GhostSlot, PressedSlotData, WorkerRow } from '../types';

export interface UseCalendarStateReturn {
  // ─── Navegación ────────────────────────────────────────────
  viewMode: CalendarViewMode;
  setViewMode: (m: CalendarViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  selectedDateStr: string;
  weekDays: Date[];
  /** +/-1 avanza/retrocede según el viewMode activo */
  navigateBy: (delta: number) => void;
  goToToday: () => void;

  // ─── UI toggles ────────────────────────────────────────────
  sidebarVisible: boolean;
  setSidebarVisible: (v: boolean) => void;
  statsCollapsed: boolean;
  setStatsCollapsed: (v: boolean) => void;
  selectedWorkerFilter: string | null;
  setSelectedWorkerFilter: (id: string | null) => void;

  // ─── Modales ───────────────────────────────────────────────
  sheetVisible: boolean;
  setSheetVisible: (v: boolean) => void;
  formVisible: boolean;
  setFormVisible: (v: boolean) => void;
  selectedAppt: Appointment | null;
  setSelectedAppt: (a: Appointment | null) => void;
  editingAppt: Appointment | undefined;
  setEditingAppt: (a: Appointment | undefined) => void;
  prefillData: Appointment | undefined;
  setPrefillData: (a: Appointment | undefined) => void;
  isReschedulingRef: React.MutableRefObject<boolean>;

  // ─── Worker profile modal (company only) ───────────────────
  profileVisible: boolean;
  setProfileVisible: (v: boolean) => void;
  profileWorker: WorkerRow | null;
  setProfileWorker: (w: WorkerRow | null) => void;

  // ─── Ghost slot (feedback al presionar) ────────────────────
  ghostSlot: GhostSlot | null;
  setGhostSlot: (g: GhostSlot | null) => void;
  pressedSlotRef: React.MutableRefObject<PressedSlotData | null>;
}

export function useCalendarState(): UseCalendarStateReturn {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(true);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string | null>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>();
  const [prefillData, setPrefillData] = useState<Appointment | undefined>();
  const isReschedulingRef = useRef(false);

  const [profileVisible, setProfileVisible] = useState(false);
  const [profileWorker, setProfileWorker] = useState<WorkerRow | null>(null);

  const [ghostSlot, setGhostSlot] = useState<GhostSlot | null>(null);
  const pressedSlotRef = useRef<PressedSlotData | null>(null);

  const selectedDateStr = toLocalISOString(selectedDate);
  const weekDays = getWeekDays(selectedDate);

  const navigateBy = (delta: number) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'day') {
        next.setDate(prev.getDate() + delta);
      } else if (viewMode === 'week') {
        next.setDate(prev.getDate() + delta * 7);
      } else {
        next.setMonth(prev.getMonth() + delta);
      }
      return next;
    });
  };

  const goToToday = () => setSelectedDate(new Date());

  return {
    viewMode, setViewMode,
    selectedDate, setSelectedDate,
    selectedDateStr, weekDays,
    navigateBy, goToToday,
    sidebarVisible, setSidebarVisible,
    statsCollapsed, setStatsCollapsed,
    selectedWorkerFilter, setSelectedWorkerFilter,
    sheetVisible, setSheetVisible,
    formVisible, setFormVisible,
    selectedAppt, setSelectedAppt,
    editingAppt, setEditingAppt,
    prefillData, setPrefillData,
    isReschedulingRef,
    profileVisible, setProfileVisible,
    profileWorker, setProfileWorker,
    ghostSlot, setGhostSlot,
    pressedSlotRef,
  };
}
