# Funciones Principales — Roles Client y Company

> Documento de referencia para auditar, actualizar y mejorar cada función de la app.
> Generado: 2026-05-19

---

## Arquitectura Compartida

### Contextos globales

| Contexto | Archivo | Proporciona |
|----------|---------|-------------|
| `AuthContext` | `context/AuthContext.tsx` | `session`, `profile`, `business`, `loading`, `profileLoaded`, `signOut()`, `signInWithGoogle()`, `refreshProfile()` |
| `BusinessContext` | `context/BusinessContext.tsx` | `selectedBusiness`, `setSelectedBusiness()` — comparte el negocio seleccionado entre pantallas del cliente |
| `ThemeContext` | `context/ThemeContext.tsx` | `isDarkMode`, `toggleTheme()`, `colors` (paleta Tesla dark/light) |
| `AlertContext` | `context/AlertContext.tsx` | `showAlert(options)`, `hideAlert()` — modal global estilizado |

### Cliente Supabase

**Archivo:** `lib/supabase.ts`

- URL: `https://qkciuhruwwrsikmkhlqm.supabase.co`
- Configuración: `AsyncStorage` en nativo, `localStorage` en web; auto-refresh de token habilitado.
- Todas las pantallas importan `supabase` directamente — no existe capa de servicios.

### Navegación

**Archivo:** `app/index.tsx`

Flujo de redirección al cargar:
1. Espera `loading=false` + `profileLoaded=true`
2. Sin sesión → `/screens/global/home`
3. Sin rol → `/screens/global/role-select`
4. Rol `admin` → `admin-dashboard`
5. Rol `client` → `explore`
6. Rol `company`:
   - Sin negocio → `business-setup`
   - Negocio pending/rejected → `business-pending`
   - Negocio approved → `company-agenda`

### Tablas Supabase involucradas

| Tabla | Uso principal |
|-------|--------------|
| `profiles` | id, nickname, avatar_url, role |
| `businesses` | id, owner_id, name, status, category_id, opening_time, closing_time, etc. |
| `workers` | id, business_id, name, specialty, color, active, available_days |
| `business_services` | id, business_id, name, price, duration_min, is_active |
| `appointments` | id, business_id, worker_id, client_id, service, price, date, start_hour, duration_hours, status |
| `service_categories` | id, name, icon, parent_id, is_active |
| `catalog_services` | name, category_id (catálogo genérico de fallback) |

**Buckets de Storage:**
- `avatars` — imágenes de perfil y negocio
- `business-logos` — logo en el onboarding

---

## ROL CLIENT

### Flujo general del cliente

```
Explore (buscar negocios)
  → ClientBusinessProfile (ver detalle del negocio)
    → ClientAgenda (ver disponibilidad y reservar)
MyAppointments (gestionar mis reservas)
```

---

### 1. Explore (Browse de negocios)

**Archivo:** `app/screens/global/explore.tsx`

Pantalla de descubrimiento de negocios. El cliente busca y selecciona un negocio para ver su perfil.

| Función | Descripción |
|---------|-------------|
| (pantalla por explorar en detalle) | Navega a `client-business-profile` con el `id` del negocio seleccionado y llama `setSelectedBusiness()` en `BusinessContext` |

---

### 2. Perfil del Negocio (Cliente)

**Archivo:** `app/screens/roles/client/client-business-profile.tsx`

Muestra la información completa de un negocio antes de reservar: nombre, descripción, horario, ubicación, Instagram.

#### Funciones

| Función | Parámetros | Descripción |
|---------|-----------|-------------|
| `ClientBusinessProfileScreen` | — | Componente principal. Lee el `id` del negocio por URL param. Si no está en `BusinessContext`, lo fetcha desde Supabase. Ejecuta animaciones de entrada (fade + slide). Renderiza botón "Reservar" que navega a `client-agenda`. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `selectedBusiness` | `SelectedBusiness \| null` | Del `BusinessContext` |
| `fetchedBusiness` | `SelectedBusiness \| null` | Fetched directamente si no está en contexto |
| `fetchLoading` | `boolean` | Carga del fetch |
| `fadeAnim` | `Animated.Value` | Animación de opacidad |
| `slideAnim` | `Animated.Value` | Animación de traslación Y |

#### Queries Supabase

