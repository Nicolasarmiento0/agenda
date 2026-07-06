# Tasks: Limpieza de .scratch/ y secretos commiteados

- [ ] Corregir `scratch/` → `.scratch/` en `.gitignore`
- [ ] `git rm -r --cached .scratch/`
- [ ] Confirmar que los archivos siguen existiendo en disco tras el `rm --cached`
- [ ] Commit: "fix: exclude .scratch/ from version control and untrack leaked test credentials"
- [ ] Verificar si el anon key expuesto en los archivos de `.scratch/` coincide con el `.env` actual de producción
- [ ] Si coincide, preguntar al usuario si quiere rotar el proyecto/anon key desde el dashboard de Supabase (acción manual, no automatizable vía código)
- [ ] Presentar al usuario la opción de reescritura de historia (BFG/filter-repo) como tarea opcional separada, sin ejecutarla por defecto
- [ ] Agregar nota breve en README sobre no commitear `.scratch/`
- [ ] Probar flujo completo manualmente (confirmar que los scripts de `.scratch/` siguen funcionando localmente, solo dejaron de trackearse en git)
