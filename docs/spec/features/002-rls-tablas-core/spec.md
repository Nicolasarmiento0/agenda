# Spec: RLS explícito en tablas core sin políticas versionadas

## Qué hace

Habilita y versiona políticas RLS explícitas fila-por-fila en las 6 tablas que hoy dependen
únicamente de un grant amplio a `authenticated` sin ninguna policy real detrás:
`profiles, businesses, workers, business_services, service_categories, reviews`.

## Por qué

`scripts/grant_public_schema_access.sql` otorga a `authenticated` (y en algunos casos a `anon`)
permisos amplios de SELECT/INSERT/UPDATE/DELETE sobre estas 6 tablas asumiendo que "RLS ya
restringe qué filas puede ver/modificar cada usuario" — pero no existe ni un solo `CREATE POLICY`
ni `ENABLE ROW LEVEL SECURITY` versionado para ellas en todo el repo (a diferencia de
`appointments`, `medical_records`, etc. que sí tienen policies). Por evidencia de código, cualquier
usuario autenticado tiene hoy CRUD sin restricción de fila sobre las 6 tablas — rompe el modelo
multi-tenant descrito en `mission.md`.

## Criterios de aceptación

- [ ] RLS `ENABLE` en las 6 tablas
- [ ] `profiles`: `SELECT` propio + admin; `UPDATE` propio (sin la columna `role`, ver [[001-fix-escalacion-rol]]) + admin
- [ ] `businesses`: `SELECT` público de negocios activos (necesario para el booking link `/{slug}`); `INSERT/UPDATE/DELETE` solo si `owner_id = auth.uid()` o admin
- [ ] `workers`: `SELECT` público scoped a negocio (para explorar/reservar); escritura solo por el owner del `business_id` correspondiente o admin
- [ ] `business_services` / `service_categories`: `SELECT` público; escritura solo por el owner del negocio o admin
- [ ] `reviews`: `SELECT` público; `INSERT/UPDATE` solo por el propio `client_id` autor
- [ ] `get_advisors` (Supabase MCP) no reporta warnings de "RLS disabled"/"RLS enabled no policy" para estas 6 tablas tras aplicar

## Fuera de alcance

Trigger de negocio que valide que una review solo se puede crear tras una cita completada por ese
cliente — se documenta como follow-up, no bloquea el cierre de esta feature.
