# Tasks: Fix de escalación de privilegios vía profiles.role

- [ ] Migración: agregar `CHECK constraint` sobre `profiles.role`
- [ ] Migración: revocar `UPDATE` amplio sobre `profiles` para `authenticated`, otorgar `UPDATE` solo en columnas no sensibles
- [ ] Migración: crear función `set_initial_role(p_role text)` `SECURITY DEFINER` con validación de transición (solo desde rol `NULL`, solo hacia `client/company/worker`)
- [ ] (Si aplica) crear función `admin_set_user_role(p_user_id uuid, p_role text)` protegida por `is_admin()`
- [ ] Actualizar `role-select.tsx:33` y `:57` para usar `supabase.rpc('set_initial_role', { p_role: selected })`
- [ ] Grep del repo por otros `update` directos de `profiles.role` y migrarlos al mismo patrón
- [ ] Actualizar `scripts/grant_public_schema_access.sql` para reflejar el nuevo grant column-level
- [ ] Aplicar migración en desarrollo/staging
- [ ] Probar flujo completo manualmente (onboarding normal de client/company/worker + intento de escalación vía request crudo con `role: 'admin'` que debe fallar)
