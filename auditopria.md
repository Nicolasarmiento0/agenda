
Auditoría técnica exhaustiva — Nucora (Expo + Supabase)
Contexto
El usuario pidió una auditoría técnica exhaustiva de Nucora (app de agendamiento SaaS multi-tenant, roles client/company/admin/worker) cubriendo 6 pilares: Seguridad, Arquitectura, Frontend, Backend, Ciclo de vida/CI-CD y Cumplimiento/Privacidad, con el resultado en una tabla comparativa (Área | Punto Crítico | Riesgo | Acción de Mitigación).

El repo ya tiene un autodiagnóstico propio (auditoria_nucora.md, sin commitear) que marca como "Crítica" la revisión de RLS y la limpieza de secretos, y como pendiente la carpeta .scratch/. Esta auditoría confirma esos puntos con evidencia concreta de código y agrega hallazgos que el usuario no tenía identificados (escalación de rol, tablas sin RLS rastreado, falta de índices bajo el trigger de overlap, etc.).

Formato de entrega confirmado con el usuario: markdown en el chat (no Artifact), para que lo pueda pegar directo en su auditoria_nucora.md.

Metodología
Análisis estático de código (read-only), sin acceso a la consola/Advisors en vivo de Supabase:

3 subagentes Explore en paralelo: (1) seguridad/RLS/auth, (2) arquitectura/schema/ backend, (3) frontend performance/CI-CD.
Verificación manual de los hallazgos más críticos: auditoria_nucora.md, .gitignore, lib/supabase.ts, app/(auth)/role-select.tsx, package.json, y git ls-files sobre .scratch/.
Nota de transparencia: los 3 subagentes Explore reportaron ver bloques <system-reminder> inyectados en la salida de sus herramientas (Bash/lectura de archivos) simulando avisos de "plan mode" y "TodoWrite". No provienen del usuario ni del repo — es contenido que se coló en la salida de las herramientas del subagente (no encontraron ningún archivo del proyecto que los contuviera). Los subagentes los ignoraron correctamente (no tienen herramientas de escritura) y esto no afectó los hallazgos. Lo menciono al usuario por transparencia, no requiere acción.

Limitación importante: no pude confirmar en vivo si RLS está realmente habilitado en las tablas profiles, businesses, workers, business_services, service_categories, reviews — el repo no tiene esas políticas versionadas, pero podrían existir aplicadas manualmente en Supabase Studio y no estar en el código. Voy a recomendarle correr get_advisors (Supabase MCP) para confirmarlo en vivo como parte de la entrega.

Entrega (contenido final a presentar en el chat)
Resumen ejecutivo — Top 4 críticos
Escalación de privilegios vía profiles.role — cualquier usuario autenticado puede auto-asignarse role: 'admin' con una llamada directa a la API.
Esquema base no versionado — no hay ni un CREATE TABLE en el repo; todo se creó a mano en Supabase Studio, sin migraciones reproducibles.
31 archivos con credenciales de prueba y URL de Supabase commiteados en .scratch/ por un mismatch de .gitignore (scratch/ vs .scratch/).
Trigger de overlap de citas sin índices de soporte — cuello de botella de escalabilidad concreto y ya activo en cada escritura de appointments.
Tabla comparativa completa


1. Seguridad

