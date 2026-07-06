# Nucora — Plataforma de Agendamiento y CRM para PyMEs

> **MVP completado y operativo.**
> Plataforma SaaS multi-tenant de agendamiento, historial de ingresos y CRM diseñada para barberías, salones, consultorios y centros de servicio.

**Stack:** React Native · Expo SDK 55 · Expo Router · Supabase (PostgreSQL + RLS) · TypeScript

---

## Visión General

Nucora automatiza la gestión de turnos eliminando la fricción de la coordinación manual. Opera bajo un esquema **Multi-Tenant** con aislamiento completo de datos mediante políticas RLS en Supabase. Cuatro roles especializados cubren todo el flujo operativo.

---

## Roles y Funcionalidades

### Cliente (`client`)
- **Exploración:** Buscador para descubrir negocios en la plataforma ([explore.tsx](app/(client)/explore.tsx)).
- **Perfil de negocio:** Catálogo de servicios, precios, duración, personal, galería de fotos y valoraciones ([client-business-profile.tsx](app/(client)/client-business-profile.tsx)).
- **Reserva inteligente:** Agendamiento dinámico con selección de profesional, fecha y hora disponible en tiempo real con protección contra solapamientos a nivel de trigger en base de datos.
- **Mis citas:** Gestión de citas activas, cancelaciones e historial ([my-appointments.tsx](app/(client)/my-appointments.tsx)).
- **Reagendamiento con límite único:** Los clientes pueden reagendar una cita una sola vez; el sistema bloquea intentos adicionales mediante el campo `reschedule_count`.
- **Acceso directo al calendario:** Al tocar una cita en el dashboard, navega directo al calendario con la fecha y la cita enfocada.
- **Historial de actividades por cita:** Cada cita expone una línea de tiempo con los cambios de estado (`pending → confirmed → completed / cancelled / rescheduled`) generada automáticamente por un trigger en Supabase.

### Empresa (`company`)
- **Onboarding guiado:** Configuración inicial del comercio: logo, descripción, ubicación GPS y redes sociales ([business-setup.tsx](app/(company)/business-setup.tsx)).
- **Dashboard gerencial:** Ingresos del mes en tiempo real, próximas citas y métricas clave ([dashboard-company.tsx](app/(company)/dashboard-company.tsx)).
- **Agenda multi-trabajador:** Vista unificada de calendario (diario/semanal) con control de estado de cada turno ([calendar.tsx](app/(shared)/calendar.tsx)).
- **CRM e historial financiero:** Ingresos históricos por rango temporal y filtros por empleado ([company-history.tsx](app/(company)/company-history.tsx)).
- **Gestión de personal y catálogos:** Empleados ([company-employees.tsx](app/(company)/company-employees.tsx)) y servicios ([company-services.tsx](app/(company)/company-services.tsx)).
- **Galería de portfolio:** Las empresas pueden subir hasta 5 fotos de su trabajo visibles en el perfil público ([company-business.tsx](app/(company)/company-business.tsx)).
- **Link público de reservas:** Cada negocio obtiene una URL pública única (`nucoraapp.vercel.app/{slug}`) compartible en redes sociales o WhatsApp, con flujo de booking sin necesidad de app.

### Trabajador (`worker`)
- **Dashboard personal:** Agenda diaria individual con indicadores y valoraciones ([worker-dashboard.tsx](app/(worker)/worker-dashboard.tsx)).
- **Historial de comisiones:** Servicios completados e ingresos acumulados con navegación por periodos ([worker-history.tsx](app/(worker)/worker-history.tsx)).

### Administrador (`admin`)
- **Supervisión global:** Métricas de crecimiento, negocios activos y volumen de transacciones ([admin-dashboard.tsx](app/(admin)/admin-dashboard.tsx)).
- **Auditoría y moderación:** Flujo de aprobación de comercios, detalle de negocio con dashboard de citas integrado y revisión de empleados (solo lectura) ([admin-businesses.tsx](app/(admin)/admin-businesses.tsx)).

