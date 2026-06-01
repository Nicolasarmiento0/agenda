# NUCORA - Arquitectura de Agendamiento Inteligente por Categoría

## Objetivo

Diseñar un sistema SaaS de agendamiento universal capaz de adaptarse dinámicamente a distintos tipos de negocios sin crear aplicaciones separadas.

La prioridad es:

* Reducir la cantidad de clics para reservar.
* Simplificar la administración para el negocio.
* Mantener una única base de código.
* Activar módulos especializados según la categoría del negocio.
* Mantener lo que ya sirve, solo agregar las nuevas funcionalidades por tipo de categorias.

---

# Arquitectura General

Todos los negocios comparten:

* Empresas
* Clientes
* Trabajadores
* Agenda
* Servicios
* Bloqueos
* Notificaciones en bandeja de entrada de la app
* Historial

Pero cada categoría puede activar módulos específicos.

---

# Categorías Soportadas

## 1. Salud y Bienestar

Incluye:

* Centros médicos
* Clínicas
* Psicólogos
* Nutricionistas
* Veterinarias
* Especialistas

### Modelo de Reserva

Basado en:

* Profesional
* Especialidad
* Duración

### Flujo Cliente

1. Selecciona especialidad.
2. Selecciona profesional.
3. Selecciona horario.
4. Confirma reserva.

### Módulos Especiales

* Ficha del paciente
* Historial de citas
* Recordatorios automáticos
* Citas de seguimiento

### Entidades

Appointment
MedicalRecord
Patient
ProfessionalSpecialty

---

# 2. Estética y Cuidado Personal (actual no modificar)

Incluye:

* Barberías
* Salones
* Spa
* Centros estéticos
* Tatuajes
* Piercing

### Modelo de Reserva

Basado en:

* Profesional
* Servicio
* Duración

### Flujo Cliente

1. Elegir servicio.
2. Elegir profesional.
3. Elegir horario.
4. Confirmar.

### Funcionalidad Avanzada

Servicios encadenados.

Ejemplo:

* Corte
* Barba
* Lavado

El sistema calcula automáticamente:

* Duración total
* Disponibilidad real

### Entidades

ServicePackage
ServiceStep
Appointment

---

# 3. Deporte y Fitness

## Modo Gimnasio

Este módulo es completamente distinto.

No se agenda un servicio.

Se gestionan:

* Planes
* Clases
* Cupos
* Suscripciones

---

# Conceptos

## Plan

Ejemplos:

Que sean modificables ya que cada gimnasio ofrece sistintos planes o talleres.

* Libre mensual
* Acceso ilimitado
* 3 veces por semana (Plan premium)
* 2 veces por semana (Plan intermedio)
* 1 vez por semana (Plan básico)
* Crossfit
* Yoga
* Funcional

### Entidad

MembershipPlan

Campos:

* id
* business_id
* name
* monthly_price
* max_classes
* unlimited_access
* active

---

# Clase

Ejemplos:

* Crossfit 07:00
* Yoga 18:00
* Funcional 20:00
* Clase de plan 

### Entidad

ClassSession

Campos:

* id
* business_id
* title
* instructor_id
* start_time
* end_time
* max_capacity

---

# Alumno Estático

Pensado para:

* Gimnasios

### Comportamiento

El alumno posee horarios permanentes que se repiten todas las semanas los cuales elige al ingresar al negocio tipo gym.

Ejemplo:

Lunes 18:00

Miércoles 18:00

Viernes 18:00

El sistema genera automáticamente las reservas futuras.

El cliente:

* No puede modificar.
* No puede cambiar horario.

Solo Company puede hacerlo.

### Entidades

StaticStudent

Campos:

* student_id
* class_id
* active

---

# Alumno Dinámico

Pensado para gimnasios modernos.

El cliente:

* Tiene un plan activo.
* Ve calendario de clases.
* Reserva cuando quiera (2hrs para dar tiempo a dueño).

### Validaciones

Antes de reservar:

1. Plan vigente.
2. Cupos disponibles.
3. No superar límite mensual.
4. No reservar dos clases simultáneas.

### Entidades

DynamicStudent

StudentClassReservation

---

# Flujo Alumno Dinámico

