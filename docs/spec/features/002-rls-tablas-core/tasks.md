# Tasks: RLS explícito en tablas core sin políticas versionadas

- [ ] Revisar `supabase/.migrations/` para identificar y reusar helper functions existentes (`is_admin()`, etc.)
- [ ] Listar (grep) todas las queries del repo que leen/escriben cada una de las 6 tablas, para no romper ningún flujo
- [ ] Migración: `ENABLE RLS` + policies para `profiles` (select/update propio + admin, `role` excluido — ver [[001-fix-escalacion-rol]])
- [ ] Migración: `ENABLE RLS` + policies para `businesses` (select público de activos, write solo owner/admin)
- [ ] Migración: `ENABLE RLS` + policies para `workers` (select público scoped, write solo owner del negocio/admin)
- [ ] Migración: `ENABLE RLS` + policies para `business_services` y `service_categories` (select público, write solo owner/admin)
- [ ] Migración: `ENABLE RLS` + policies para `reviews` (select público, insert/update solo el propio `client_id`)
- [ ] Aplicar migración en desarrollo/staging
- [ ] Correr `get_advisors` (Supabase MCP) y confirmar ausencia de warnings de RLS en estas 6 tablas
- [ ] Actualizar/deprecar `scripts/grant_public_schema_access.sql` con nota de qué reemplaza a qué
- [ ] Probar flujo completo manualmente (explore, my-appointments, company-employees, company-services, dashboards admin)