```sql
-- Fetch negocio por ID (si no está en contexto)
SELECT * FROM businesses WHERE id = :id LIMIT 1
```

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B1 | **Alta** | El error del fetch solo se loguea en consola; el usuario ve pantalla vacía "No hay información del negocio" sin poder reintentar. |
| B2 | **Media** | El `useEffect` tiene `selectedBusiness` en su dependency array, lo que puede causar re-renders infinitos si el contexto cambia. |
| B3 | **Media** | No se valida que el param `id` exista antes de intentar el fetch. |
| B4 | **Baja** | Los links externos (Maps, Instagram) se abren sin diálogo de confirmación. |
| R1 | — | Agregar botón "Reintentar" cuando el fetch falla. |
| R2 | — | Mostrar estado de negocio suspendido antes de permitir reservas. |

---

### 3. Agenda del Cliente (Reservas)

**Archivo:** `app/screens/roles/client/client-agenda.tsx`

Calendario interactivo (vista día / semana) para que el cliente vea disponibilidad y cree reservas. Es la pantalla más compleja del rol cliente.

#### Tipos definidos

```typescript
type Appointment = {
  id, clientName, service, worker_id, worker, workerColor,
  startHour, durationHours,
  status: 'confirmed'|'pending'|'completed'|'no-show'|'rescheduled'|'cancelled',
  date?, price?, isMine?
}
type Worker = { id, name, color, initials }
type ViewMode = 'day' | 'week'
```

#### Constantes

| Constante | Valor | Uso |
|-----------|-------|-----|
| `HOUR_HEIGHT` | `72` | Píxeles por hora en el grid |
| `DEFAULT_START_HOUR` | `7` | Hora de inicio del grid |
| `DEFAULT_END_HOUR` | `22` | Hora de fin del grid |
| `STATUS_CONFIG` | objeto | Colores y labels por status |

#### Funciones helper (módulo-nivel)

| Función | Parámetros | Descripción |
|---------|-----------|-------------|
| `getWeekDays` | `baseDate: Date` | Devuelve array de 7 fechas (lun–dom) a partir de una fecha base |
| `toLocalISOString` | `date: Date` | Convierte Date a string `YYYY-MM-DD` respetando zona horaria local |
| `formatHour` | `h: number` | Convierte hora decimal (ej. 9.5) a string `"HH:MM"` |
| `formatDateLabel` | `date: Date` | Devuelve label en español: `"Lunes 15 de mayo"` |
| `shortDayName` | `date: Date` | Devuelve abreviatura en español: `"Dom"`, `"Lun"`, etc. |
| `isToday` | `date: Date` | Boolean: ¿es hoy? |
| `nowLinePosition` | `startHour, endHour` | Calcula posición Y (px) de la línea de hora actual en el grid |

#### Sub-componentes

| Componente | Props clave | Descripción |
|-----------|-------------|-------------|
| `AppointmentCard` | `appt, columnWidth, onPress, colors, startHour, isDarkMode` | Bloque de cita posicionado absolutamente en el grid. Altura proporcional a duración. Estilo glassmorphism. Tratamiento especial para tipo "BLOQUEO". |
| `AppointmentSheet` | `appt, visible, onClose, onAction, isGym, colors, isDarkMode` | Bottom sheet con detalles de la cita y acciones: confirmar, completar, reagendar, editar, no-show, cancelar. Soporta swipe-down para cerrar (PanResponder, threshold 80px). |
| `AppointmentFormModal` | `visible, onClose, onSave, workers, editingAppt, businessId, businessHours, isGym, colors` | Modal completo para crear/editar citas. Incluye: nombre cliente, selector de servicio, selector de trabajador, date picker, selector de horario (slots de 15 min con ocupados marcados), ajuste de duración, toggle bloqueo de tiempo, detección de colisiones, feedback animado de éxito. |

#### Funciones del componente principal `ClientAgendaScreen`

| Función | Descripción |
|---------|-------------|
| `fetchWorkers` | Carga todos los workers del negocio desde Supabase |
| `fetchAppointments` | Carga las citas de la semana seleccionada (con datos del worker en JOIN) |
| `handleSheetAction` | Despacha acciones sobre una cita: `confirm`, `cancel`, `edit`, `no-show`, `rescheduled` |
| `handleSaveAppt` | Valida los datos del form y hace INSERT o UPDATE en `appointments`. Incluye validación de colisiones. |
| `navigateDay` | Mueve la fecha seleccionada ±N días |
| `renderDayGrid` | Renderiza vista día con columnas por worker |
| `renderWeekGrid` | Renderiza vista semana con columnas por día |

#### Estado principal