---

## Pantallas Compartidas (`shared`)

Disponibles para todos los roles autenticados:

| Ruta | Descripción |
|------|-------------|
| [calendar.tsx](app/(shared)/calendar.tsx) | Calendario unificado de citas |
| [profile.tsx](app/(shared)/profile.tsx) | Perfil de usuario y configuración de cuenta |
| [inbox.tsx](app/(shared)/inbox.tsx) | Bandeja de notificaciones |
| [privacy.tsx](app/(shared)/privacy.tsx) | Configuración de privacidad y eliminación de cuenta |
| [privacy-policy.tsx](app/(shared)/privacy-policy.tsx) | Política de privacidad |
| [terms.tsx](app/(shared)/terms.tsx) | Términos y condiciones |
| [support.tsx](app/(shared)/support.tsx) | Centro de soporte |

## Páginas Públicas (sin autenticación)

| Ruta | Descripción |
|------|-------------|
| [[slug].tsx](app/[slug].tsx) | Landing pública de negocio: perfil, galería, servicios y botón de reserva. Accesible via `/{slug}` sin login. |

---

## Características Principales

### Link Público de Reservas
- Cada negocio recibe un slug único auto-generado desde su nombre (función `slugify()` en Supabase).
- La URL `nucoraapp.vercel.app/{slug}` es pública, compartible y no requiere login.
- Si el visitante no tiene cuenta, se guarda la intención de reserva en `AsyncStorage` y se redirige al registro con rol `client` pre-asignado; al completar el signup la reserva pendiente continúa automáticamente.
- La page muestra logo, descripción, horarios, galería de fotos, servicios, equipo y valoraciones con animaciones de entrada.

### Galería de Portfolio
- Las empresas pueden cargar hasta 5 fotos de su trabajo desde la pantalla de configuración del negocio.
- Las fotos se almacenan en Supabase Storage y aparecen en el perfil público y en el perfil de negocio visible para clientes.
- En la landing pública incluye un lightbox con navegación entre imágenes.
- Subida cross-platform: en web usa blob URL + XMLHttpRequest con fallback a base64 ([webUploadHelper.ts](utils/webUploadHelper.ts)); en móvil usa el flujo nativo de `expo-image-picker`.

### Prevención de Doble Reserva con Row-Level Locking
- Un trigger a nivel de base de datos (`trg_prevent_appointment_overlap`) bloquea con `SELECT ... FOR UPDATE` los registros en conflicto antes de insertar o actualizar.
- Impide que dos citas simultáneas ocupen el mismo trabajador y horario, incluso bajo peticiones concurrentes.
- La lógica de solapamiento vive en Postgres, no en el cliente, garantizando integridad independientemente del frontend.

### Historial de Actividades por Cita
- Tabla `appointment_activities` con trigger `trg_appointment_activity_log` que registra automáticamente cada transición de estado.
- La línea de tiempo muestra: solicitud enviada → confirmación del profesional → completada / cancelada / reagendada.
- Las actividades de citas pre-existentes se retroalimentan con un script SQL de setup ([setup_appointment_activities.sql](scripts/setup_appointment_activities.sql)).
- La función trigger usa `SECURITY DEFINER` con `REVOKE EXECUTE FROM PUBLIC` para evitar invocaciones directas vía RPC.

### Sistema de Toasts con Feedback Háptico
- `ToastProvider` ([context/ToastContext.tsx](context/ToastContext.tsx)) expone `showToast({ type, message, duration })` globalmente.
- Cada categoría dispara feedback háptico diferenciado: `success` → `NotificationFeedbackType.Success`, `error` → `Error`, `warning` → `Warning`, `info` → `ImpactFeedbackStyle.Light`.
- Los toasts reemplazan a los `Alert.alert()` nativos para una UX más fluida y no bloqueante.

