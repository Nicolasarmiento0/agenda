# Spec: Limpieza de .scratch/ y secretos commiteados

## Qué hace

Saca del control de versiones los 31 archivos de `.scratch/` que contienen URL de Supabase y anon
key hardcodeadas, corrige el `.gitignore` que causó el leak, y deja documentado el criterio a
futuro para scripts locales de desarrollo.

## Por qué

`.gitignore:49` excluye `scratch/` (sin punto inicial), lo cual no matchea la carpeta real
`.scratch/` usada para scripts de prueba/debug. Como resultado, 31 archivos con URL de Supabase y
anon key hardcodeadas quedaron commiteados en el historial de git, exponiendo estructura interna
del proyecto y credenciales de prueba.

## Criterios de aceptación

- [ ] `.gitignore` corregido a `.scratch/`
- [ ] `.scratch/` fuera del tracking de git (`git rm -r --cached`), los archivos se mantienen en disco para seguir usándose localmente
- [ ] Confirmado si el anon key expuesto coincide con el usado hoy en producción
- [ ] Documentada la decisión sobre reescritura de historia de git (no se ejecuta salvo pedido explícito del usuario)
- [ ] Nota agregada en README/CONTRIBUTING sobre no commitear `.scratch/`

## Fuera de alcance

Reescritura de historia de git (`git filter-repo`/BFG) para eliminar las credenciales de commits
pasados — se presenta como decisión aparte por ser una operación destructiva y difícil de
revertir (requiere force-push y re-clonado por cualquier colaborador), no se ejecuta como parte
de esta feature sin confirmación explícita.
