-- ═══════════════════════════════════════════════════════════
-- NUCORA: Soporte para Agendamiento Inteligente por Categorías
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Modificar tabla appointments ───────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS meeting_link       text,
  ADD COLUMN IF NOT EXISTS modality           text    DEFAULT 'presencial', -- presencial | online
  ADD COLUMN IF NOT EXISTS category_type       text    DEFAULT 'beauty',     -- health | beauty | fitness | courts | education | automotive
  ADD COLUMN IF NOT EXISTS service_request_id  uuid;

-- ─── 2. Tabla: membership_plans (Planes personalizados) ────────
CREATE TABLE IF NOT EXISTS membership_plans (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              text          NOT NULL,
  monthly_price     numeric       NOT NULL DEFAULT 0.00,
  max_classes       int           NOT NULL DEFAULT 0,
  unlimited_access  boolean       NOT NULL DEFAULT false,
  active            boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_business ON membership_plans(business_id);

-- ─── 3. Tabla: class_sessions (Clases de Gimnasio) ─────────────
CREATE TABLE IF NOT EXISTS class_sessions (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title             text          NOT NULL,
  instructor_id     uuid          REFERENCES workers(id) ON DELETE SET NULL,
  start_time        timestamptz   NOT NULL,
  end_time          timestamptz   NOT NULL,
  max_capacity      int           NOT NULL DEFAULT 20,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_business ON class_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor ON class_sessions(instructor_id);

-- ─── 4. Tabla: static_students (Alumnos Estáticos) ─────────────
CREATE TABLE IF NOT EXISTS static_students (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id          uuid          NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  active            boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_static_students_student ON static_students(student_id);
CREATE INDEX IF NOT EXISTS idx_static_students_class ON static_students(class_id);

-- ─── 5. Tabla: service_requests (Cotización Mecánica/Hogar) ─────
CREATE TABLE IF NOT EXISTS service_requests (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id           uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description         text          NOT NULL,
  images              text[]        DEFAULT '{}'::text[],
  status              text          NOT NULL DEFAULT 'pending', -- pending | estimated | confirmed | rejected
  estimated_duration  int,                                      -- duración en minutos
  estimated_price     numeric,
  proposed_date       text,                                     -- YYYY-MM-DD
  proposed_hour       numeric,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_business ON service_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- Relacionar el ID en appointments después de crear la tabla
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS fk_appointments_service_requests,
  ADD CONSTRAINT fk_appointments_service_requests FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL;

-- ─── 6. Tabla: medical_records (Salud y Pacientes) ──────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_id        uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id         uuid          REFERENCES workers(id) ON DELETE SET NULL,
  diagnosis         text          NOT NULL,
  treatment         text,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_business ON medical_records(business_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);

-- ─── 7. Habilitar RLS (Row Level Security) ─────────────────────

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- ─── 8. Políticas RLS ──────────────────────────────────────────

-- 1. membership_plans: cualquiera lee; empresa edita
CREATE POLICY "anyone_read_membership_plans" ON membership_plans FOR SELECT USING (true);
CREATE POLICY "company_manage_membership_plans" ON membership_plans
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 2. class_sessions: cualquiera lee; empresa edita
CREATE POLICY "anyone_read_class_sessions" ON class_sessions FOR SELECT USING (true);
CREATE POLICY "company_manage_class_sessions" ON class_sessions
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 3. static_students: alumno lee el propio; empresa administra
CREATE POLICY "student_read_own_static" ON static_students FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "company_manage_static_students" ON static_students
  USING (class_id IN (SELECT id FROM class_sessions WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())))
  WITH CHECK (class_id IN (SELECT id FROM class_sessions WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

-- 4. service_requests: cliente ve y crea los propios; empresa administra los de su negocio
CREATE POLICY "client_manage_own_requests" ON service_requests
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "company_manage_biz_requests" ON service_requests
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- 5. medical_records: paciente ve los propios; doctores/empresa administran
CREATE POLICY "patient_read_own_records" ON medical_records FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "company_manage_medical_records" ON medical_records
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "worker_manage_medical_records" ON medical_records
  USING (
    business_id IN (
      SELECT business_id FROM workers WHERE user_id = auth.uid() AND active = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM workers WHERE user_id = auth.uid() AND active = true
    )
  );

-- ─── Fin del script ──────────────────────────────────────────
