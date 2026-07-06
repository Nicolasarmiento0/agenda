-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN CANÓNICA: Fix de escalación de privilegios vía profiles.role
-- Creado: 2026-07-05
-- Objetivo: Impedir a nivel de base que un usuario autenticado se
--           auto-asigne un rol arbitrario (especialmente 'admin') con un
--           request crudo a la Data API. Defensa en profundidad sobre la
--           policy de 20260705_rls_core_tables.sql:
--             1. CHECK constraint con los valores válidos de role.
--             2. UPDATE por columna: authenticated pierde UPDATE sobre
--                role (y cualquier columna futura no listada).
--             3. RPC set_initial_role: único camino de auto-asignación,
--                solo transiciones legítimas, nunca 'admin'.
--             4. RPC set_worker_nickname: repone el nickname en el flujo
--                de invitación de empleados, que el punto 2 y RLS bloquean.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. CHECK constraint sobre profiles.role ────────────────
-- Datos verificados el 2026-07-05: solo existen client/company/worker/admin/NULL.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('client', 'company', 'worker', 'admin'));

-- ─── 2. UPDATE por columna para authenticated ───────────────
-- role, id y created_at dejan de ser actualizables vía Data API; solo las
-- columnas de perfil editables por el propio usuario quedan concedidas.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (nickname, avatar_url, notification_email) ON TABLE public.profiles TO authenticated;

-- ─── 3. RPC set_initial_role ────────────────────────────────
-- SECURITY DEFINER: corre como dueño de la tabla, por lo que no le afecta
-- el revoke de columna ni RLS. Transiciones permitidas (espejo de la policy
-- profiles_update_own de 20260705_rls_core_tables.sql):
--   • NULL → client/company/worker  (onboarding en role-select)
--   • client → worker con registro vinculado en workers (self-heal de
--     AuthContext cuando un usuario existente es vinculado como empleado)
--   • mismo rol → no-op idempotente
-- 'admin' jamás es asignable por esta vía.
CREATE OR REPLACE FUNCTION public.set_initial_role(p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'set_initial_role: se requiere sesión activa';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('client', 'company', 'worker') THEN
    RAISE EXCEPTION 'set_initial_role: rol inválido';
  END IF;

  SELECT role INTO v_current
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'set_initial_role: perfil no encontrado';
  END IF;

  IF v_current IS NOT DISTINCT FROM p_role THEN
    RETURN; -- idempotente: el rol ya es el solicitado
  END IF;

  IF v_current IS NULL THEN
    UPDATE public.profiles SET role = p_role WHERE id = v_uid;
  ELSIF v_current = 'client' AND p_role = 'worker'
    AND EXISTS (SELECT 1 FROM public.workers w WHERE w.user_id = v_uid) THEN
    UPDATE public.profiles SET role = 'worker' WHERE id = v_uid;
  ELSE
    RAISE EXCEPTION 'set_initial_role: el rol ya fue asignado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_initial_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_role(text) TO authenticated;

-- ─── 4. RPC set_worker_nickname ─────────────────────────────
-- El flujo de invitar empleado (company-employees / admin-business-employees)
-- ya no puede escribir el perfil de otro usuario (RLS + grants por columna).
-- Esta RPC repone el nickname inicial con validaciones estrictas:
--   • el caller debe ser owner de un negocio con ese worker vinculado, o admin
--   • solo pisa el nickname por defecto del trigger handle_new_user ('Usuario'
--     o NULL), nunca renombra un perfil que el usuario ya personalizó
CREATE OR REPLACE FUNCTION public.set_worker_nickname(p_user_id uuid, p_nickname text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nickname text := trim(coalesce(p_nickname, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'set_worker_nickname: se requiere sesión activa';
  END IF;

  IF v_nickname = '' OR length(v_nickname) > 60 THEN
    RAISE EXCEPTION 'set_worker_nickname: nickname inválido';
  END IF;

  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.workers w
      JOIN public.businesses b ON b.id = w.business_id
      WHERE w.user_id = p_user_id AND b.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'set_worker_nickname: no autorizado para este usuario';
  END IF;

  UPDATE public.profiles
  SET nickname = v_nickname
  WHERE id = p_user_id
    AND (nickname IS NULL OR nickname = 'Usuario');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_worker_nickname(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_worker_nickname(uuid, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════
/*
  -- 1. El constraint existe
  SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_role_check';

  -- 2. authenticated NO tiene UPDATE sobre la columna role (debe ser false)
  SELECT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE');

  -- 3. authenticated SÍ tiene UPDATE sobre nickname (debe ser true)
  SELECT has_column_privilege('authenticated', 'public.profiles', 'nickname', 'UPDATE');

  -- 4. Como usuario autenticado, UPDATE profiles SET role='admin' → 42501
  --    permission denied; rpc set_initial_role con rol ya asignado → exception.
*/