| Variable | Tipo | Uso |
|----------|------|-----|
| `viewMode` | `'day'\|'week'` | Vista activa del calendario |
| `selectedDate` | `Date` | Fecha seleccionada |
| `workers` | `Worker[]` | Lista de workers del negocio |
| `appointments` | `Appointment[]` | Citas de la semana visible |
| `selectedAppt` | `Appointment \| null` | Cita seleccionada (para sheet) |
| `selectedWorkerFilter` | `string \| null` | Filtro por worker activo |
| `sheetVisible` | `boolean` | Visibilidad del AppointmentSheet |
| `formVisible` | `boolean` | Visibilidad del AppointmentFormModal |
| `editingAppt` | `Appointment \| undefined` | Cita siendo editada |
| `isGym` | `boolean` | Detectado por categoría del negocio |
| `refreshing` | `boolean` | Estado del RefreshControl |

#### Queries Supabase

| # | Tabla | Operación | Condición |
|---|-------|-----------|-----------|
| 1 | `businesses` | SELECT * | `id = :businessIdParam` |
| 2 | `service_categories` | SELECT name | `id = business.category_id` (detectar gym) |
| 3 | `workers` | SELECT * | `business_id = business.id` |
| 4 | `appointments` | SELECT *, workers(name,color) | `business_id`, `date BETWEEN startStr AND endStr` |
| 5 | `business_services` | SELECT name, price | `business_id`, `is_active = true` |
| 6 | `catalog_services` | SELECT name | `category_id = bizData.category_id` (fallback) |
| 7 | `appointments` | SELECT id, start_hour, duration_hours | Detección de colisiones por worker/fecha |
| 8 | `appointments` | INSERT | Nueva cita |
| 9 | `appointments` | UPDATE | Editar cita existente |
| 10 | `appointments` | UPDATE status | Confirmar / no-show / reagendar |
| 11 | `appointments` | DELETE | Cancelar cita |

#### Reglas de validación implementadas (form)

- Servicio, worker y fecha son obligatorios
- Formato de hora válido (HH:MM)
- No se puede reservar en el pasado
- Mínimo 1 hora de anticipación el mismo día
- Gimnasios: mínimo 48 horas de anticipación
- Límites de horario de apertura/cierre del negocio
- Sin superposición de citas por worker

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B5 | **Crítica** | `colors.selectedBusinessId` es incorrecto — `colors` es el objeto de tema, no contiene `selectedBusinessId`. Debería ser `business?.id`. |
| B6 | **Crítica** | `colors.workersList` no existe en el objeto de colores. Error en el render del sidebar del formulario. |
| B7 | **Crítica** | Constructor de `Date` con formato `T` puede fallar en ciertos entornos. Usar ISO string puro. |
| B8 | **Alta** | No hay transacción en la detección de colisiones → race condition si dos usuarios reservan el mismo slot simultáneamente. |
| B9 | **Alta** | El bloque `catch` de la query de colisiones está ausente — falla silenciosamente. |
| B10 | **Media** | En vista semana, al cambiar de worker se auto-selecciona el primero sin consentimiento del usuario. |
| B11 | **Media** | Regla de 48h para gimnasios solo se valida en el cliente, no en el servidor. |
| B12 | **Baja** | No hay indicador de carga inicial (solo RefreshControl al hacer pull). |
| R3 | — | Extraer los 11 queries a un custom hook `useAgenda()` para simplificar el componente. |
| R4 | — | Agregar Row Level Security en Supabase para la regla de 48h. |
| R5 | — | Mostrar precio del servicio en el resumen de confirmación. |

---

### 4. Mis Citas

**Archivo:** `app/screens/global/my-appointments.tsx`

Lista de todas las citas del cliente autenticado, con pestañas "Próximas" e "Historial".

#### Funciones

| Función | Parámetros | Descripción |
|---------|-----------|-------------|
| `MyAppointmentsScreen` | — | Componente principal con tabs upcoming/history |
| `fetchAppointments` | — | Carga todas las citas del usuario (JOIN con businesses y workers) |
| `handleCancel` | `apptId: string` | Muestra diálogo de confirmación, luego DELETE en `appointments` |
| `formatHour` | `h: number` | Igual que en agenda — hora decimal a `"HH:MM"` |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `activeTab` | `'upcoming'\|'history'` | Tab activa |
| `appointments` | `any[]` | Lista de citas cargadas |
| `loading` | `boolean` | Carga inicial |
| `refreshing` | `boolean` | RefreshControl |

#### Queries Supabase

```sql
SELECT *, businesses(name, address), workers(name)
FROM appointments
WHERE client_id = :profile.id
ORDER BY date ASC, start_hour ASC
```

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B13 | **Alta** | No hay manejo de errores en el query de fetch — falla silenciosamente. |
| B14 | **Media** | La construcción de `Date` para comparar fechas asume formato ISO — no valida el string antes. |
| B15 | **Baja** | Al cancelar una cita no hay feedback visual de confirmación exitosa. |
| B16 | **Baja** | No se muestra el precio de la cita en el listado. |
| R6 | — | Agregar filtro por negocio o por fecha. |
| R7 | — | Mostrar estado de cada cita con color/badge (pendiente, confirmada, etc.). |

