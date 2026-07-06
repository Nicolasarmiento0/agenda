# Tasks: RLS explícito en tablas core sin políticas versionadas

- [x] Revisar `supabase/.migrations/` para identificar y reusar helper functions existentes — **no existía ninguna** (`is_admin()` no estaba ni en repo ni en la base); se crearon `public.is_admin()` y `public.get_my_role()` (SECURITY DEFINER) en la migración, necesarias además para evitar recursión infinita en policies de `profiles` que consultan `profiles`
- [x] Listar (grep) todas las queries del repo que leen/escriben cada una de las 6 tablas — hallazgo clave: la UI embebe `profiles(nickname)` en reseñas y `profiles(avatar_url)` en cards de workers, lo que obligó a ampliar el SELECT de `profiles` respecto a la spec (ver plan.md)
- [x] Migración: `ENABLE RLS` + policies para `profiles` — select propio+admin+workers visibles+autores de reseñas; update propio con transiciones de rol controladas (NULL→client/company/worker, client→worker con link en `workers`; admin bloqueado) — cierra la escalación de [[001-fix-escalacion-rol]] a nivel policy
- [x] Migración: `ENABLE RLS` + policies para `businesses` (select público de aprobados+owner+admin, insert/update/delete owner/admin, con WITH CHECK que impide reasignar `owner_id`)
- [x] Migración: `ENABLE RLS` + policies para `workers` — **eliminada la policy "Enable all for authenticated users"** que daba CRUD cross-tenant a cualquier autenticado
- [x] Migración: `ENABLE RLS` + policies para `business_services` y `service_categories`
- [x] Migración: `ENABLE RLS` + policies para `reviews` (select público, insert/update solo autor, + admin para moderación per mission.md)
- [x] Aplicar migración — aplicada en producción (único entorno; no hay staging) con OK explícito del usuario el 2026-07-05, vía Supabase MCP (`rls_core_tables`)
- [x] Correr `get_advisors` y confirmar ausencia de warnings de RLS en estas 6 tablas — **limpio**; quedan findings pre-existentes fuera de alcance (ver follow-ups en plan.md)
- [x] Actualizar/deprecar `scripts/grant_public_schema_access.sql` con nota de qué reemplaza a qué
- [x] Smoke tests SQL simulando cada rol (client, company owner, admin, anon): lecturas escopeadas correctas, escalación de rol bloqueada (RLS violation), escrituras cross-tenant 0 filas, onboarding NULL→client OK, owner CRUD sobre lo propio OK, admin ve/edita todo sin recursión
- [ ] Probar flujo completo manualmente en la app (explore, my-appointments, company-employees, company-services, dashboards admin, onboarding de rol, invitación de empleado) — pendiente de ejecución humana

> Nota de comportamiento: al invitar un empleado nuevo desde company-employees, el upsert
> cross-user de `profiles` ahora es bloqueado por RLS (error silencioso, el flujo continúa);
> el rol del worker se auto-corrige al primer login vía el self-heal de AuthContext y el
> nombre visible sale de `workers.name`. Solo el nickname del perfil queda como 'Usuario'
> hasta que el worker lo edite. Fix definitivo: RPC SECURITY DEFINER en [[001-fix-escalacion-rol]].
