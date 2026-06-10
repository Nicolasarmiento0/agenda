-- ═══════════════════════════════════════════════════════════
-- SCRIPT DE REVERSIÓN / ROLLBACK
-- Ejecutar este script en el SQL Editor de Supabase si deseas
-- eliminar la tabla de actividades, políticas y triggers creados.
-- ═══════════════════════════════════════════════════════════

-- 1. Eliminar el trigger asociado a la tabla appointments
DROP TRIGGER IF EXISTS trg_appointment_activity_log ON public.appointments;

-- 2. Eliminar la función trigger
DROP FUNCTION IF EXISTS public.handle_appointment_activity_log();

-- 3. Eliminar la tabla de actividades (eliminará en cascada sus políticas de RLS)
DROP TABLE IF EXISTS public.appointment_activities CASCADE;