1. Abrir calendario y en esta vista ver clases mensuales que le quedan disponibles.
2. Rol company puede habilitar o deshabilitar el alumno (dependiendo si pago o no su mensualidad)
2. Ver cupos disponibles.
3. Reservar.
4. Confirmación inmediata.

---

# Dashboard Fitness

Mostrar:

* Clases del día.
* Ocupación.
* Lista de asistencia.
* Alumnos faltantes.
* Cupos restantes.

---

# Tambien en deportes, hay una categoria de canchas deportivas que funciona igual a la de los barberias, solo que se puede reservar una cancha por hora. En vez de servicios y trabajdores se debe ajustar para que funcione con canchas.

# 4. Educación y Consultoría

Incluye:

* Clases particulares
* Tutorías
* Academias
* Consultorías

### Modelo

Basado en bloques.

### Flujo Cliente

1. Elegir servicio.
2. Elegir profesional.
3. Elegir fecha.
4. Elegir modalidad.

Opciones:

* Presencial
* Online

### Módulos

* Enlaces Meet/Zoom
* Reagendamiento

### Entidades

Course
Session
Consultation

---

# 5. Servicios Hogar y Automotriz

Incluye:

* Talleres mecánicos
* Detailing automotriz
* Servicios técnicos

### Problema

La duración es variable.

### Solución

Reserva por evaluación.

---

# Flujo Cliente

1. Elegir servicio.
2. Adjuntar fotos.
3. Describir problema.
4. Solicitar cita.

Que el subir fotos sea opcional

---

# Flujo Negocio

1. Revisar solicitud.
2. Aprobar.
3. Ajustar duración.
4. Confirmar.

---

# Entidades

ServiceRequest

Campos:

* description
* images
* status
* estimated_duration

---

# Motor Universal de Agenda

Todos los módulos comparten:

Appointment

Campos:

* id
* business_id
* client_id
* worker_id
* start_time
* end_time
* status

Estados:

* pending
* confirmed
* completed
* cancelled
* no_show

---

# Configuración de Categoría

Business

Campos:

* id
* name
* category

Valores:

* health
* beauty
* fitness
* education
* automotive

---

# Dashboard Universal para Dueños

La pantalla principal siempre sera el dshboard-company.

Mostrar:

## Hoy

* Próximas citas
* Próximas clases
* Próximos alumnos

## Métricas rápidas

* Reservas del día
* Cancelaciones
* Nuevos clientes
* Ingresos estimados (ya incluido en dashboard actual)

## Acciones rápidas

* Crear cita
* Crear bloqueo
* Crear cliente
* Ver agenda completa

---

# API / Casos de Uso Fitness

## Crear Reserva Dinámica

POST /fitness/reservations

Validaciones:

* plan activo
* cupos disponibles
* límite mensual
* horario no conflictivo

---

## Cancelar Reserva

DELETE /fitness/reservations/:id

Validar política de cancelación.

---

## Generar Horarios Estáticos

POST /fitness/static-students/generate

Función:

Crear automáticamente reservas futuras.

---

## Cambiar Alumno Estático

PATCH /fitness/static-students/:id

Solo rol Company.

---

## Obtener Cupos

GET /fitness/classes/:id/capacity

Retorna:

* capacidad total
* reservados
* disponibles

---

# Objetivo Final

NUCORA debe comportarse como una plataforma inteligente.

El cliente nunca debe sentir que está usando un sistema genérico.

La experiencia de reserva debe adaptarse automáticamente al tipo de negocio seleccionado.

La agenda siempre debe ser el centro de la experiencia.

Todos los módulos deben compartir una única base de datos y un único sistema de autenticación, pero permitir reglas de negocio específicas según la categoría.

Las funcionalidades que ya estén implementadas en el código actual (backend, frontend, base de datos, etc.) y que se usen por los módulos actuales, no se deben tocar.

Todas las funciones que se agreguen para cada tipo de negocio deben poder modificarse desde el setup business o cuando deseen, recuerda que el onboarding de creación de negocio debe ser con la menor cantidad de clicks para que el usuario pueda comenzar a utilizar la plataforma rápidamente. Por favor, antes de realizar cualquier cambio, analizar el código actual y las funcionalidades existentes para no afectar el correcto funcionamiento del sistema. 