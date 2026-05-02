# 04 — Mapa de Pantallas y Flujos de Navegación

## Estado actual de pantallas

### ✅ Ya existen (mantener o modificar mínimamente)
| Pantalla | Archivo | Estado |
|---|---|---|
| Home (landing) | `screens/home.tsx` | ✅ OK |
| Login | `screens/loginscreen.tsx` | ✅ OK |
| Signup | `screens/signup.tsx` | ✅ OK |
| Forgot Password | `screens/forgotPassword.tsx` | ✅ OK |
| Email Confirmation | `screens/emailConfirmation.tsx` | ✅ OK |
| Reset Password | `screens/resetPassword.tsx` | ✅ OK |
| Role Select | `screens/role-select.tsx` | ✅ OK |
| Dashboard Client | `screens/dashboard.tsx` | 🔧 Modificar — reemplazar placeholder con accesos reales |
| Dashboard Company | `screens/dashboard-company.tsx` | 🔧 Modificar — reemplazar placeholder con datos reales |
| Profile | `screens/profile.tsx` | ✅ OK |

---

## Pantallas nuevas — MVP

### FLUJO CLIENTE (9 pantallas)

| # | Pantalla | Archivo | Descripción |
|---|---|---|---|
| C1 | Explorar negocios | `screens/explore.tsx` | Lista de empresas aprobadas, filtro por categoría |
| C2 | Detalle de empresa | `screens/business-detail.tsx` | Info del negocio, servicios disponibles, equipo |
| C3 | Seleccionar servicio | `screens/booking-service.tsx` | Lista de servicios del negocio con precio y duración |
| C4 | Seleccionar profesional | `screens/booking-professional.tsx` | Empleados activos que atienden ese servicio |
| C5 | Seleccionar fecha y hora | `screens/booking-datetime.tsx` | Calendario + slots disponibles del profesional elegido |
| C6 | Confirmar reserva | `screens/booking-confirm.tsx` | Resumen: servicio, profesional, fecha, hora, precio |
| C7 | Reserva exitosa | `screens/booking-success.tsx` | Confirmación visual, acceso directo a "Mis citas" |
| C8 | Mis citas | `screens/my-appointments.tsx` | Citas próximas e historial del cliente |
| C9 | Detalle de cita (cliente) | `screens/appointment-detail.tsx` | Detalle completo, opción de cancelar |

### FLUJO EMPRESA (8 pantallas)

| # | Pantalla | Archivo | Descripción |
|---|---|---|---|
| E1 | Onboarding empresa | `screens/business-setup.tsx` | Crear perfil del negocio. Al guardar queda `pending`. |
| E2 | En revisión | `screens/business-pending.tsx` | Pantalla bloqueante. Solo muestra mensaje de espera. Sin acciones. |
| E3 | Dashboard empresa | `screens/dashboard-company.tsx` | 🔧 Citas del día, accesos rápidos |
| E4 | Agenda empresa | `screens/company-calendar.tsx` | Vista semanal/diaria de todas las reservas |
| E5 | Detalle de cita (empresa) | `screens/company-appointment-detail.tsx` | Info del cliente, servicio, profesional. Marcar completada/cancelar. |
| E6 | Mis servicios | `screens/company-services.tsx` | Servicios del catálogo activados por la empresa |
| E7 | Configurar servicio | `screens/company-service-config.tsx` | Seleccionar del catálogo + asignar precio y duración propios |
| E8 | Mis empleados | `screens/company-employees.tsx` | Lista de empleados activos |
| E9 | Crear/editar empleado | `screens/company-employee-form.tsx` | Nombre, foto, bio, disponibilidad horaria por día de semana |
| E10 | Perfil del negocio | `screens/company-profile.tsx` | Editar info, logo, descripción, dirección |

### FLUJO ADMIN (3 pantallas)

