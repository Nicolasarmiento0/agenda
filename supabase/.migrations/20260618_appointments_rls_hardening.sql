-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN CANÓNICA: RLS Hardening y Reconciliación en appointments
-- Creado: 2026-06-18
-- Objetivo: Cerrar la fuga de datos en appointments y recrear la vista de disponibilidad segura.
-- ═══════════════════════════════════════════════════════════

-- 1. Habilitar RLS en la tabla appointments de forma explícita
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas previas para evitar conflictos o duplicados
DROP POLICY IF EXISTS "allow_select_all" ON public.appointments;
DROP POLICY IF EXISTS "client_select_own" ON public.appointments;
DROP POLICY IF EXISTS "client_insert_own" ON public.appointments;
DROP POLICY IF EXISTS "client_update_own" ON public.appointments;
DROP POLICY IF EXISTS "client_delete_own" ON public.appointments;
DROP POLICY IF EXISTS "company_manage_all" ON public.appointments;
DROP POLICY IF EXISTS "worker_manage_own" ON public.appointments;
DROP POLICY IF EXISTS "admin_manage_all" ON public.appointments;

-- 3. Crear políticas RLS seguras

-- client_select_own: El cliente autenticado solo puede consultar sus propias citas
CREATE POLICY "client_select_own" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
  );

-- client_insert_own: El cliente autenticado solo puede crear citas para sí mismo con estado 'pending'
CREATE POLICY "client_insert_own" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (client_id = auth.uid()) AND
    (status = 'pending')
  );

-- client_update_own: El cliente autenticado solo puede actualizar citas que le pertenecen si no están completadas/canceladas/no-show y faltan más de 2 horas
CREATE POLICY "client_update_own" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    (client_id = auth.uid()) AND
    (status NOT IN ('completed', 'cancelled', 'no-show')) AND
    (((date || ' ' || LPAD(FLOOR(start_hour)::text, 2, '0') || ':' || LPAD(ROUND((start_hour - FLOOR(start_hour)) * 60)::text, 2, '0') || ':00')::timestamp) >= (now() + interval '2 hours'))
  );

-- client_delete_own: El cliente autenticado solo puede eliminar citas que le pertenecen si no están completadas/canceladas/no-show y faltan más de 2 horas
CREATE POLICY "client_delete_own" ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    (client_id = auth.uid()) AND
    (status NOT IN ('completed', 'cancelled', 'no-show')) AND
    (((date || ' ' || LPAD(FLOOR(start_hour)::text, 2, '0') || ':' || LPAD(ROUND((start_hour - FLOOR(start_hour)) * 60)::text, 2, '0') || ':00')::timestamp) >= (now() + interval '2 hours'))
  );

-- company_manage_all: El dueño del negocio (company) tiene control total sobre las citas del negocio
CREATE POLICY "company_manage_all" ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );

-- worker_manage_own: El trabajador (worker) tiene control total sobre sus propias citas asignadas
CREATE POLICY "worker_manage_own" ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

-- admin_manage_all: El administrador de la plataforma tiene control total sobre todas las citas
CREATE POLICY "admin_manage_all" ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Recrear la vista de disponibilidad segura availability_slots
--    (Elimina cualquier versión previa y expone solo columnas no sensibles/PII)
DROP VIEW IF EXISTS public.availability_slots;

CREATE VIEW public.availability_slots WITH (security_barrier = true, security_invoker = true) AS
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

-- 5. Revocar SELECT directo en appointments para el rol anónimo (anon)
REVOKE SELECT ON public.appointments FROM anon;

-- 6. Otorgar permisos SELECT sobre la vista segura a los roles anon y authenticated
GRANT SELECT ON public.availability_slots TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- Queries útiles para confirmar la correcta aplicación de los cambios
-- ═══════════════════════════════════════════════════════════
/*
  -- 1. Listar todas las políticas RLS activas en la tabla appointments
  SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual, 
    with_check 
  FROM pg_policies 
  WHERE tablename = 'appointments';

  -- 2. Verificar privilegios SELECT de 'anon' en la tabla appointments (Debe retornar FALSE)
  SELECT has_table_privilege('anon', 'public.appointments', 'SELECT') AS anon_has_direct_select;

  -- 3. Verificar privilegios SELECT de 'anon' en la vista availability_slots (Debe retornar TRUE)
  SELECT has_table_privilege('anon', 'public.availability_slots', 'SELECT') AS anon_has_view_select;

  -- 4. Verificar privilegios SELECT de 'authenticated' en la vista availability_slots (Debe retornar TRUE)
  SELECT has_table_privilege('authenticated', 'public.availability_slots', 'SELECT') AS authenticated_has_view_select;

  -- 5. Consultar las columnas expuestas por la vista (No debe contener client_id, client_name, service, price ni notes)
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'availability_slots';
*/