---

## ROL COMPANY

### Flujo general de la empresa

```
business-setup (onboarding, solo si no tiene negocio)
  → business-pending (en revisión por admin)
    → dashboard-company (negocio aprobado)

dashboard-company
company-agenda    (gestión de citas)
company-employees (gestión de trabajadores)
company-services  (gestión de servicios)
company-business  (editar perfil del negocio)
company-history   (historial y ganancias)
```

---

### 5. Dashboard Company

**Archivo:** `app/screens/roles/company/dashboard-company.tsx`

Pantalla de bienvenida para el usuario empresa. Muestra sesión activa, nickname y rol.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `DashboardCompanyScreen` | Componente principal. Animación de entrada (fade + slide). Badge "SESIÓN ACTIVA". Tarjetas informativas de rol. Soporta pull-to-refresh. |
| `onRefresh` | Llama `refreshProfile()` del AuthContext. Actualiza estado del perfil. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `sidebarVisible` | `boolean` | Modal del Sidebar |
| `refreshing` | `boolean` | Pull-to-refresh |
| `fadeAnim` | `Animated.Value` | Opacidad |
| `slideAnim` | `Animated.Value` | Traslación Y |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B17 | **Baja** | No hay manejo de error si `refreshProfile()` falla. |
| B18 | **Baja** | No valida que `profile` exista antes de acceder a `profile.nickname`. |
| R8 | — | Convertir en dashboard real: próximas citas del día, métricas rápidas. |

---

### 6. Agenda Company

**Archivo:** `app/screens/roles/company/company-agenda.tsx`

Espejo casi exacto de `client-agenda.tsx` pero desde la perspectiva de la empresa. Permite gestionar TODAS las citas del negocio.

#### Tipos y constantes

Mismos que `client-agenda.tsx` (`Appointment`, `Worker`, `ViewMode`, `HOUR_HEIGHT`, `STATUS_CONFIG`, etc.).

#### Funciones helper (módulo-nivel)

Idénticas a las de `client-agenda.tsx`:
`getWeekDays`, `toLocalISOString`, `formatHour`, `formatDateLabel`, `shortDayName`, `isToday`, `nowLinePosition`

#### Sub-componentes

| Componente | Descripción |
|-----------|-------------|
| `AppointmentCard` | Igual a cliente. Para gym, cambia label de "No Show" → "No asistió", "Complete" → "Asistió". |
| `AppointmentSheet` | 6 acciones: confirmar, completar, reagendar, editar, no-show, cancelar. Swipe-down para cerrar. |
| `AppointmentFormModal` | Igual que cliente, más complejo: incluye slots de 15 min con marcado de ocupados, ajuste de duración ±10 min, toggle "bloquear tiempo", feedback animado de éxito. |

#### Funciones del componente principal `CompanyAgendaScreen`

| Función | Descripción |
|---------|-------------|
| `checkGym` | Detecta si el negocio es un gimnasio consultando `service_categories` |
| `fetchWorkers` | Carga workers del negocio |
| `fetchAppointments` | Carga citas de la semana seleccionada con JOIN a workers |
| `handleSheetAction` | Despacha: `confirm`, `complete`, `rescheduled`, `no-show`, `edit`, `cancel` |
| `handleSaveAppt` | Valida y guarda (INSERT/UPDATE) una cita con detección de colisiones |

#### Queries Supabase

Mismas 11 queries que `client-agenda.tsx` más:

| # | Tabla | Operación | Notas |
|---|-------|-----------|-------|
| 12 | `appointments` | UPDATE status = 'completed' | Acción exclusiva del rol company |
| 13 | `appointments` | SELECT ocupados por slot | Slots de 15 min en el form modal |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B19 | **Crítica** | Misma race condition en detección de colisiones que B8. Sin transacción Supabase. |
| B20 | **Alta** | En `fetchServices()`, el fallback al catálogo genérico swallow errores silenciosamente. |
| B21 | **Alta** | `handleSaveAppt()` no reverifica disponibilidad del worker en el momento final del guardado. |
| B22 | **Media** | Si el usuario extiende la duración en el form, el slot puede volverse inválido sin feedback visual. |
| B23 | **Baja** | `formatDateLabel()` no considera diferencias de zona horaria. |
| R9 | — | Unificar con `client-agenda.tsx` — el 90% del código es duplicado. Un único componente con prop `role` resolvería esto. |
| R10 | — | Usar Supabase Realtime para actualizar citas sin pull-to-refresh. |