| # | Pantalla | Archivo | Descripción |
|---|---|---|---|
| A1 | Dashboard admin | `screens/admin-dashboard.tsx` | Resumen: empresas pendientes, total aprobadas, total clientes |
| A2 | Gestión de empresas | `screens/admin-businesses.tsx` | Lista de todas las empresas con su estado. Filtro por status. |
| A3 | Detalle de empresa (admin) | `screens/admin-business-detail.tsx` | Ver info completa del negocio. Botones: Aprobar / Rechazar. |

---

## Total pantallas nuevas: 22
- 9 del flujo cliente
- 10 del flujo empresa
- 3 del flujo admin

---

## Flujos de navegación

### Flujo cliente — Agendar una cita

```
Dashboard cliente
    └── Explorar [C1]
            └── Detalle de empresa [C2]
                    └── Seleccionar servicio [C3]
                            └── Seleccionar profesional [C4]
                                    └── Fecha y hora [C5]
                                            └── Confirmar reserva [C6]
                                                    └── Reserva exitosa [C7]
                                                            └── → Mis citas [C8]
```

### Flujo cliente — Gestionar citas

```
Dashboard cliente o Sidebar → Mis citas [C8]
    └── Detalle de cita [C9]
            └── Cancelar → Confirmar → Actualiza lista [C8]
```

### Flujo empresa — Primera vez (onboarding)

```
role-select → asigna role = 'company'
    └── Onboarding [E1]  ← si no tiene business creado
            └── En revisión [E2]  ← pantalla bloqueante, sin acciones
                    └── (Admin aprueba desde la app)
                            └── Al refrescar → Dashboard empresa [E3]
```

### Flujo empresa — Operación diaria (aprobada)

```
Dashboard empresa [E3]
    ├── Ver agenda [E4] → Detalle de cita [E5]
    ├── Mis servicios [E6] → Configurar servicio [E7]
    ├── Mis empleados [E8] → Crear/editar empleado [E9]
    └── Perfil del negocio [E10]
```

### Flujo admin — Aprobar empresa

```
Dashboard admin [A1]
    └── Gestión de empresas [A2]  ← lista con filtro por status
            └── Detalle de empresa [A3]
                    ├── Aprobar → status = 'approved' → empresa puede operar
                    └── Rechazar → status = 'rejected' → empresa ve mensaje
```

---

## Lógica de redirección en `index.tsx`

```
sin sesión
    → /screens/home

sesión + role = 'admin'
    → /screens/admin-dashboard

sesión + role = 'client'
    → /screens/dashboard

sesión + role = 'company' + sin business creado
    → /screens/business-setup

sesión + role = 'company' + business.status = 'pending' | 'rejected'
    → /screens/business-pending

sesión + role = 'company' + business.status = 'approved'
    → /screens/dashboard-company
```

---

## Pantalla `business-pending.tsx` — Diseño y comportamiento

Esta pantalla es **completamente bloqueante**. No tiene Sidebar ni navegación adicional.

Debe mostrar:
- Icono/ilustración de reloj o revisión
- Título: "Tu negocio está en revisión"
- Subtítulo: "Estamos verificando la información de tu negocio. Te notificaremos cuando sea aprobado."
- El nombre del negocio registrado
- Botón de cerrar sesión (único elemento interactivo)
- `useFocusEffect` para hacer `refreshProfile()` cada vez que se vuelve a la pantalla — así, si el admin aprueba, el usuario solo necesita volver a abrir la app para ser redirigido al dashboard.

---

## Pantalla `admin-business-detail.tsx` — Información a mostrar

El admin necesita ver para tomar la decisión:
- Nombre del negocio
- Categoría
- Descripción
- Dirección y teléfono
- Logo (si subió uno)
- Nombre del dueño (nickname + email desde `profiles`)
- Fecha de solicitud
- Botón **APROBAR** (verde) → `status = 'approved'`
- Botón **RECHAZAR** (rojo) → `status = 'rejected'` con campo de motivo opcional

