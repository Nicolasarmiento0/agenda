-- ═══════════════════════════════════════════════════════════
-- SEGURIDAD: Políticas RLS para Citas (appointments)
-- Ejecutar en Supabase SQL Editor para blindar la base de datos
-- ═══════════════════════════════════════════════════════════

-- 1. Habilitar RLS en la tabla appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas previas para evitar duplicados
DROP POLICY IF EXISTS "allow_select_all" ON appointments;
DROP POLICY IF EXISTS "client_insert_own" ON appointments;
DROP POLICY IF EXISTS "client_update_own" ON appointments;
DROP POLICY IF EXISTS "client_delete_own" ON appointments;
DROP POLICY IF EXISTS "company_manage_all" ON appointments;
DROP POLICY IF EXISTS "worker_manage_own" ON appointments;

-- ───────────────────────────────────────────────────────────
-- POLÍTICA 1: LECTURA GENERAL (SELECT)
-- Todos pueden ver las citas para calcular disponibilidad
-- ───────────────────────────────────────────────────────────
CREATE POLICY "allow_select_all" ON appointments
  FOR SELECT
  TO public
  USING (true);

-- ───────────────────────────────────────────────────────────
-- POLÍTICAS PARA EL ROL: CLIENT
-- ───────────────────────────────────────────────────────────

-- Crear cita: el cliente solo puede insertar si se asocia como el dueño (client_id = auth.uid())
CREATE POLICY "client_insert_own" ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (client_id = auth.uid()) AND
    (status = 'pending')
  );

-- Modificar cita: el cliente solo puede actualizar si es el dueño, la cita no está completada/cancelada,
-- y se realiza con más de 2 horas de anticipación a la fecha y hora de inicio de la cita.
CREATE POLICY "client_update_own" ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    (client_id = auth.uid()) AND
    (status NOT IN ('completed', 'cancelled', 'no-show')) AND
    (((date || ' ' || LPAD(FLOOR(start_hour)::text, 2, '0') || ':' || LPAD(ROUND((start_hour - FLOOR(start_hour)) * 60)::text, 2, '0') || ':00')::timestamp) >= (now() + interval '2 hours'))
  );

-- Eliminar cita: el cliente solo puede eliminar si es el dueño y falta más de 2 horas.
CREATE POLICY "client_delete_own" ON appointments
  FOR DELETE
  TO authenticated
  USING (
    (client_id = auth.uid()) AND
    (status NOT IN ('completed', 'cancelled', 'no-show')) AND
    (((date || ' ' || LPAD(FLOOR(start_hour)::text, 2, '0') || ':' || LPAD(ROUND((start_hour - FLOOR(start_hour)) * 60)::text, 2, '0') || ':00')::timestamp) >= (now() + interval '2 hours'))
  );

-- ───────────────────────────────────────────────────────────
-- POLÍTICAS PARA EL ROL: COMPANY (DUEÑO DEL NEGOCIO)
-- ───────────────────────────────────────────────────────────

-- La empresa tiene acceso total a todas las citas de su negocio
CREATE POLICY "company_manage_all" ON appointments
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ───────────────────────────────────────────────────────────
-- POLÍTICAS PARA EL ROL: WORKER (TRABAJADOR)
-- ───────────────────────────────────────────────────────────

-- El trabajador tiene acceso total a sus propias citas asignadas
CREATE POLICY "worker_manage_own" ON appointments
  FOR ALL
  TO authenticated
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );
