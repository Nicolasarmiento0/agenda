-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: GRANTs explícitos para el esquema public
-- Requerido por Supabase: a partir del 30-Oct-2026 las tablas en el
-- esquema "public" NO se exponen a la Data API sin un GRANT explícito.
-- Ejecutar una sola vez en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Acceso al esquema public ────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─── 2. GRANTs por tabla ────────────────────────────────────────────────
--
-- CRITERIO:
--   anon        → SELECT en tablas con política "allow_select_all" o datos
--                 de catálogo público (negocios, servicios, categorías).
--   authenticated → SELECT + INSERT + UPDATE + DELETE en todas las tablas.
--                 RLS restringe qué filas puede ver/modificar cada usuario.
--   service_role → ALL (usado por Edge Functions y operaciones admin).
--
-- ⚠ NOTA (2026-07-05): la premisa "RLS ya restringe" NO era cierta para
--   profiles, businesses, workers, business_services, service_categories
--   y reviews — sus policies reales se versionaron y endurecieron en
--   supabase/.migrations/20260705_rls_core_tables.sql. Estos GRANTs solo
--   exponen las tablas a la Data API; el aislamiento fila-por-fila lo
--   garantizan las policies de esa migración. Cualquier tabla nueva DEBE
--   nacer con sus policies versionadas antes de recibir GRANTs aquí.
--

-- profiles
-- UPDATE es por columna: 'role' NO es actualizable vía Data API — la
-- asignación de rol pasa exclusivamente por la RPC set_initial_role
-- (ver supabase/.migrations/20260705_role_escalation_fix.sql).
GRANT SELECT, INSERT, DELETE ON TABLE public.profiles TO authenticated;
GRANT UPDATE (nickname, avatar_url, notification_email) ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- businesses (descubrimiento público + gestión autenticada)
GRANT SELECT ON TABLE public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.businesses TO authenticated;
GRANT ALL ON TABLE public.businesses TO service_role;

-- workers (visible públicamente para mostrar disponibilidad)
GRANT SELECT ON TABLE public.workers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workers TO authenticated;
GRANT ALL ON TABLE public.workers TO service_role;

-- service_categories (catálogo público de categorías)
GRANT SELECT ON TABLE public.service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_categories TO authenticated;
GRANT ALL ON TABLE public.service_categories TO service_role;

-- business_services (catálogo público de servicios por negocio)
GRANT SELECT ON TABLE public.business_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_services TO authenticated;
GRANT ALL ON TABLE public.business_services TO service_role;

-- appointments (El acceso directo a appointments fue revocado para anon para evitar fuga de PII)
-- Se removió: GRANT SELECT ON TABLE public.appointments TO anon;
-- Explicación: La tabla appointments contiene información personal identificable (PII) y financiera.
-- El acceso a la disponibilidad de citas públicas ahora se canaliza a través de la vista segura 'availability_slots'.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.appointments TO service_role;

-- reviews (reseñas públicas)
GRANT SELECT ON TABLE public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;

-- membership_requests (privado: solo usuarios autenticados)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.membership_requests TO authenticated;
GRANT ALL ON TABLE public.membership_requests TO service_role;

-- gym_memberships (privado: solo usuarios autenticados)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gym_memberships TO authenticated;
GRANT ALL ON TABLE public.gym_memberships TO service_role;

-- ─── 3. Sequences (para columnas SERIAL / gen_random_uuid no aplica, ────
--       pero por si alguna tabla usa BIGSERIAL u otra secuencia)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ─── 4. Privilegios DEFAULT para tablas FUTURAS ──────────────────────────
-- Cualquier tabla nueva creada en public heredará estos permisos
-- sin necesidad de correr este script de nuevo.
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT ON TABLES TO anon;
-- Explicación: Se removió la concesión de SELECT por defecto al rol anónimo para evitar exponer
-- accidentalmente tablas de datos nuevas y confidenciales creadas en el futuro. Cualquier
-- acceso del rol 'anon' a tablas o vistas específicas debe concederse de forma explícita.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- Verifica en: Dashboard → Database → Roles → anon / authenticated
-- o usa el Security Advisor para confirmar que todas las tablas
-- están expuestas correctamente.
-- ═══════════════════════════════════════════════════════════════════════
