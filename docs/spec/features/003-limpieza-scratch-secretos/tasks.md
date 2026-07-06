# Tasks: Limpieza de .scratch/ y secretos commiteados

- [x] Corregir `scratch/` → `.scratch/` en `.gitignore`
- [x] `git rm -r --cached .scratch/` — 31 archivos destrackeados
- [x] Confirmar que los archivos siguen existiendo en disco tras el `rm --cached` — los 31 siguen en `.scratch/`, y `git check-ignore` confirma que ahora quedan ignorados
- [x] Commit: "fix: exclude .scratch/ from version control and untrack leaked test credentials" (`7402672` en `pre-production`)
- [x] Verificar si el anon key expuesto en los archivos de `.scratch/` coincide con el `.env` actual de producción — **SÍ coincide**: es el mismo anon key (rol `anon`, proyecto `qkciuhruwwrsikmkhlqm`) que usa producción hoy. Solo se filtró 1 key distinta en los 31 archivos; no hay ningún `service_role` expuesto.
- [x] Si coincide, preguntar al usuario si quiere rotar el proyecto/anon key desde el dashboard de Supabase — preguntado el 2026-07-05; **decisión: no rotar por ahora**. Contexto: el repo remoto (`Nicolasarmiento0/agenda`) es público, así que el key sigue visible en el historial; el anon key es público por diseño y la protección real recae en RLS (feature 002). Reevaluar si RLS muestra huecos.
- [x] Presentar al usuario la opción de reescritura de historia (BFG/filter-repo) — presentada el 2026-07-05; **decisión: no reescribir**. Los 31 archivos siguen visibles en commits anteriores a `7402672`; se acepta esa limitación.
- [x] Agregar nota breve en README sobre no commitear `.scratch/` (sección "Scripts locales de desarrollo")
- [x] Probar flujo completo manualmente — verificado: archivos en disco, fuera del índice de git, e ignorados por el patrón nuevo; los scripts no dependen de git para ejecutarse localmente