Punto Crítico	Riesgo	Acción de Mitigación
Cliente puede actualizar su propio profiles.role sin restricción server-side (role-select.tsx:33,57) — no hay CHECK constraint ni política que impida pasar a admin	Crítico	Mover el cambio de rol a una Edge Function/RPC SECURITY DEFINER que valide explícitamente las transiciones permitidas; agregar CHECK constraint en la columna y una policy WITH CHECK que excluya role de updates directos del usuario
profiles, businesses, workers, business_services, service_categories, reviews no tienen RLS versionado en el repo, pero sí un grant amplio a authenticated (grant_public_schema_access.sql)	Alto (a confirmar en vivo)	Correr get_advisors de Supabase para confirmar estado real; habilitar RLS explícito y versionarlo como migraciones estándar en las 6 tablas
31 archivos en .scratch/ (URL + anon key de Supabase, contraseñas de prueba) están commiteados en git — .gitignore excluye scratch/ pero la carpeta real es .scratch/	Medio-Alto	Corregir .gitignore a .scratch/, git rm -r --cached .scratch, evaluar reescritura de historia si hay dudas de compromiso
Sesión (incluye refresh token) persiste sin cifrar en AsyncStorage/localStorage (lib/supabase.ts:17), sin expo-secure-store	Medio	Usar expo-secure-store como storage adapter de supabase-js en nativo (Keychain/Keystore)
No se puede confirmar desde el código si RLS está realmente activo en producción para las tablas del punto 2	Medio (incertidumbre)	Ejecutar auditoría con Advisors antes de operar con usuarios reales multi-tenant
Logging revisado: no se encontraron tokens/contraseñas/objetos de sesión completos en console.log de producción	Bajo	Mantener como regla de code review a futuro (no loguear session/user completos)
2. Arquitectura

Punto Crítico	Riesgo	Acción de Mitigación
Esquema base (profiles, businesses, workers, appointments, etc.) no tiene ni un CREATE TABLE versionado — se creó a mano en Studio; solo hay 6 migraciones recientes de RLS en supabase/.migrations/ (carpeta oculta, no estándar) y 14 scripts sueltos en scripts/	Alto	Adoptar Supabase CLI estándar (supabase/migrations/ sin punto), generar un baseline con db pull/db diff desde el estado real, y versionar todo cambio futuro ahí
No existe capa de servicios/repositorio — las queries y transformaciones viven inline en pantallas de 600-800 líneas	Medio	Extraer un módulo por entidad (appointments, businesses, profiles) en hooks/ o services/; las pantallas solo consumen el hook
Estado "negocio actual" duplicado entre AuthContext.business y BusinessContext.selectedBusiness, sincronizados a mano; fetchProfile/refreshProfile con ~70 líneas casi duplicadas	Medio	Consolidar en una única fuente de verdad; extraer la resolución de rol a un helper compartido
~30 pantallas hacen fetch-on-mount independiente sin cache/dedup/invalidación (no hay React Query/SWR)	Medio	Adoptar TanStack Query de forma incremental — encaja bien con Supabase y no requiere Zustand/Redux
Pantallas duplicadas por rol (company-employees.tsx/admin-business-employees.tsx, company-history.tsx/worker-history.tsx)	Bajo-Medio	Unificar en un componente compartido parametrizado por rol/scope

3. Frontend (React Native/Expo)

Punto Crítico	Riesgo	Acción de Mitigación
Cero uso de React.memo en toda la app; filas de listas (admin-users, admin-businesses, WorkerAvatar, WorkersBar) usan renderItem inline y cada una renderiza un BlurView de expo-blur sin memoizar	Medio-Alto	Envolver componentes de fila en React.memo, extraer renderItem con useCallback, memoizar el BlurView interno de GlassCard
Listas activas sin virtualizar: my-appointments.tsx (pantalla core del cliente), explore.tsx, worker-dashboard.tsx, inbox.tsx, company-employees.tsx, company-services.tsx usan ScrollView + .map()	Alto (escala con datos)	Migrar a FlatList/FlashList, priorizando my-appointments.tsx
Manejo de imágenes mezclado: expo-image (4 archivos) vs Image de RN (~19 usos) sin cachePolicy/placeholder; avatares en listas sin cache de disco	Medio	Estandarizar en expo-image con cachePolicy="memory-disk" y placeholder (blurhash), empezando por avatares repetidos
Sin ningún ErrorBoundary; catches vacíos (company-business.tsx:200, Sidebar.tsx:95) y my-appointments.tsx.fetchAppointments sin try/catch (deja loading colgado ante un error de red)	Medio-Alto	Agregar ErrorBoundary global en app/_layout.tsx con fallback UI; normalizar try/catch/finally en fetches
Formularios de agendamiento/servicios sin validación explícita antes de enviar a Supabase (coincide con lo que el usuario ya identificó en su propia auditoría)	Medio	Agregar validación de esquema en cliente (ej. Zod) reutilizable entre formularios

