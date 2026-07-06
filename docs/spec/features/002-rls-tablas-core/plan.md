# Plan: RLS explícito en tablas core sin políticas versionadas

## Enfoque

Antes de escribir policies nuevas, revisar `supabase/.migrations/` existentes para identificar y
reusar helper functions ya creadas (ej. `is_admin()`) en vez de duplicar lógica — el patrón de
policies ya usado en `appointments` sirve de referencia de estilo. Luego, una migración (o serie
corta) que hace `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` por tabla y
operación (select/insert/update/delete), siguiendo ese mismo patrón para las 6 tablas.

## Archivos afectados

- `supabase/.migrations/XXXX_rls_core_tables.sql` (nuevo)
- `scripts/grant_public_schema_access.sql` (actualizar/deprecar el comentario que asumía RLS ya existente)

## Cambios de datos (si aplica)

Solo políticas RLS (`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`). No cambia estructura de
tablas ni columnas.

## Riesgos

Policies demasiado restrictivas pueden romper pantallas que hoy leen entre tenants sin
restricción — por ejemplo `explore.tsx` necesita leer `businesses/workers/business_services` de
negocios ajenos para mostrar el marketplace público. Cada policy de `SELECT` pública debe
probarse contra ese flujo (y contra `my-appointments.tsx`, dashboards admin, etc.) antes de dar
por cerrado el trabajo, ya que el repo no tiene test suite automatizada que lo detecte por sí sola.

## Resolución (la realidad técnica varió — 2026-07-05)

1. **La premisa de la spec era parcialmente incorrecta**: las 6 tablas SÍ tenían RLS habilitado
   con 23 policies creadas fuera de versionado (dashboard), pero con huecos graves: `workers`
   tenía "Enable all for authenticated users" (CRUD cross-tenant), `profiles` era legible por
   cualquier autenticado y su `role` editable (escalación activa), y las policies de admin sobre
   `profiles` subconsultaban `profiles` (recursión infinita — el update de admin estaba roto).
   La migración dropea dinámicamente todas las policies previas de las 6 tablas y las recrea.
2. **Helpers nuevos**: `public.is_admin()` y `public.get_my_role()` (SECURITY DEFINER,
   `search_path` fijado) — no existía ninguno pese a que este plan asumía reusar `is_admin()`.
3. **`profiles` SELECT más amplio que la spec**: la UI embebe `profiles(nickname)` en reseñas y
   `profiles(avatar_url)` en cards de workers, así que además de propio+admin se permiten
   perfiles de workers de negocios visibles y de autores de reseñas. Es exactamente lo que la
   UI ya expone públicamente.
4. **Transiciones de rol dentro de la policy** (feature 001 aún no implementada): rol sin
   cambios, NULL→client/company/worker (onboarding), client→worker con registro en `workers`
   (self-heal de AuthContext). `admin` inalcanzable por self-service.
5. **Aplicación**: no existe staging (proyecto único, presupuesto $0) — se aplicó a producción
   con OK explícito del usuario, verificado con advisors + smoke tests SQL por rol.

## Follow-ups detectados (fuera de alcance de esta feature)

- Trigger que exija cita completada para crear una review (ya previsto en spec.md).
- `profiles.notification_email` visible en las filas expuestas por el SELECT (RLS no filtra
  columnas); evaluar column grants o mover el email a tabla privada.
- Tablas `gym_*` con RLS habilitado y cero policies (hoy deny-all para el cliente).
- `public.delete_user()` es SECURITY DEFINER y ejecutable por `anon` según advisors — revisar.
- La feature [[001-fix-escalacion-rol]] sigue pendiente: RPC `set_initial_role` + upsert de
  perfil de empleado vía SECURITY DEFINER para restaurar el nickname en la invitación.