---

## Modificaciones a archivos existentes

### `app/index.tsx`
Agregar consulta a `businesses` para detectar estado y el caso `role = 'admin'`.

### `app/_layout.tsx`
Registrar las 22 pantallas nuevas en el Stack.

### `components/Sidebar.tsx`
Tres variantes según rol: cliente, empresa aprobada, admin. La empresa pendiente **no tiene Sidebar**.

### `context/AuthContext.tsx`
Agregar campo `business: { id, name, status } | null` — se carga junto al profile cuando `role = 'company'`.

---

## Sidebar — Items por rol

### Cliente
- HOME → `/screens/dashboard`
- EXPLORAR → `/screens/explore`
- MIS CITAS → `/screens/my-appointments`
- PERFIL → `/screens/profile`

### Empresa (aprobada)
- HOME → `/screens/dashboard-company`
- AGENDA → `/screens/company-calendar`
- SERVICIOS → `/screens/company-services`
- EMPLEADOS → `/screens/company-employees`
- MI NEGOCIO → `/screens/company-profile`
- PERFIL → `/screens/profile`

### Admin
- HOME → `/screens/admin-dashboard`
- EMPRESAS → `/screens/admin-businesses`
- PERFIL → `/screens/profile`

---

## Prioridad de desarrollo (orden sugerido)

### Fase 0 — Infraestructura (Supabase)
1. Crear tablas: `service_categories`, `catalog_services`, `businesses`, `business_services`, `employees`, `employee_availability`, `appointments`
2. Activar RLS y crear políticas
3. Crear buckets `business-logos` y `employee-photos`
4. Insertar datos semilla (categorías + servicios base)
5. Activar Realtime en `appointments`

### Fase 1 — Admin puede aprobar empresas
6. `admin-dashboard.tsx`
7. `admin-businesses.tsx`
8. `admin-business-detail.tsx`
9. Modificar `index.tsx` con lógica de redirección completa
10. Modificar `_layout.tsx` con todas las pantallas nuevas
11. Modificar `Sidebar.tsx` con variantes por rol

### Fase 2 — Empresa puede registrarse y esperar
12. `business-setup.tsx`
13. `business-pending.tsx`

### Fase 3 — Empresa aprobada se configura
14. `company-services.tsx` + `company-service-config.tsx`
15. `company-employees.tsx` + `company-employee-form.tsx`
16. `company-profile.tsx`
17. Modificar `dashboard-company.tsx`

### Fase 4 — Cliente puede agendar
18. `explore.tsx`
19. `business-detail.tsx`
20. `booking-service.tsx` → `booking-professional.tsx` → `booking-datetime.tsx`
21. `booking-confirm.tsx` → `booking-success.tsx`
22. `my-appointments.tsx` + `appointment-detail.tsx`
23. Modificar `dashboard.tsx`

### Fase 5 — Empresa ve y gestiona reservas
24. `company-calendar.tsx`
25. `company-appointment-detail.tsx`

---

## Componentes compartidos a crear

| Componente | Uso |
|---|---|
| `ServiceCard` | Tarjeta de servicio (nombre, precio, duración) |
| `EmployeeCard` | Tarjeta de empleado (foto, nombre, bio) |
| `AppointmentCard` | Tarjeta de cita (fecha, hora, profesional, estado) |
| `BusinessCard` | Tarjeta de empresa en el explorador y lista de admin |
| `TimeSlotPicker` | Grid de slots horarios disponibles |
| `CalendarPicker` | Selector de fecha tipo mini-calendario |
| `StatusBadge` | Badge: confirmada / cancelada / completada / pendiente / aprobada / rechazada |
| `EmptyState` | Pantalla vacía reutilizable (ícono + mensaje + acción opcional) |
| `ConfirmModal` | Modal de confirmación reutilizable (aprobar, cancelar, rechazar) |
