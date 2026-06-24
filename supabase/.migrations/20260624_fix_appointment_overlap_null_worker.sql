-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Corrección de Solapamiento para Trabajador NULL
-- Creado: 2026-06-24
-- Objetivo: Permitir la detección de solapamiento de bloqueos globales (worker_id IS NULL).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS trigger AS $$
BEGIN
  -- 1. Bloquear el registro del trabajador para serializar la inserción/actualización de citas
  IF NEW.worker_id IS NOT NULL THEN
    PERFORM id FROM public.workers WHERE id = NEW.worker_id FOR UPDATE;
  END IF;

  -- 2. Verificar si hay solapamiento con otras citas activas del mismo trabajador (o sin trabajador asignado) en la misma fecha
  IF EXISTS (
    SELECT 1 
    FROM public.appointments
    WHERE worker_id IS NOT DISTINCT FROM NEW.worker_id
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