---

### 7. Empleados

**Archivo:** `app/screens/roles/company/company-employees.tsx`

CRUD de trabajadores del negocio: crear, editar, activar/desactivar, eliminar.

#### Tipo

```typescript
type Employee = {
  id, name, specialty, color, initials, active,
  appointmentsToday,  // siempre 0 — sin implementar
  availableDays       // array de días disponibles
}
```

#### Constantes

| Constante | Valor |
|-----------|-------|
| `WEEK_DAYS` | Array de 7 días con label y valor numérico |
| `PALETTE` | 6 colores para identificación visual de workers |

#### Sub-componentes

| Componente | Descripción |
|-----------|-------------|
| `EmployeeSheet` | Bottom sheet con nombre, especialidad, estado activo/inactivo. Acciones: editar, toggleActive, eliminar. Animado con PanResponder. |
| `EmployeeFormModal` | Form de creación/edición: nombre, especialidad, color (paleta 6 colores), días disponibles (toggle por día). Default: lun–vie. |

#### Funciones

| Función | Descripción |
|---------|-------------|
| `CompanyEmployeesScreen` | Componente principal. `useFocusEffect` para refrescar al volver a la pantalla. |
| `fetchEmployees` | SELECT * FROM workers WHERE business_id. Mapea a tipo `Employee`. Calcula iniciales del nombre. |
| `handleSheetAction` | Despacha: `toggleActive` (UPDATE active), `delete` (DELETE con confirmación), `edit` (abre form) |
| `handleSaveEmp` | INSERT o UPDATE en `workers` según si es nuevo o edición |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `employees` | `Employee[]` | Lista de trabajadores |
| `selectedEmp` | `Employee \| null` | Trabajador seleccionado (para sheet) |
| `formVisible` | `boolean` | Visibilidad del form modal |
| `sheetVisible` | `boolean` | Visibilidad del bottom sheet |
| `editingEmp` | `Employee \| undefined` | Trabajador siendo editado |
| `refreshing` | `boolean` | Pull-to-refresh |

#### Queries Supabase

| Operación | Tabla | Detalles |
|-----------|-------|---------|
| SELECT | `workers` | `business_id = business.id` ORDER BY `created_at ASC` |
| UPDATE | `workers` | `active = !active` WHERE `id = emp.id` |
| DELETE | `workers` | `id = emp.id` |
| INSERT | `workers` | `business_id, name, specialty, color, available_days, active` |
| UPDATE | `workers` | `name, specialty, color, available_days` WHERE `id = emp.id` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B24 | **Alta** | `appointmentsToday` está marcado con `// TODO` — siempre es `0`, nunca se calcula. |
| B25 | **Media** | El DELETE de un worker no verifica si tiene citas futuras asignadas — dejaría citas huérfanas. |
| B26 | **Media** | `available_days` puede llegar como `null` desde Supabase; el fallback `|| []` lo maneja pero sin validación de tipo. |
| B27 | **Baja** | No se valida que dos workers tengan el mismo color — puede causar confusión visual. |
| R11 | — | Calcular `appointmentsToday` con un JOIN o query adicional al cargar. |
| R12 | — | Soft-delete de workers en lugar de DELETE hard (mantener historial de citas). |

---

### 8. Servicios

**Archivo:** `app/screens/roles/company/company-services.tsx`

CRUD de servicios del negocio con precios.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `CompanyServicesScreen` | Componente principal. `useFocusEffect` para refrescar al volver. |
| `fetchServices` | SELECT * FROM business_services WHERE business_id AND is_active=true. Si falla o no hay resultados, carga servicios placeholder hardcodeados. |
| `handleAddPress` | Inicializa estado de edición con `{ id: 'new' }` para crear servicio. |
| `handleEditPress` | `service` — carga el servicio seleccionado en el form de edición. |
| `handleSaveEdit` | INSERT (si `id='new'`) o UPDATE. Si el nombre cambia, actualiza en cascada todos los `appointments.service` del negocio. |
| `handleDeleteService` | Pide confirmación, luego DELETE de `business_services`. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `services` | `Service[]` | Lista de servicios |
| `editingService` | `Service \| null` | Servicio en edición |
| `editName` | `string` | Input nombre |
| `editPrice` | `string` | Input precio |
| `isSaving` | `boolean` | Loading del guardado |
| `refreshing` | `boolean` | Pull-to-refresh |

#### Queries Supabase

