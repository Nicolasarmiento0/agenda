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