### Skeleton Loaders Adaptativos
- Componente `Skeleton` ([components/ui/Skeleton.tsx](components/ui/Skeleton.tsx)) con animación de pulso (opacidad 0.3 → 1 en loop).
- Se adapta al modo oscuro/claro: `rgba(255,255,255,0.08)` en dark, `rgba(0,0,0,0.06)` en light.
- Sustituye pantallas en blanco durante la carga inicial en calendarios, listas y dashboards.

### Persistencia del Tema con AsyncStorage
- El modo oscuro/claro se persiste entre sesiones mediante `AsyncStorage`.
- Al relanzar la app, el tema se restaura antes del primer render evitando el flash de tema incorrecto.

### Reagendamiento con Límite Único
- Los clientes pueden reagendar una cita activa (`confirmed` / `rescheduled`) una sola vez.
- La columna `reschedule_count` en `appointments` lleva el conteo; al llegar a 1 el botón de reagendamiento desaparece.
- El estado de la cita pasa a `rescheduled` y queda visible en el historial con badge diferenciado.

### Módulo CRM de Ingresos
- Suma acumulada basada exclusivamente en citas con estado `'completed'`.
- Filtros por rango cerrado: diario (`.eq`), semanal y mensual (`.gte` / `.lte`).
- Filtros cruzados por periodo + empleado para reportes de productividad.

### Navegador Temporal por Periodos
- Contenedor glassmorphic con botones para avanzar/retroceder infinitamente (días, semanas, meses).
- Labels en español: *"Lunes, 25 de Mayo 2026"*, *"18 - 24 de Mayo 2026"*, *"Mayo 2026"*.

### Bloqueo de Horarios con Rango Flexible
- Selectores `TimeWheelPicker` independientes para hora de inicio y término.
- Validación de consistencia temporal: la hora de fin debe ser posterior a la de inicio.
- Auto-ajuste: si "Desde" supera "Hasta", el sistema adelanta "Hasta" 1 hora.

### Consistencia de Zona Horaria
- Formato local puro `YYYY-MM-DD` en todos los filtros y calendarios.
- Elimina desfases UTC/ISO en dispositivos de América del Sur/Norte.

### Hardenización de RLS
- Vista segura `available_slots_secure` para consultar disponibilidad sin exponer datos de otras empresas.
- Políticas RLS endurecidas en `appointments` asegurando que clientes, trabajadores y empresas solo accedan a sus propios registros.

---

## Sistema de Diseño

Nucora usa un sistema visual dark-first inspirado en Tesla y Liquid Glass:

- **Fondo principal:** `#0B0E14` (Negro Obsidian) — maximiza contraste en pantallas OLED.
- **Acento primario:** `#E31937` (Rojo Nucora) — botones de acción y selecciones críticas.
- **Textos:** `#F9FAFB` (primario) / `#9CA3AF` (secundario).
- **Glassmorphism:** Componentes semi-transparentes con gradientes y bordes finos con canales alfa.
- **Temas:** Light/Dark Mode persistido con AsyncStorage mediante [ThemeContext](context/ThemeContext.tsx).

### Componentes UI Reutilizables

| Componente | Descripción |
|------------|-------------|
| [GlassCard.tsx](components/GlassCard.tsx) | Tarjetas con efecto vidriado |
| [GlassInput.tsx](components/GlassInput.tsx) | Entradas de datos estilizadas |
| [GlassModal.tsx](components/GlassModal.tsx) | Modales flotantes de confirmación |
| [ScreenHeader.tsx](components/ScreenHeader.tsx) | Encabezado global dinámico |
| [TimeWheelPicker.tsx](components/TimeWheelPicker.tsx) | Selector de horario tipo rueda |
| [TeslaAlert.tsx](components/TeslaAlert.tsx) | Alertas de sistema estilo Tesla |
| [Sidebar.tsx](components/Sidebar.tsx) | Navegación lateral |
| [StatusBadge.tsx](components/StatusBadge.tsx) | Badges de estado de citas |
| [Skeleton.tsx](components/ui/Skeleton.tsx) | Placeholder animado de carga |

---

## Estructura del Proyecto

