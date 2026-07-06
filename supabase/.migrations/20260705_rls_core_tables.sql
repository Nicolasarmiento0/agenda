-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN CANÓNICA: RLS explícito en tablas core
-- Creado: 2026-07-05
-- Objetivo: Versionar y endurecer las políticas RLS de las 6 tablas core
--           (profiles, businesses, workers, business_services,
--           service_categories, reviews) que hasta ahora dependían de
--           policies creadas fuera de versionado vía dashboard, con huecos
--           graves: workers con "Enable all" para cualquier autenticado,
--           profiles legible por todos y con role editable (escalación de
--           privilegios), y checks de admin con subquery recursiva sobre
--           profiles que rompe con "infinite recursion detected".
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Helper functions ────────────────────────────────────
-- SECURITY DEFINER: leen profiles saltando RLS, lo que evita la recursión
-- infinita al usarlas dentro de policies de la propia tabla profiles.

-- Rol actual del usuario autenticado (NULL si no tiene perfil o no hay sesión)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ¿El usuario autenticado es admin de la plataforma?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ─── 2. Habilitar RLS explícitamente en las 6 tablas ────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;

-- ─── 3. Limpiar TODAS las policies previas de las 6 tablas ──
-- Se dropean dinámicamente porque las existentes se crearon fuera de
-- versionado (nombres en español, duplicadas) y pueden variar entre entornos.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','businesses','workers',
                        'business_services','service_categories','reviews')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ─── 4. profiles ────────────────────────────────────────────

-- Lectura: perfil propio, admin, y los dos casos que la UI expone
-- públicamente: perfiles de workers de negocios visibles (avatar en cards)
-- y perfiles de autores de reseñas (nickname en listas de reviews).
CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.workers w
      JOIN public.businesses b ON b.id = w.business_id
      WHERE w.user_id = profiles.id
        AND (b.status = 'approved' OR b.owner_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.reviews r WHERE r.client_id = profiles.id
    )
  );

-- Alta: solo el propio perfil y nunca con rol admin. El alta normal la hace
-- el trigger handle_new_user (SECURITY DEFINER, no pasa por RLS).
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
    AND (role IS NULL OR role IN ('client', 'company', 'worker'))
  );

-- Edición propia con transiciones de rol controladas (cierra la escalación
-- de privilegios de [[001-fix-escalacion-rol]] a nivel de policy):
--   • rol sin cambios (updates de nickname/avatar)
--   • NULL → client/company/worker (onboarding en role-select)
--   • client → worker solo si existe un registro en workers vinculado
--     (self-heal de AuthContext al aceptar invitación de empleado)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND (
      role IS NOT DISTINCT FROM public.get_my_role()
      OR (public.get_my_role() IS NULL AND role IN ('client', 'company', 'worker'))
      OR (
        public.get_my_role() = 'client'
        AND role = 'worker'
        AND EXISTS (SELECT 1 FROM public.workers w WHERE w.user_id = (SELECT auth.uid()))
      )
    )
  );

-- Admin puede editar cualquier perfil (incluye asignar roles)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 5. businesses ──────────────────────────────────────────

-- Lectura pública de negocios aprobados; owner y admin ven los propios/todos
CREATE POLICY "businesses_select_public" ON public.businesses
  FOR SELECT
  USING (
    status = 'approved'
    OR owner_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Alta solo del propio negocio (o admin)
CREATE POLICY "businesses_insert_owner" ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR public.is_admin());

-- Edición solo owner o admin; el WITH CHECK impide reasignar owner_id
CREATE POLICY "businesses_update_owner_admin" ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (owner_id = (SELECT auth.uid()) OR public.is_admin());

-- Borrado solo owner o admin
CREATE POLICY "businesses_delete_owner_admin" ON public.businesses
  FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR public.is_admin());

-- ─── 6. workers ─────────────────────────────────────────────
-- Reemplaza la policy "Enable all for authenticated users" que daba CRUD
-- total cross-tenant a cualquier usuario autenticado.

-- Lectura: workers de negocios aprobados (explorar/reservar/inbox), el
-- propio registro del worker (Sidebar/AuthContext), los del owner, y admin.
-- Nota: la página pública /{slug} no depende de esta policy (usa la función
-- SECURITY DEFINER de 20260615_public_business_links.sql).
CREATE POLICY "workers_select_scoped" ON public.workers
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR business_id IN (SELECT id FROM public.businesses WHERE status = 'approved')
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

-- Escritura solo del owner del negocio correspondiente, o admin
CREATE POLICY "workers_insert_owner_admin" ON public.workers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "workers_update_owner_admin" ON public.workers
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "workers_delete_owner_admin" ON public.workers
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

-- ─── 7. business_services ───────────────────────────────────

-- Lectura: servicios de negocios aprobados, del propio owner, o admin
CREATE POLICY "business_services_select_scoped" ON public.business_services
  FOR SELECT
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE status = 'approved')
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

-- Escritura solo owner del negocio o admin
CREATE POLICY "business_services_insert_owner_admin" ON public.business_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "business_services_update_owner_admin" ON public.business_services
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "business_services_delete_owner_admin" ON public.business_services
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = (SELECT auth.uid()))
    OR public.is_admin()
  );

-- ─── 8. service_categories ──────────────────────────────────

-- Catálogo global: lectura pública (explore, setup de negocio, /{slug})
CREATE POLICY "service_categories_select_public" ON public.service_categories
  FOR SELECT
  USING (true);

-- Solo admin gestiona el catálogo (insert/update/delete)
CREATE POLICY "service_categories_write_admin" ON public.service_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 9. reviews ─────────────────────────────────────────────

-- Lectura pública de reseñas
CREATE POLICY "reviews_select_public" ON public.reviews
  FOR SELECT
  USING (true);

-- Solo el propio cliente autor puede crear/editar su reseña
CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (SELECT auth.uid()));

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- Admin modera reseñas (mission.md: "supervisa y modera negocios")
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════
/*
  -- 1. Policies activas por tabla (deben ser solo las de esta migración)
  SELECT tablename, policyname, cmd, roles
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('profiles','businesses','workers',
                      'business_services','service_categories','reviews')
  ORDER BY tablename, policyname;

  -- 2. RLS habilitado en las 6 tablas (todas deben ser true)
  SELECT relname, relrowsecurity FROM pg_class
  WHERE relnamespace = 'public'::regnamespace
    AND relname IN ('profiles','businesses','workers',
                    'business_services','service_categories','reviews');

  -- 3. Escalación de rol debe fallar: como usuario client autenticado,
  --    UPDATE profiles SET role='admin' WHERE id = auth.uid()
  --    → 0 filas afectadas / error de policy.
*/