| Operación | Tabla | Detalles |
|-----------|-------|---------|
| SELECT | `business_services` | `business_id`, `is_active = true` |
| INSERT | `business_services` | `business_id, name, price, duration_min=30, is_active=true` |
| UPDATE | `business_services` | `name, price` WHERE `id = service.id` |
| UPDATE | `appointments` | `service = newName` WHERE `business_id` AND `service = oldName` (cascada al renombrar) |
| DELETE | `business_services` | `id = service.id` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B28 | **Alta** | Los servicios placeholder tienen IDs hardcodeados (`p1`, `p2`, `p3`) — si el usuario edita uno de estos, el INSERT/UPDATE fallará. |
| B29 | **Alta** | Al eliminar un servicio, las citas que lo referencian quedan con nombre de servicio obsoleto (no hay cascada en DELETE, solo en UPDATE). |
| B30 | **Media** | No se valida que el precio sea un número positivo. |
| B31 | **Media** | No se previene la creación de servicios con nombre duplicado. |
| B32 | **Media** | `isSaving` no bloquea segundo click — puede enviar doble INSERT. |
| B33 | **Baja** | La flag `is_active` existe pero no se usa como soft-delete; se hace DELETE hard. |
| R13 | — | Usar `is_active = false` para desactivar servicios en lugar de DELETE. |
| R14 | — | Agregar validación de precio mínimo (`> 0`). |

---

### 9. Perfil del Negocio (Edición)

**Archivo:** `app/screens/roles/company/company-business.tsx`

Ver y editar el perfil del negocio: nombre, descripción, avatar, links sociales, horarios.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `CompanyBusinessScreen` | Componente principal. Sincroniza form con datos del `AuthContext.business`. Badge de estado del negocio. |
| `pickImage` | Abre `ImagePicker`, llama `uploadImage()` si el usuario selecciona imagen. |
| `uploadImage` | `imageUri: string` — Sube a bucket `avatars` en path `{userId}/business_{timestamp}.{ext}`. Soporta nativo y web. |
| `handleSave` | UPDATE `businesses` con todos los campos editados. Llama `refreshProfile()`. |
| `onRefresh` | Llama `refreshProfile()` para recargar datos del servidor. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `name, description, mapsUrl, instagramUrl, avatarUrl` | `string` | Campos del form |
| `openingTime, closingTime` | `string` | Formato `HH:MM` |
| `editModalVisible` | `boolean` | Modal de edición |
| `isUploading, isSaving` | `boolean` | Loading states |

#### Badge de estado

