# Spec: Fix de escalación de privilegios vía profiles.role

## Qué hace

Bloquea que un usuario autenticado pueda auto-asignarse cualquier rol (especialmente `admin`)
llamando directamente a la API de Supabase, y solo permite la auto-asignación inicial entre
`client/company/worker` a través de una RPC controlada del lado del servidor.

## Por qué

`app/(auth)/role-select.tsx:33,57` hace `supabase.from('profiles').update({ role: selected })`
desde el cliente usando la anon key. La UI limita `selected` a 3 valores, pero nada del lado de la
base de datos impide un request crudo (curl/REST directo) con `role: 'admin'`. No existe ningún
`CHECK constraint` ni policy que restrinja la columna `role`, y `scripts/grant_public_schema_access.sql`
otorga `UPDATE` completo sobre `profiles` a `authenticated`. Esto está ligado al modelo multi-tenant
de `mission.md` (roles cliente/negocio/admin) — un admin no autorizado tendría acceso total al panel
de administración.

## Criterios de aceptación

- [ ] Un intento directo de `update({ role: 'admin' })` vía `supabase-js`/REST falla (permission denied / column not updatable)
- [ ] El flujo de onboarding (elegir client/company/worker en `role-select.tsx`) sigue funcionando igual para el usuario final
- [ ] Existe una función RPC `SECURITY DEFINER` (`set_initial_role`) que es el único camino para fijar el rol inicial
- [ ] La columna `profiles.role` tiene un `CHECK constraint` con los valores válidos (`client, company, worker, admin`)
- [ ] Un usuario no puede re-invocar la RPC de auto-asignación una vez que ya tiene un rol asignado (no puede pasar de `client` a `admin` llamándola de nuevo)

## Fuera de alcance

Flujo de administración para que un admin cambie el rol de otro usuario ya existente — si el
dashboard admin necesita esto, se documenta como follow-up con su propia RPC
(`admin_set_user_role`) protegida por una policy `is_admin()`, no cubierta en esta feature.
