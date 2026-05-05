# 🗺️ Roadmap de Funcionalidades — Agenda

> Este documento describe todas las funcionalidades planificadas, organizadas por fase de desarrollo y prioridad.

---

## 🔥 FASE 1 — Core (obligatorias para lanzar)

### ✅ 1. Agenda inteligente

La base del negocio. Cada trabajador tiene su propia disponibilidad y el sistema respeta las duraciones reales de cada servicio.

- [ ] Disponibilidad configurable por trabajador (días y horarios)
- [ ] Bloques de tiempo personalizados (15, 30, 45, 60 min)
- [ ] Servicios con duración variable (un corte dura 30 min, una coloración 90 min)
- [ ] Vista de calendario: día / semana / mes
- [ ] Bloqueo automático de horas ya ocupadas
- [ ] Soporte para múltiples trabajadores en el mismo negocio

**Tablas Supabase necesarias:**
```sql
workers(id, business_id, name, avatar_url)
availability(id, worker_id, day_of_week, start_time, end_time)
time_blocks(id, worker_id, date, start_time, end_time, is_blocked)
```

---

### ✅ 2. Reserva online fácil

El cliente reserva en menos de 1 minuto desde su celular, sin app, sin registro previo.

**Flujo del cliente:**
1. Recibe link → `miapp.com/barberiajuan`
2. Ve el perfil del negocio (foto, nombre, servicios)
3. Elige servicio
4. Elige trabajador (opcional)
5. Elige fecha y hora disponible
6. Ingresa su nombre y teléfono
7. Confirma → recibe confirmación por pantalla (y opcionalmente por WhatsApp)

- [ ] Link único por negocio: `/[slug]`
- [ ] Página pública de reserva (sin login para el cliente)
- [ ] Selector de servicio con duración y precio
- [ ] Calendario con horas disponibles en tiempo real
- [ ] Formulario simple: nombre + teléfono (sin contraseña)
- [ ] Pantalla de confirmación con resumen de la reserva
- [ ] Botón "Agregar al calendario" (iOS/Android)

**Tablas Supabase necesarias:**
```sql
businesses(id, name, slug, description, phone, address, logo_url)
bookings(id, business_id, worker_id, service_id, client_name, client_phone, date, start_time, end_time, status)
```

---

### ✅ 3. Servicios

Catálogo de servicios del negocio, con duración y precio.

- [ ] Crear, editar y eliminar servicios
- [ ] Campos: nombre, descripción, duración, precio (opcional)
- [ ] Ordenar servicios por categoría
- [ ] Activar/desactivar servicio sin eliminarlo

**Ejemplos:**

| Servicio | Duración | Precio |
|---|---|---|
| Corte de pelo | 30 min | $5.000 |
| Barba | 20 min | $3.500 |
| Corte + barba | 45 min | $7.500 |
| Coloración | 90 min | $18.000 |

---

### ✅ 4. Panel del negocio (dashboard básico)

Vista simple para el dueño o trabajador, operativa desde el celular.

- [ ] Ver todas las citas del día ordenadas por hora
- [ ] Ver citas de la semana
- [ ] Agregar cita manual (para reservas por WhatsApp o teléfono)
- [ ] Marcar cita como completada / cancelada / no-show
- [ ] Editar o reprogramar una cita existente
- [ ] Notificación visual de citas próximas

**Pantallas:**
- `/(tabs)/dashboard` — vista del día
- `/(tabs)/calendar` — vista semanal/mensual
- `/booking/new` — agregar cita manual

---

## 📍 FASE 2 — Perfil público del negocio

Mini landing page del negocio, accesible desde el link de reserva.

- [ ] Foto de portada y logo
- [ ] Nombre, descripción corta, dirección
- [ ] Lista de servicios con precios
- [ ] Mapa con ubicación (Google Maps / Apple Maps)
- [ ] Reseñas de clientes (sistema interno, sin Google)
- [ ] Botón flotante "Reservar ahora"
- [ ] Horarios de atención visibles
- [ ] Redes sociales (Instagram, WhatsApp)

**Ruta:** `/[slug]` — pública, sin autenticación

---

## 📈 FASE 3 — Fidelización

Herramientas para que los clientes vuelvan.

### Puntos y descuentos
- [ ] Sistema de puntos por cada reserva completada
- [ ] Canje de puntos por descuentos o servicios gratis
- [ ] Historial de puntos del cliente
- [ ] Configuración de la tasa de puntos por el negocio

### Membresías
- [ ] Crear planes de membresía (ej: "4 cortes al mes por $15.000")
- [ ] Control de usos restantes por cliente
- [ ] Renovación automática o manual
- [ ] Vista del cliente con su membresía activa

**Ejemplos de membresías:**

| Plan | Incluye | Precio |
|---|---|---|
| Básico | 2 cortes/mes | $8.000/mes |
| Plus | 4 cortes/mes | $14.000/mes |
| Premium | Cortes ilimitados + barba | $22.000/mes |

---

## 🔔 FASE 4 — Notificaciones y recordatorios

- [ ] Recordatorio automático 24h antes de la cita (push notification)
- [ ] Recordatorio 1h antes (push notification)
- [ ] Mensaje de confirmación al reservar
- [ ] Mensaje de cancelación si el negocio cancela
- [ ] Integración con WhatsApp Business API (mensaje automático)

---

## 📊 FASE 5 — Estadísticas para el negocio

- [ ] Ingresos del día / semana / mes
- [ ] Servicio más solicitado
- [ ] Trabajador con más reservas
- [ ] Tasa de no-shows (clientes que no vienen)
- [ ] Clientes nuevos vs recurrentes
- [ ] Horas pico de reservas

---

## 🧑‍💼 FASE 6 — Multi-trabajador avanzado

- [ ] Perfil individual por trabajador (foto, bio, especialidades)
- [ ] Cliente puede elegir trabajador preferido
- [ ] Comisiones por trabajador
- [ ] Roles: dueño / trabajador / recepcionista

---

## 🔑 Estado de desarrollo

| Fase | Estado |
|---|---|
| Fase 1 — Core | 🔨 En desarrollo |
| Fase 2 — Perfil público | 📋 Planificado |
| Fase 3 — Fidelización | 📋 Planificado |
| Fase 4 — Notificaciones | 📋 Planificado |
| Fase 5 — Estadísticas | 📋 Planificado |
| Fase 6 — Multi-trabajador | 📋 Planificado |

---

> Última actualización: Mayo 2025 · Ver también [`GUIA_CLIENTES.md`](./GUIA_CLIENTES.md)