```
nucora/
├── app/                        # Rutas de navegación (Expo Router)
│   ├── _layout.tsx             # Root layout y providers
│   ├── index.tsx               # Enrutador basado en rol de usuario
│   ├── [slug].tsx              # Landing pública de negocio (sin auth)
│   ├── (auth)/                 # Login, registro, recuperación de contraseña
│   ├── (client)/               # Dashboard, explorar y citas
│   ├── (company)/              # Dashboard, agenda, empleados, servicios y CRM
│   ├── (worker)/               # Dashboard personal e historial de comisiones
│   ├── (admin)/                # Supervisión global y moderación de negocios
│   └── (shared)/               # Calendario, perfil, inbox, privacidad, soporte
├── components/                 # Componentes UI reutilizables
│   ├── ui/                     # Primitivas básicas (Skeleton, etc.)
│   ├── calendar/               # Calendario, grid de turnos, formularios
│   ├── client/                 # Modales y tarjetas del flujo de cliente
│   └── company/                # Formularios y gráficos financieros
├── context/                    # Estado global (Auth, Alertas, Tema, Toast)
├── styles/                     # Tokens visuales y hojas de estilo
├── lib/                        # Cliente Supabase e integraciones
├── hooks/                      # Custom hooks de React
├── utils/                      # Formateadores de fecha, validadores y helpers
│   └── webUploadHelper.ts      # Upload cross-platform: blob URL + base64 fallback
├── scripts/                    # Scripts SQL de configuración y setup
│   └── setup_appointment_activities.sql
├── supabase/migrations/        # Migraciones SQL versionadas
└── assets/                     # Imágenes, fuentes e iconos
```

---

## Instalación y Desarrollo

### Requisitos
- Node.js 22 LTS (via nvm)
- Expo CLI (`npm install -g expo-cli`)
- Proyecto en [Supabase](https://supabase.com) con el schema configurado

### Setup

```bash
git clone https://github.com/Nicolasarmiento0/nucora.git
cd nucora
npm install
```

Crea un archivo `.env` en la raíz:

```env
EXPO_PUBLIC_SUPABASE_URL=tu_proyecto_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_proyecto_supabase_anon_key
```

Inicia el servidor de desarrollo:

```bash
npx expo start
```

Presiona `a` para Android, `i` para iOS, o `w` para web.

### Scripts locales de desarrollo (`.scratch/`)

La carpeta `.scratch/` es para scripts throwaway de prueba/debug y está excluida de git
(`.gitignore`). **Nunca commitees su contenido**: estos scripts suelen tener credenciales
hardcodeadas. Cualquier script que valga la pena versionar debe moverse a una carpeta
trackeada y leer sus credenciales desde variables de entorno, nunca hardcodeadas.

---

## Mejoras Potenciales

1. **Notificaciones push con segmentación por rol** — Enviar recordatorios automáticos al cliente 24h y 1h antes de su cita, y alertas al trabajador cuando llega una nueva reserva o cancelación. Reduciría los no-shows sin intervención manual.

2. **Sistema de reseñas post-servicio con NucoraPoints** — Habilitar valoraciones (1-5 estrellas + comentario) desbloqueables solo cuando la cita pasa a `completed`. Acumular puntos canjeables por descuentos genera retención sin costo de adquisición.

3. **Panel de analytics para la empresa** — Gráficas de ocupación por trabajador, servicios más demandados y horas pico de reservas. Permite a los dueños tomar decisiones de staffing y pricing basadas en datos reales de su propio negocio.

4. **Modo offline con sincronización diferida** — Cache local de la agenda del trabajador para que pueda consultar y marcar citas sin conexión (frecuente en barberías con Wi-Fi inestable). Al reconectarse, sincroniza los cambios con Supabase automáticamente.

5. **Widget de reserva embebible** — Iframe o snippet JavaScript que cualquier negocio pueda incrustar en su sitio web o bio de Instagram, redirigiendo al flujo de booking existente (`/{slug}`) sin desarrollo adicional por parte del dueño.

---


Desarrollado por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0).
