
# Auditoría y Optimización de Arquitectura: Proyecto Nucora

Este archivo MD detalla el plan de acción para auditar, limpiar y asegurar el proyecto **Nucora**. El objetivo principal es reducir la deuda técnica, mejorar la mantenibilidad y fortalecer la postura de seguridad, sin alterar la funcionalidad actual del MVP.

---

## Fase 1: Limpieza de Proyecto (Housekeeping)

**Objetivo:** Eliminar archivos innecesarios, dependencias no utilizadas y organizar la estructura de directorios.

- [ ] **Limpieza de archivos temporales y de desecho:**
    - Eliminar carpeta `.scratch`.
    - Verificar y eliminar archivos en `scripts/` o `docs/` que no sean necesarios para el funcionamiento actual o la documentación relevante.
- [ ] **Optimización de dependencias:**
    - Ejecutar `npm prune` para eliminar paquetes no referenciados.
    - Analizar `package.json` para identificar dependencias obsoletas o que puedan ser reemplazadas por utilidades nativas de Expo/React Native.
- [ ] **Normalización de configuración:**
    - Revisar `tsconfig.json` para asegurar que las rutas (`paths`) sean coherentes y no existan alias huérfanos.
    - Consolidar archivos de configuración (`babel.config.js`, `metro.config.js`) para asegurar que sigan las mejores prácticas de Expo SDK 55+.

---

## Fase 2: Auditoría de Seguridad y Puntos Críticos

**Objetivo:** Evaluar y fortalecer la seguridad de la aplicación, especialmente en la integración con Supabase.

- [ ] **Revisión de Políticas RLS (Row Level Security):**
    - Auditar todas las políticas de Supabase en la base de datos para asegurar que el aislamiento *multi-tenant* sea absoluto.
    - Verificar que ningún usuario pueda acceder a datos de otro *tenant* (negocio).
- [ ] **Gestión de Secretos:**
    - Asegurar que `.env` y `.env.example` no contengan claves API sensibles en el repositorio (validar con `git check-ignore -v .env`).
    - Implementar `expo-constants` para manejar variables de entorno de forma segura.
- [ ] **Validación de Entradas:**
    - Auditar los formularios de agendamiento y creación de servicios para prevenir inyecciones o datos malformados antes de enviarlos a Supabase.
- [ ] **Protección de rutas:**
    - Revisar que `Expo Router` esté aplicando correctamente los guardias de autenticación (`middleware`) en todas las rutas privadas (`app/(company)/`, `app/(client)/`).

---

## Fase 3: Mejora de Arquitectura

**Objetivo:** Refactorizar componentes críticos para mejorar el rendimiento y la escalabilidad.

- [ ] **Estandarización de componentes:**
    - Mover lógica de negocio de los archivos `app/*.tsx` hacia `hooks/` personalizados.
    - Asegurar que los estilos estén centralizados en `styles/` o mediante un sistema de diseño consistente, evitando estilos *inline* excesivos.
- [ ] **Mejora en la gestión de estado:**
    - Evaluar si el uso de `context/` es óptimo o si se requiere una librería de gestión de estado más robusta (como `Zustand`) para evitar re-renders innecesarios en el calendario.

---

## Plan de Ejecución (Tasks)

| Fase | Task | Prioridad |
| :--- | :--- | :--- |
| 1 | Eliminación de archivos temporales (`.scratch`) | Alta |
| 1 | Auditoría y actualización de `package.json` | Media |
| 2 | Verificación de políticas RLS en Supabase | Crítica |
| 2 | Limpieza de variables de entorno (Secretos) | Crítica |
| 3 | Refactorización de lógica de negocio a `hooks/` | Baja |

---

## Nota importante
*Ninguna funcionalidad debe verse afectada.* Tras cada paso de limpieza, ejecuta el conjunto de pruebas existente (o verifica manualmente las funciones críticas: agendar cita, login, dashboard) para asegurar la integridad del sistema.
