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
--                 RLS ya restringe qué filas puede ver/modificar cada usuario.
--   service_role → ALL (usado por Edge Functions y operaciones admin).
--

-- profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
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

-- appointments (policy "allow_select_all TO public" → anon puede SELECT)
GRANT SELECT ON TABLE public.appointments TO anon;
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
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

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
