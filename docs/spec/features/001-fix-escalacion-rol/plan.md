# Plan: Fix de escalación de privilegios vía profiles.role

## Enfoque

1. Migración SQL: agregar `CHECK constraint` sobre `profiles.role` limitando a los valores válidos
   (`client, company, worker, admin`).
2. Migración SQL: revocar el `UPDATE` genérico sobre `profiles` para el rol `authenticated` y
   otorgar `UPDATE` explícito solo sobre columnas no sensibles (ej. `full_name, avatar_url, phone`),
   **excluyendo `role`** — patrón estándar de Supabase de privilegios a nivel de columna:
   `REVOKE UPDATE ON public.profiles FROM authenticated; GRANT UPDATE (col1, col2, ...) ON public.profiles TO authenticated;`
3. Crear función RPC `set_initial_role(p_role text)` `SECURITY DEFINER`: valida que el `role`
   actual del usuario invocante sea `NULL`/sin asignar y que `p_role` esté en
   `('client', 'company', 'worker')` — nunca permite `admin`. Al correr con los privilegios del
   dueño de la función, puede hacer el `UPDATE` de `role` sin verse afectada por el revoke de
   columna del punto 2.
4. Actualizar `app/(auth)/role-select.tsx:33` y `:57` para llamar
   `supabase.rpc('set_initial_role', { p_role: selected })` en vez del `update` directo sobre la tabla.
5. Grep del repo por otros lugares que hagan `update` directo de `profiles.role` y migrarlos al
   mismo patrón de RPC.

## Archivos afectados

- `supabase/.migrations/XXXX_role_escalation_fix.sql` (nuevo)
- `app/(auth)/role-select.tsx`
- `scripts/grant_public_schema_access.sql` (actualizar para reflejar el grant column-level)

## Cambios de datos (si aplica)

- `CHECK constraint` sobre `profiles.role`
- Cambio de grants de `UPDATE` amplio a `UPDATE` por columna sobre `profiles` para `authenticated`
- Nueva función `set_initial_role(p_role text)` `SECURITY DEFINER`

## Riesgos

Si existe (o se planea) un panel de administración que cambie el rol de terceros, necesita su
propia RPC `admin_set_user_role(p_user_id, p_role)` protegida por una policy/check `is_admin()` —
no debe reusarse `set_initial_role` para ese caso, ya que esa función solo permite la
auto-asignación inicial de un usuario sobre sí mismo.

## Resolución (la realidad técnica varió — 2026-07-05)

1. **Columnas reales**: el plan asumía `full_name/phone`; el schema real de `profiles` tiene
   `nickname, avatar_url, notification_email` — esas son las columnas con `GRANT UPDATE`.
2. **`set_initial_role` admite dos transiciones extra** además de NULL→client/company/worker:
   `client→worker` validando que exista un registro en `workers` con `user_id = auth.uid()`
   (el self-heal de `AuthContext.tsx` depende de esa transición), y no-op idempotente si el rol
   ya es el solicitado. `admin` sigue siendo inalcanzable. Es espejo de la policy
   `profiles_update_own` de [[002-rls-tablas-core]].
3. **RPC adicional `set_worker_nickname(p_user_id, p_nickname)`**: los flujos de invitación de
   empleados (`company-employees.tsx` y `admin-business-employees.tsx`) upserteaban el perfil de
   OTRO usuario con `role: 'worker'` — bloqueado por RLS (002) y por los grants por columna de
   esta feature; en el flujo de admin además abortaba la creación del worker. Ambos flujos ahora
   insertan primero el registro en `workers` y luego llaman esta RPC, que valida caller
   owner-del-negocio-vinculado o admin y solo pisa el nickname por defecto ('Usuario'/NULL).
   El `role` del worker lo fija el propio worker en su primer login vía el self-heal → RPC.
   Esto cierra la degradación de nickname documentada en el plan de la 002.
4. **Aplicación**: ejecutada manualmente por el usuario en el SQL editor (proyecto único, sin
   staging); verificada con queries de privilegios y smoke tests por rol.