| Estado DB | Badge | Color |
|-----------|-------|-------|
| `approved` | APROBADO | #4CAF50 |
| `pending` | PENDIENTE | #FFA726 |
| `rejected` | RECHAZADO | #EF5350 |
| `suspended` | SUSPENDIDO | primary (#E31937) |

#### Queries Supabase

| Operación | Detalles |
|-----------|---------|
| Imagen: `storage.upload()` | Bucket `avatars`, path `{userId}/business_{ts}.{ext}`, `upsert: true` |
| Imagen: `storage.getPublicUrl()` | Obtiene URL pública post-upload |
| UPDATE `businesses` | `name, description, maps_url, instagram_url, avatar_url, opening_time, closing_time` WHERE `id = business.id` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B34 | **Alta** | `openingTime` y `closingTime` no se validan como formato `HH:MM` — acepta `"25:00"` o `"abc"`. |
| B35 | **Media** | URLs de Instagram/Maps no se validan; se guardan sin el prefijo `https://` si el usuario lo omite. |
| B36 | **Media** | No hay confirmación antes de reemplazar el avatar existente. |
| B37 | **Baja** | El estado del negocio no se auto-actualiza si un admin lo aprueba/rechaza — requiere pull-to-refresh manual. |
| R15 | — | Agregar validación de formato `HH:MM` para horarios. |
| R16 | — | Forzar prefijo `https://` en URLs de redes sociales. |

---

### 10. Onboarding del Negocio (Setup)

**Archivo:** `app/screens/roles/company/business-setup.tsx`

Registro inicial del negocio. Solo se muestra si el usuario company aún no tiene negocio.

#### Tipo

```typescript
type Category = { id, name, icon, parent_id }
```

#### Funciones

| Función | Descripción |
|---------|-------------|
| `BusinessSetupScreen` | Componente principal. Form multi-campo. Carga categorías al montar. |
| `pickLogo` | Abre ImagePicker (aspect 1:1, quality 0.8). |
| `uploadLogo` | `userId: string` — Sube logo a bucket `business-logos` en path `{userId}/logo.{ext}`. |
| `handleSubmit` | Valida campos requeridos → sube logo → INSERT en `businesses` con `status='pending'` → `refreshProfile()` → navega a `business-pending`. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `categories` | `Category[]` | Todas las categorías activas |
| `name, description, address, phone` | `string` | Campos de texto |
| `parentCategoryId, subCategoryId` | `string` | Selección jerárquica de categoría |
| `logoUri` | `string` | URI del logo seleccionado |
| `openingTime, closingTime` | `string` | Default `"07:00"`, `"22:00"` |
| `saving` | `boolean` | Loading del submit |
| `error` | `string` | Mensaje de error de validación |

#### Validaciones del form

| Campo | Regla |
|-------|-------|
| `name` | Requerido (trim) |
| `parentCategoryId` | Requerido |
| `subCategoryId` | Requerido |
| `address` | Requerido (trim) |
| `phone`, `description`, `logo` | Opcionales |
| `openingTime`, `closingTime` | Sin validación de formato |

#### Queries Supabase

| Operación | Tabla | Detalles |
|-----------|-------|---------|
| SELECT | `service_categories` | `is_active = true` (categorías padre e hijo) |
| INSERT | `businesses` | `owner_id, name, category_id, description, address, phone, logo_url, status='pending', opening_time, closing_time` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B38 | **Crítica** | No se verifica que el `owner_id` ya tenga un negocio antes del INSERT — podría violar una constraint de DB. |
| B39 | **Alta** | Si el upload del logo falla, se guarda `logo_url = null` sin opción de retry. |
| B40 | **Media** | `phone` no tiene validación de formato. |
| B41 | **Media** | `openingTime`/`closingTime` aceptan strings inválidos. |
| B42 | **Baja** | Si el usuario selecciona una categoría padre y luego vuelve a seleccionarla, las sub-categorías se resetean sin indicación visual. |
| R17 | — | Verificar `owner_id` único en `businesses` antes del INSERT o usar constraint DB. |
| R18 | — | Agregar validación `HH:MM` para los horarios. |

---

### 11. Negocio en Revisión (Pending)

**Archivo:** `app/screens/roles/company/business-pending.tsx`

Pantalla de espera mientras el admin revisa la solicitud del negocio. Redirige automáticamente al aprobarse.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `BusinessPendingScreen` | Componente principal. Muestra estado `pending` o `rejected`. `useFocusEffect` para refrescar al enfocar. |
| `onRefresh` | Llama `refreshProfile()` para verificar cambio de estado. |
| Auto-redirect effect | Observa `business?.status`; si cambia a `'approved'` → `router.replace('dashboard-company')`. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `refreshing` | `boolean` | Pull-to-refresh |
| `fadeAnim, slideAnim, pulseAnim` | `Animated.Value` | Animaciones (incluye pulso en ícono de reloj) |

#### Lógica de UI

| Estado del negocio | Ícono | Título | Botón extra |
|-------------------|-------|--------|-------------|
| `pending` | Reloj animado | EN REVISIÓN | — |
| `rejected` | X roja | SOLICITUD RECHAZADA | "REGISTRAR NUEVO NEGOCIO" → `business-setup` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B43 | **Media** | Si el usuario navega rápido hacia/desde esta pantalla, `onRefresh` puede ejecutarse concurrentemente varias veces. |
| B44 | **Media** | No hay timeout ni límite de reintentos — si el negocio queda en `pending` indefinidamente, la pantalla no sugiere acción. |
| B45 | **Baja** | El estado `rejected` no muestra razón del rechazo (si el admin la ingresó en DB). |
| B46 | **Baja** | No hay link de contacto/soporte para negocios rechazados. |
| R19 | — | Mostrar motivo del rechazo si está disponible en `businesses.rejection_reason`. |
| R20 | — | Agregar un "contactar soporte" para estados de rechazo. |

---

### 12. Historial y Ganancias

**Archivo:** `app/screens/roles/company/company-history.tsx`

Vista de citas completadas con filtros por worker y rango de tiempo. Muestra ingresos totales.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `CompanyHistoryScreen` | Componente principal. Filtros de tiempo (HOY/SEMANA/MES) y por worker. |
| `fetchHistory` | Detecta gym → carga workers → calcula rango de fechas → SELECT appointments completed filtrado. Ordena por fecha/hora DESC. |

#### Estado

| Variable | Tipo | Uso |
|----------|------|-----|
| `appointments` | `any[]` | Citas completadas |
| `workers` | `Worker[]` | Lista para el filtro |
| `selectedWorkerId` | `'all' \| string` | Filtro activo |
| `timeRange` | `'day'\|'week'\|'month'` | Rango de tiempo activo |
| `isGym` | `boolean` | Cambia labels (servicios vs asistencias) |
| `loading, refreshing` | `boolean` | Loading states |

#### Valores calculados

| Valor | Cálculo |
|-------|---------|
| `totalEarnings` | `sum(appointment.price)` de las citas cargadas |
| Label de conteo | Gym: "X asistencias registradas" / Resto: "X servicios realizados" |

#### Queries Supabase

| Operación | Tabla | Detalles |
|-----------|-------|---------|
| SELECT name | `service_categories` | Detectar si es gimnasio |
| SELECT id, name | `workers` | Para el selector de filtro |
| SELECT *, workers(name) | `appointments` | `status='completed'`, `date >= startDate`, opcionalmente `worker_id = selectedWorkerId` |

#### Bugs / Recomendaciones

| # | Severidad | Descripción |
|---|-----------|-------------|
| B47 | **Alta** | No hay paginación — carga TODOS los registros completados en memoria. Problema de performance en negocios con meses de historial. |
| B48 | **Media** | El cálculo de "inicio de semana" usa `day || 7` — puede tener off-by-one según convención de semana (dom vs lun). |
| B49 | **Media** | El cálculo de "inicio de mes" usa `setDate(1)` pero no considera la zona horaria correctamente. |
| B50 | **Baja** | Si `appointment.service` es `null` en DB, se renderiza como el string `"null"`. |
| B51 | **Baja** | Chips de filtro usan color hardcodeado `#444` en lugar del sistema de temas. |
| R21 | — | Implementar paginación o cursor-based loading (ej. 50 por página). |
| R22 | — | Agregar funcionalidad de exportar CSV/PDF del historial. |
| R23 | — | Mostrar gráfico de ingresos por semana/mes. |

---

## Resumen de Errores Críticos

### Por severidad

| Severidad | Cantidad | IDs |
|-----------|----------|-----|
| **Crítica** | 5 | B5, B6, B7, B19, B38 |
| **Alta** | 13 | B1, B8, B9, B13, B20, B21, B24, B25, B28, B29, B34, B39, B47 |
| **Media** | 21 | B2, B3, B10, B11, B14, B22, B23, B26, B27, B30, B31, B32, B33, B36, B40, B41, B42, B43, B44, B48, B49 |
| **Baja** | 13 | B4, B12, B15, B16, B17, B18, B35, B37, B45, B46, B50, B51 |

### Top 5 a resolver primero

| ID | Archivo | Problema |
|----|---------|---------|
| B5 | `client-agenda.tsx` | `colors.selectedBusinessId` — acceso a propiedad inexistente |
| B6 | `client-agenda.tsx` | `colors.workersList` — acceso a propiedad inexistente |
| B7 | `client-agenda.tsx` / `company-agenda.tsx` | Constructor `Date` con formato inválido |
| B38 | `business-setup.tsx` | No se verifica `owner_id` único antes de INSERT en `businesses` |
| B19 | `company-agenda.tsx` | Race condition en detección de colisiones de citas |

---

## Recomendaciones Globales

| # | Prioridad | Descripción |
|---|-----------|-------------|
| R3 | Alta | **Refactorizar la agenda**: `client-agenda.tsx` y `company-agenda.tsx` son un 90% idénticos. Unificar en un componente con prop `role: 'client' | 'company'`. |
| R24 | Alta | **Capa de servicios**: Mover todos los queries Supabase a custom hooks (`useAgenda`, `useWorkers`, `useServices`, `useHistory`). Evita duplicación y facilita testing. |
| R25 | Alta | **Row Level Security**: Implementar RLS en Supabase para las tablas `appointments`, `workers`, `business_services`. Actualmente la seguridad solo está en el cliente. |
| R10 | Media | **Realtime Supabase**: Usar `supabase.channel()` en la agenda para que las citas se actualicen en tiempo real sin pull-to-refresh. |
| R26 | Media | **TypeScript estricto**: Muchas queries usan `any[]` — definir tipos derivados de la DB para prevenir errores en compilación. |
| R27 | Media | **Manejo de errores consistente**: Crear un wrapper para queries Supabase que muestre `showAlert()` en caso de error, en lugar de manejar cada caso manualmente. |
| R28 | Baja | **Validación de formularios**: Usar una librería como `zod` o `yup` para centralizar la validación de inputs (precios, horarios, teléfonos, URLs). |
| R29 | Baja | **Zona horaria**: Definir una estrategia consistente (UTC en DB, conversión en cliente) para evitar bugs de fechas. |
