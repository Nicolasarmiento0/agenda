-- ═══════════════════════════════════════════════════════════
-- GIMNASIO: Sistema de Membresías y Reservas
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Columnas adicionales en businesses (si no existen) ───
-- (booking_window_* ya se graban desde business-setup, pero las
--  añadimos por si la tabla fue creada antes del setup actualizado)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS booking_window_day       int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_window_open_time  time    DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS booking_window_close_time time    DEFAULT '23:00:00';

-- ─── 2. Tabla: solicitudes de membresía ──────────────────────
CREATE TABLE IF NOT EXISTS membership_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id     uuid        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  message       text,                         -- mensaje opcional del cliente
  status        text        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, client_id)              -- un cliente solo puede tener 1 solicitud activa por negocio
);

-- ─── 3. Tabla: membresías activas del gimnasio ───────────────
CREATE TABLE IF NOT EXISTS gym_memberships (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id     uuid        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  client_type   text        NOT NULL DEFAULT 'dynamic',  -- dynamic | static
  plan          text        NOT NULL DEFAULT 'basic',    -- basic | premium | vip
  status        text        NOT NULL DEFAULT 'active',   -- active | inactive | suspended
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, client_id)
);

-- ─── 4. Índices de rendimiento ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_membership_requests_business ON membership_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_membership_requests_client   ON membership_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_membership_requests_status   ON membership_requests(status);

CREATE INDEX IF NOT EXISTS idx_gym_memberships_business     ON gym_memberships(business_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_client       ON gym_memberships(client_id);
CREATE INDEX IF NOT EXISTS idx_gym_memberships_status       ON gym_memberships(status);

-- ─── 5. RLS (Row Level Security) ─────────────────────────────

-- membership_requests: cliente ve/crea las suyas; company ve las de su negocio
ALTER TABLE membership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_own_requests"  ON membership_requests;
DROP POLICY IF EXISTS "company_biz_requests" ON membership_requests;
DROP POLICY IF EXISTS "insert_own_request"   ON membership_requests;
DROP POLICY IF EXISTS "company_update_request" ON membership_requests;

CREATE POLICY "client_own_requests" ON membership_requests
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "insert_own_request" ON membership_requests
  FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "company_biz_requests" ON membership_requests
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "company_update_request" ON membership_requests
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- gym_memberships: cliente ve la suya; company ve las de su negocio
ALTER TABLE gym_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_own_membership"   ON gym_memberships;
DROP POLICY IF EXISTS "company_biz_memberships" ON gym_memberships;
DROP POLICY IF EXISTS "company_insert_membership" ON gym_memberships;
DROP POLICY IF EXISTS "company_update_membership" ON gym_memberships;

CREATE POLICY "client_own_membership" ON gym_memberships
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "company_biz_memberships" ON gym_memberships
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "company_insert_membership" ON gym_memberships
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "company_update_membership" ON gym_memberships
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ─── Fin del script ──────────────────────────────────────────
-- PLAN LIMITS (referencia para el frontend):
--   basic   = 1 clase/semana
--   premium = 3 clases/semana
--   vip     = 5 clases/semana
