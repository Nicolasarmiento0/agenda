# Plan: Limpieza de .scratch/ y secretos commiteados

## Enfoque

Corregir el patrón en `.gitignore`, destrackear la carpeta `.scratch/` de git manteniendo los
archivos en disco, commitear el fix, y evaluar junto al usuario si el anon key expuesto amerita
rotación desde el dashboard de Supabase.

## Archivos afectados

- `.gitignore`
- Remoción de 31 archivos del índice de git bajo `.scratch/` (no se borran del disco)
- `README.md` o `CONTRIBUTING.md` (nota breve sobre no commitear `.scratch/`)

## Cambios de datos (si aplica)

Ninguno.

## Riesgos

Sin reescritura de historia, las credenciales expuestas siguen visibles en commits pasados del
repo aunque se remuevan del HEAD actual — se documenta esta limitación explícitamente para que el
usuario decida con esa información si además quiere rotar el anon key o reescribir el historial.
