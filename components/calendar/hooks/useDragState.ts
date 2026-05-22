import { useCallback, useRef, useState } from 'react';
import { Appointment } from '../../../constants/appointments';
import { toLocalISOString } from '../../agenda/agendaHelpers';
import { HOUR_HEIGHT } from '../../../constants/appointments';

export interface DragState {
  isDragging: boolean;
  draggedApptId: string | null;
  /** Hora snapeada a 0.5h incrementos durante el drag */
  snapHour: number;
  snapWorkerId: string;
  snapDate: string;
}

export interface UseDragStateReturn {
  dragState: DragState;
  /** Llamar en LongPress onStart del EventCard */
  startDrag: (appt: Appointment) => void;
  /** Llamar en PanGestureHandler onUpdate — recalcula snapHour */
  updateDrag: (absoluteY: number, gridTopY: number, startHour: number, workerId: string, date: Date) => void;
  /** Llamar en PanGestureHandler onEnd — retorna datos del drop */
  endDrag: () => { apptId: string; snapHour: number; snapWorkerId: string; snapDate: string } | null;
  /** Cancelar drag sin ejecutar drop */
  cancelDrag: () => void;
}

const INITIAL_DRAG: DragState = {
  isDragging: false,
  draggedApptId: null,
  snapHour: 9,
  snapWorkerId: '',
  snapDate: '',
};

export function useDragState(): UseDragStateReturn {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG);
  const dragRef = useRef<DragState>(INITIAL_DRAG);

  const startDrag = useCallback((appt: Appointment) => {
    const next: DragState = {
      isDragging: true,
      draggedApptId: appt.id,
      snapHour: appt.startHour,
      snapWorkerId: appt.worker_id,
      snapDate: appt.date ?? toLocalISOString(new Date()),
    };
    dragRef.current = next;
    setDragState(next);
  }, []);

  const updateDrag = useCallback((
    absoluteY: number,
    gridTopY: number,
    startHour: number,
    workerId: string,
    date: Date,
  ) => {
    const relativeY = absoluteY - gridTopY;
    const rawHour = startHour + relativeY / HOUR_HEIGHT;
    const snapHour = Math.max(startHour, Math.floor(rawHour * 2) / 2);
    const next = {
      ...dragRef.current,
      snapHour,
      snapWorkerId: workerId,
      snapDate: toLocalISOString(date),
    };
    dragRef.current = next;
    setDragState(next);
  }, []);

  const endDrag = useCallback(() => {
    const { isDragging, draggedApptId, snapHour, snapWorkerId, snapDate } = dragRef.current;
    if (!isDragging || !draggedApptId) return null;
    dragRef.current = INITIAL_DRAG;
    setDragState(INITIAL_DRAG);
    return { apptId: draggedApptId, snapHour, snapWorkerId, snapDate };
  }, []);

  const cancelDrag = useCallback(() => {
    dragRef.current = INITIAL_DRAG;
    setDragState(INITIAL_DRAG);
  }, []);

  return { dragState, startDrag, updateDrag, endDrag, cancelDrag };
}