4. Backend (Supabase)

Punto Crítico	Riesgo	Acción de Mitigación
Trigger trg_check_appointment_overlap bloquea y escanea appointments por worker_id+fecha en cada escritura, sin ningún índice de soporte rastreado; tampoco hay índices sobre business_id, status, ni sobre workers.business_id/businesses.owner_id (usados en casi todas las RLS policies)	Alto	Agregar índices compuestos (worker_id, date), (business_id, date), e índices simples sobre las columnas usadas en policies RLS
Única Edge Function del repo (send-appointment-email/) está completamente vacía — toda la lógica sensible vive en el cliente	Medio	Implementar Edge Functions para operaciones que requieran service_role o no deban confiarse al cliente (emails, cambios de rol — ver punto de Seguridad #1)
No hay trigger de auto-creación de profiles al signup — se hace desde el cliente, con riesgo de quedar desincronizado si la app se cierra a mitad de flujo	Medio	Mover a un trigger SECURITY DEFINER estilo handle_new_user() sobre auth.users, patrón estándar de Supabase
select('*') extendido en tablas anchas (profiles, businesses, appointments)	Bajo-Medio	Seleccionar explícitamente columnas necesarias por vista, para evitar over-fetching y exposición accidental si se agregan columnas sensibles a futuro
appointments.client_id no tiene FK nombrada equivalente a businesses.owner_id, forzando un round-trip extra para traer nicknames de cliente (dashboard admin)	Bajo	Agregar la FK explícita para poder usar embeds y eliminar el round-trip

5. Ciclo de Vida y CI/CD

Punto Crítico	Riesgo	Acción de Mitigación
No existe eas.json — builds nativos 100% manuales vía expo run:android/ios	Medio	Configurar perfiles development/preview/production en EAS Build (tier gratuito cubre uso bajo)
Solo .env/.env.example, sin separación staging/producción; expo-constants está instalado pero no se usa en ningún lado	Medio	Crear proyecto Supabase de staging separado; usar env por perfil en eas.json o EAS Secrets
Sin expo-updates ni runtimeVersion configurado — cualquier fix requiere nueva build y resubida a stores	Bajo-Medio	Agregar expo-updates + política de runtimeVersion para poder pushear cambios JS/assets sin pasar por review de tienda
Sin .github/workflows ni framework de testing — ningún gate automático antes de mergear a main	Medio	Workflow mínimo de GitHub Actions con expo lint + tsc --noEmit por PR; sumar tests unitarios progresivamente en lógica crítica (overlap de citas)

6. Cumplimiento y Privacidad

Punto Crítico	Riesgo	Acción de Mitigación
No se encontró política de privacidad ni gestión de consentimiento; existe una tabla medical_records (a confirmar si contiene datos de salud reales)	Alto (si aplica)	Si medical_records guarda datos de salud reales, tratarla como categoría especial: acceso mínimo estricto (validar que su RLS sea solo owner+admin) y publicar política de privacidad
No hay flujo de borrado de cuenta ni exportación de datos personales	Medio	Implementar RPC de borrado/anonimización en cascada y exportación de datos a pedido del usuario
OAuth de Google se maneja parseando tokens manualmente de la URL de redirect (AuthContext.tsx)	Bajo-Medio	Confirmar validación de state/nonce contra CSRF; evitar loguear la URL completa de redirect (puede contener el access_token)
Estructura interna y credenciales de prueba expuestas vía .scratch/ commiteado (mismo hallazgo que Seguridad #3)	Medio	Mismo fix — limpiar .scratch/ del historial
Próximo paso (no requiere aprobación ahora)
Al salir de plan mode, voy a pegar esta tabla en el chat tal cual. Después puedo, si el usuario quiere, (a) correr get_advisors de Supabase para confirmar en vivo el estado de RLS, o (b) armar un plan de remediación priorizado (empezando por los 4 críticos) — pero no voy a tocar código todavía, solo lo ofrezco como seguimiento.