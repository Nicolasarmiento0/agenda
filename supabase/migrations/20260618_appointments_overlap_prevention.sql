-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Prevención de Doble Reserva (Control de Concurrencia)
-- Creado: 2026-06-18
-- Objetivo: Evitar reservas duplicadas / solapamiento para un mismo trabajador.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS trigger AS $$
BEGIN
  -- 1. Bloquear el registro del trabajador para serializar la inserción/actualización de citas
  PERFORM id FROM public.workers WHERE id = NEW.worker_id FOR UPDATE;

  -- 2. Verificar si hay solapamiento con otras citas activas del mismo trabajador en la misma fecha
  IF EXISTS (
    SELECT 1 
    FROM public.appointments
    WHERE worker_id = NEW.worker_id
      AND date = NEW.date
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Condición de solapamiento de intervalos de tiempo:
      -- Cita A choca con Cita B si: (InicioA < FinB) AND (InicioB < FinA)
      AND NEW.start_hour < (start_hour + duration_hours)
      AND start_hour < (NEW.start_hour + NEW.duration_hours)
  ) THEN
    RAISE EXCEPTION 'El horario seleccionado ya está reservado.'
      USING ERRCODE = '23505'; -- Código standard de violación de unicidad / restricción
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_check_appointment_overlap ON public.appointments;

CREATE TRIGGER trg_check_appointment_overlap
BEFORE INSERT OR UPDATE OF worker_id, date, start_hour, duration_hours, status
ON public.appointments
FOR EACH ROW
WHEN (NEW.status != 'cancelled')
EXECUTE FUNCTION public.check_appointment_overlap();
