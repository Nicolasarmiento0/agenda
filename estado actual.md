# Estado Actual de la App — Actualizado 2026-05-18

## ✅ Funcionalidades Core Completadas

### 1. Lógicas de Agendamiento Avanzadas
- **Restricción primera hora:** No se puede agendar el primer bloque del día sin 22:00 del día anterior.
- **Margen 1 hora:** Mínimo 1 hora de anticipación para reservas del mismo día.
- **Lógica Gimnasio/Fitness:** Detección automática por `category_id`; requiere 48h de anticipación.

### 2. Gestión de Bloqueos (Company)
- Usuarios `company` pueden crear bloques de inactividad ("Colación", "Descanso") desde su agenda.
- Bloques visibles en gris para empresa; clientes ven solo el motivo sin poder interactuar.

### 3. UI/UX: Perfiles y Accesibilidad
- Perfil del negocio (vista cliente): logo centrado + info esencial.
- Botón Google Maps dinámico usando `maps_url` del dueño.
- Pantalla `/screens/privacy.tsx` para GDPR y control de acceso.

### 4. Gestión de Cuentas y Seguridad
- Reset de contraseña vía GoTrue (Supabase Free).
- Eliminación de cuenta GDPR mediante función Postgres `delete_user`.

### 5. Navegación y Auth
- Expo Router (file-based), rutas protegidas por rol: `client`, `company`, `admin`.
- Sidebar con `expo-blur` (Liquid Glass base) ya implementado.
- Sidebar dinámico por rol con animación slide + fade.

---

## 🎨 Diagnóstico de Diseño (Auditoría Tesla + Liquid Glass)

### Puntos Fuertes ✅
| Elemento | Estado |
|----------|--------|
| Sidebar | BlurView implementado, animación fluida |
| Dark theme | `#0A0A0A` fondo + `#141414` surface — correcto |
| Tipografía | Uppercase + letterSpacing consistente |
| Calendario agenda | Grid hora/trabajador funcional con línea "ahora" |
| Bottom sheet | PanResponder + spring animation — premium |
| FAB | Sombra + posición correcta |
| Status badges | Colores semánticos por estado de cita |

### Problemas de Diseño Detectados ⚠️

#### CRÍTICO — Impactan la percepción del MVP
1. **Home Screen placeholder:** Texto "(App en desarrollo)" visible; botón centrado con ancho fijo no comunica identidad de marca.
2. **Dashboard Company placeholder:** Muestra "YA ESTÁS DENTRO!" y dos cards con "ROL: Empresa" / "ESTADO: Autenticado" — contenido de desarrollo, inútil para usuarios reales.
3. **Inconsistencia en `appStyles.ts`:** El objeto estático tiene `alignSelf: 'center'` y `borderRadius: 8` en `primaryButton`; el hook dinámico `useAppStyles()` tiene `alignSelf: 'stretch'` y `borderRadius: 4`. Comportamiento diferente según qué pantalla usa cuál.

#### IMPORTANTE — Fricción visual
4. **Border radius demasiado pequeño:** Inputs con `borderRadius: 4` y botones secundarios con `borderRadius: 4` — rompe la estética premium (regla: inputs ≥ 12px, botones ≥ 16px).
5. **Header del Dashboard Company:** Usa el emoji `≡` como hamburger en lugar de ícono `Feather`, inconsistente con el resto de la app.
6. **Input en Login:** `alignSelf: 'stretch'` pero en `home.tsx` el botón usa la versión estática con `alignSelf: 'center'` — desalineado visualmente.

#### MENOR — Detalles de pulido
7. **Home screen sin identidad:** Solo texto AGENDA + Bienvenidos. Necesita un ícono/logo y una descripción breve del valor.
8. **Sidebar — RESERVAR duplica EXPLORAR:** Ambos apuntan a `/screens/global/explore`, uno de los dos sobra o debe apuntar a `my-appointments`.

---

## 📋 Cambios Sugeridos para Terminar el MVP

### 🔴 Prioridad Alta (antes de mostrar a usuarios)

#### 1. Home Screen (`app/screens/global/home.tsx`)
- Eliminar texto "(App en desarrollo)"
- Reemplazar con tagline breve: _"Reserva tu turno. Sin llamadas."_
- Botón primario full-width (usar `useAppStyles()` en lugar de `appStyles` estático)
- Añadir ícono de marca (logo SVG o icono Feather `calendar` grande) sobre el título

#### 2. Dashboard Company (`app/screens/roles/company/dashboard-company.tsx`)
- Eliminar cards "ROL" y "ESTADO" (info de dev)
- Reemplazar con 3 tarjetas de acción rápida estilo Liquid Glass:
  - 📅 **AGENDA** → `/screens/roles/company/company-agenda`
  - 🛠 **SERVICIOS** → `/screens/roles/company/company-services`
  - 📊 **HISTORIAL** → `/screens/roles/company/company-history`
- Mostrar el nombre del negocio del `profile` en el header

#### 3. Estandarizar `appStyles.ts`
- Unificar `primaryButton`: `alignSelf: 'stretch'`, `borderRadius: 16`, `paddingVertical: 16`
- Unificar `input`: `borderRadius: 12`
- Unificar `secondaryButton`: `borderRadius: 16`
- Eliminar `primaryButton2` redundante o dejarlo solo para casos de botón centrado aislado

### 🟡 Prioridad Media (pulido visual)

#### 4. Sidebar — Corregir ítem duplicado
- Cambiar "RESERVAR" para que apunte a `/screens/global/my-appointments` o eliminarlo si ya está "MIS CITAS"

#### 5. Dashboard Company Header
- Reemplazar `≡` por `<Feather name="menu" />` para consistencia

#### 6. Explore Screen
- Verificar que el estado vacío (sin negocios) muestra un empty state visual, no una pantalla en blanco

### 🟢 Prioridad Baja (roadmap post-MVP)

| Feature | Impacto | Esfuerzo |
|---------|---------|----------|
| Notificaciones Push (Expo + Supabase triggers) | Alto | Medio |
| Pagos MercadoPago / Stripe (señas anti no-show) | Alto | Alto |
| Analytics Dashboard (react-native-chart-kit) | Medio | Medio |
| Lista de espera / cancelaciones dinámicas | Medio | Alto |

---

## 🏗️ Arquitectura Actual (snapshot)

```
app/
├── index.tsx              # Router de roles
├── _layout.tsx
└── screens/
    ├── global/            # Home, Login, Signup, Explore, Profile, Privacy
    └── roles/
        ├── client/        # client-agenda, client-business-profile
        ├── company/       # company-agenda, company-services, company-employees,
        │                  # company-history, company-business, dashboard-company
        └── admin/         # admin-dashboard, admin-businesses, admin-business-detail

components/
├── Sidebar.tsx            # BlurView Liquid Glass ✅
└── TeslaAlert.tsx         # Alert customizado

styles/
└── appStyles.ts           # Sistema de diseño (necesita estandarización)

context/
├── AuthContext.tsx
├── ThemeContext.tsx        # Dark/Light mode
├── BusinessContext.tsx
└── AlertContext.tsx
```

---

## 🔑 Supuestos del Sistema (Multi-Tenant)
- `tenant_id` ≡ `business_id` en tablas de citas/servicios/workers
- RLS activo en Supabase (validación por JWT, no en frontend)
- Un usuario `company` puede tener UN negocio activo
- Workers pertenecen a un negocio (`business_id` en tabla `workers`)
- Citas se crean con `client_id` + `worker_id` + `business_id`
