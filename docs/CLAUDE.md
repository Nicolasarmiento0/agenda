# CLAUDE.md — Instrucciones del Proyecto

## Rol Activo

Antes de cualquier tarea de desarrollo, lee y aplica el rol definido en
[.agent/skills/rules-agent.md](.agent/skills/rules-agent.md).

Ese archivo define:
- Filosofía de arquitectura (Bootstrap, $0, Multi-Tenant)
- Stack tecnológico (Expo + Supabase + Zustand + TanStack Query)
- Reglas de código limpio y formato de respuesta

---

## Routing de Skills

Usa la siguiente tabla para saber qué skill invocar según la tarea:

| Tipo de tarea | Slash command |
|---------------|--------------|
| Activar rol arquitecto / nueva feature / pantalla | `/rules-agent` |
| Diseño de BD, RLS, migraciones SQL | `/rules-agent` + `/supabase-postgres-best-practices` |
| Diseño UI/UX, estilos, temas, Liquid Glass | `/rules-agent` + `/frontend-design` |
| Componentes o pantallas nativas (Expo) | `/building-native-ui` |
| Composición y estructura de componentes React | `/composition-patterns` |
| Performance React, re-renders, bundle, SSR | `/react-best-practices` |
| Fetching, caché, offline, loaders | `/native-data-fetching` |
| TypeScript complejo, tipos avanzados | `/typescript-advanced-types` |
| API Routes en Expo | `/expo-api-routes` |
| Setup Tailwind / NativeWind | `/expo-tailwind-setup` |
| Deploy App Store / Play Store | `/expo-deployment` |
| Deploy a Vercel | `/deploy-to-vercel` |
| CI/CD y automatización EAS | `/expo-cicd-workflows` |
| Upgrade de Expo SDK | `/upgrading-expo` |
| Dev client / TestFlight | `/expo-dev-client` |
| Backend Node.js, REST, GraphQL | `/nodejs-backend-patterns` |
| Principios Node.js, arquitectura | `/nodejs-best-practices` |
| Scripts Bash para CI/CD | `/bash-defensive-patterns` |
| Accesibilidad WCAG | `/accessibility` |
| SEO y visibilidad en buscadores | `/seo` |
| DOM components / migración web→native | `/use-dom` |
| Diseño mobile de alto nivel | `/design-mobile-apps` |
| Ver si un cambio funciona en la app real | `/verify` |
| Levantar el servidor / ver la app corriendo | `/run` |
| Revisar un PR antes de mergear | `/review` |
| Auditoría de seguridad del branch actual | `/security-review` |
| Refactorizar y limpiar código recién cambiado | `/simplify` |
| Configurar hooks, permisos, settings.json | `/update-config` |
| Tarea repetitiva con intervalo | `/loop` |
| Agendar tarea futura o rutina cron | `/schedule` |
---

## Skills disponibles

### Skills del proyecto — `.claude/commands/`
Creadas a partir de `.agents/skills/`. Se invocan con `/` desde el chat:

| Comando | Para qué |
|---------|----------|
| `/rules-agent` | Rol de Arquitecto Senior Full-Stack — diseño Tesla + Liquid Glass, Multi-Tenant $0 |
| `/accessibility` | Auditoría y mejora de accesibilidad WCAG 2.2, a11y, screen readers, teclado |
| `/bash-defensive-patterns` | Bash robusto para producción: scripts CI/CD, fault tolerance, seguridad |
| `/building-native-ui` | Guía completa Expo Router: navegación, componentes, animaciones, tabs nativos |
| `/composition-patterns` | Patrones de composición React: compound components, variants, sin boolean props |
| `/deploy-to-vercel` | Deploy a Vercel: preview, producción, links en vivo |
| `/design-mobile-apps` | Diseño de pantallas y UI mobile de alta calidad |
| `/expo-api-routes` | API Routes en Expo Router con EAS Hosting |
| `/expo-cicd-workflows` | Workflows EAS YAML: pipelines CI/CD, builds automatizados, deployment |
| `/expo-deployment` | Deploy Expo a App Store, Play Store, web y API routes |
| `/expo-dev-client` | Build y distribución de Expo dev clients (local / TestFlight) |
| `/expo-tailwind-setup` | Setup Tailwind CSS v4 en Expo con NativeWind v5 |
| `/frontend-design` | Interfaces web production-grade: landing pages, dashboards, componentes React |
| `/native-data-fetching` | Fetching, React Query, SWR, caché, offline, Expo Router loaders |
| `/nodejs-backend-patterns` | Servidores Node.js con Express/Fastify: middleware, auth, DB, REST, GraphQL |
| `/nodejs-best-practices` | Principios Node.js: async patterns, seguridad, arquitectura, selección de framework |
| `/react-best-practices` | Performance React/Next.js: re-renders, bundle, SSR, caché, Suspense |
| `/seo` | SEO: meta tags, structured data, sitemap, visibilidad en buscadores |
| `/supabase-postgres-best-practices` | PostgreSQL con Supabase: índices, RLS, queries, schema, pooling |
| `/typescript-advanced-types` | TypeScript avanzado: generics, conditional types, mapped types, type-safety |
| `/upgrading-expo` | Upgrade de Expo SDK, React 19, nueva arquitectura, fix de dependencias |
| `/use-dom` | Expo DOM components: migración incremental de web a native con webview |

> Para agregar una nueva skill: crea `.agents/skills/mi-skill/SKILL.md` con las instrucciones
> y luego `.claude/commands/mi-skill.md` con el prompt que la activa.

### Skills built-in de Claude Code
Se invocan directamente desde el chat:

| Comando | Para qué |
|---------|----------|
| `/run` | Levantar el servidor / ver la app corriendo |
| `/verify` | Confirmar que un cambio funciona en la app real |
| `/review` | Revisar un PR antes de mergear |
| `/security-review` | Auditoría de seguridad del branch actual |
| `/simplify` | Refactorizar y limpiar código recién cambiado |
| `/update-config` | Configurar hooks, permisos, settings.json |
| `/loop` | Ejecutar un comando en bucle con intervalo |
| `/schedule` | Agendar tareas futuras o rutinas cron |

---

## Regla de Oro (recordatorio)

NUNCA implementar cambios masivos sin antes clarificar:
1. Objetivo exacto de la feature/pantalla
2. Tablas, componentes o lógica previa relacionada
3. Roles y políticas RLS afectadas
4. Edge cases y estados vacíos

Si la solicitud es ambigua → lista supuestos y pide confirmación.
