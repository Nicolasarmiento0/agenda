-- ═══════════════════════════════════════════════════════════
-- SQL MIGRATION: Solución a la fuga masiva de datos en appointments
-- Ejecutar este script en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Eliminar la política permisiva e insegura que exponía todas las citas
DROP POLICY IF EXISTS "allow_select_all" ON public.appointments;

-- 2. Crear una nueva política de SELECT restringida para los clientes autenticados.
-- Ahora, un cliente regular solo podrá leer de la tabla 'appointments' las citas que le pertenezcan.
CREATE POLICY "client_select_own" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
  );

-- Nota: Las políticas preexistentes (company_manage_all y worker_manage_own) 
-- ya están correctamente restringidas y aseguradas en setup_appointments_rls.sql,
-- por lo que administradores y trabajadores seguirán teniendo acceso completo a sus datos respectivos.


-- 3. Crear la vista de disponibilidad segura (availability_slots) con security_barrier y security_invoker.
-- Esta vista NO expone columnas PII/financieras como: client_name, service, price, notes o client_id.
-- Solo expone metadatos mínimos de fecha, hora y bloqueos para calcular la disponibilidad.
CREATE OR REPLACE VIEW public.availability_slots WITH (security_barrier = true, security_invoker = true) AS
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


-- 4. Otorgar permisos explícitos de SELECT sobre la nueva vista segura a los roles público (anon) y autenticado (authenticated)
GRANT SELECT ON public.availability_slots TO anon, authenticated;
