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
- **Perfil de negocio:** Catálogo de servicios, precios, duración, personal y valoraciones ([client-business-profile.tsx](app/(client)/client-business-profile.tsx)).
- **Reserva inteligente:** Agendamiento dinámico con selección de profesional, fecha y hora disponible en tiempo real con protección contra solapamientos.
- **Mis citas:** Gestión de citas activas, cancelaciones e historial ([my-appointments.tsx](app/(client)/my-appointments.tsx)).

### Empresa (`company`)
- **Onboarding guiado:** Configuración inicial del comercio: logo, descripción, ubicación GPS y redes sociales ([business-setup.tsx](app/(company)/business-setup.tsx)).
- **Dashboard gerencial:** Ingresos del mes en tiempo real, próximas citas y métricas clave ([dashboard-company.tsx](app/(company)/dashboard-company.tsx)).
- **Agenda multi-trabajador:** Vista unificada de calendario (diario/semanal) con control de estado de cada turno ([calendar.tsx](app/(shared)/calendar.tsx)).
- **CRM e historial financiero:** Ingresos históricos por rango temporal y filtros por empleado ([company-history.tsx](app/(company)/company-history.tsx)).
- **Gestión de personal y catálogos:** Empleados ([company-employees.tsx](app/(company)/company-employees.tsx)) y servicios ([company-services.tsx](app/(company)/company-services.tsx)).

### Trabajador (`worker`)
- **Dashboard personal:** Agenda diaria individual con indicadores y valoraciones ([worker-dashboard.tsx](app/(worker)/worker-dashboard.tsx)).
- **Historial de comisiones:** Servicios completados e ingresos acumulados con navegación por periodos ([worker-history.tsx](app/(worker)/worker-history.tsx)).

### Administrador (`admin`)
- **Supervisión global:** Métricas de crecimiento, negocios activos y volumen de transacciones ([admin-dashboard.tsx](app/(admin)/admin-dashboard.tsx)).
- **Auditoría y moderación:** Flujo de aprobación de comercios, detalle de negocio y revisión de empleados ([admin-businesses.tsx](app/(admin)/admin-businesses.tsx)).

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

---

## Características Principales

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

---

## Sistema de Diseño

Nucora usa un sistema visual dark-first inspirado en Tesla y Liquid Glass:

- **Fondo principal:** `#0B0E14` (Negro Obsidian) — maximiza contraste en pantallas OLED.
- **Acento primario:** `#E31937` (Rojo Nucora) — botones de acción y selecciones críticas.
- **Textos:** `#F9FAFB` (primario) / `#9CA3AF` (secundario).
- **Glassmorphism:** Componentes semi-transparentes con gradientes y bordes finos con canales alfa.
- **Temas:** Light/Dark Mode mediante [ThemeContext](context/ThemeContext.tsx).

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

---

## Estructura del Proyecto

```
nucora/
├── app/                        # Rutas de navegación (Expo Router)
│   ├── _layout.tsx             # Root layout y providers
│   ├── index.tsx               # Enrutador basado en rol de usuario
│   ├── (auth)/                 # Login, registro, recuperación de contraseña
│   ├── (client)/               # Dashboard, explorar y citas
│   ├── (company)/              # Dashboard, agenda, empleados, servicios y CRM
│   ├── (worker)/               # Dashboard personal e historial de comisiones
│   ├── (admin)/                # Supervisión global y moderación de negocios
│   └── (shared)/               # Calendario, perfil, inbox, privacidad, soporte
├── components/                 # Componentes UI reutilizables
│   ├── ui/                     # Primitivas básicas
│   ├── calendar/               # Calendario, grid de turnos, formularios
│   ├── client/                 # Modales y tarjetas del flujo de cliente
│   └── company/                # Formularios y gráficos financieros
├── context/                    # Estado global (Auth, Alertas, Tema)
├── styles/                     # Tokens visuales y hojas de estilo
├── lib/                        # Cliente Supabase e integraciones
├── hooks/                      # Custom hooks de React
├── utils/                      # Formateadores de fecha, validadores y helpers
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

---

## Roadmap Post-MVP

- Notificaciones Push (recordatorios automáticos via Expo Notifications).
- Skeleton loaders en calendarios y listas de carga.
- Micro-interacciones hápticas con `expo-haptics`.
- Swipe-to-action en tarjetas de cita (completar / no asistió).
- Deploy a App Store y Google Play via EAS Build.

---

## Documentación Adicional

- [Estado del Proyecto](./estado_proyecto.md) — Progreso del MVP y funcionalidades completadas.

---

Desarrollado por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0).
