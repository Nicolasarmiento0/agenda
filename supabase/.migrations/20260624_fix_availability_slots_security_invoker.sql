-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Corrección de Permisos en la Vista de Disponibilidad (security_invoker = false)
-- Creado: 2026-06-24
-- Objetivo: Permitir que usuarios no registrados (anon) consulten los slots de disponibilidad sin dar acceso directo a appointments.
-- ═══════════════════════════════════════════════════════════

-- Recrear la vista con security_invoker = false (definer) para usar los privilegios del definidor
-- y evitar que el RLS de appointments (que restringe a anon) bloquee la visualización de los slots seguros.
DROP VIEW IF EXISTS public.availability_slots;

CREATE VIEW public.availability_slots WITH (security_barrier = true, security_invoker = false) AS
SELECT 
  a.id,
  a.business_id,
  a.worker_id,
  a.date,
  a.start_hour,
  a.duration_hours,
  a.status,
  w.name AS worker_name,
  w.color AS worker_color
FROM public.appointments a
LEFT JOIN public.workers w ON a.worker_id = w.id;

-- Otorgar permisos SELECT sobre la vista segura a los roles anon y authenticated
GRANT SELECT ON public.availability_slots TO anon, authenticated;
