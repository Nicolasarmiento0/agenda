Quiero que refactorices COMPLETAMENTE el sistema de creación y gestión de citas de la app. Este es el CORE del producto y actualmente está roto. NO quiero parches rápidos ni lógica duplicada por rol. Necesito una arquitectura limpia, escalable y centralizada.

OBJETIVO PRINCIPAL

- Unificar TODA la lógica de agendas y citas en un único componente reutilizable basado en `AppointmentFormModal`.
- El componente debe adaptarse dinámicamente según el rol (`client`, `company`, `worker`) y tipo de negocio (`gym` u otros).
- Eliminar cualquier lógica repetida, formularios duplicados o agendas separadas por rol.
- Mantener el mismo diseño visual premium/glassmorphism actual.

REGLAS GENERALES DE ARQUITECTURA

1. Crear un único flujo de citas:
    - createAppointment
    - confirmAppointment
    - rescheduleAppointment
    - completeAppointment
    - cancelAppointment
    - noShowAppointment
    - blockTimeSlot
2. Toda la lógica debe vivir en:
    - hooks reutilizables
    - servicios centralizados
    - validadores desacoplados
    - reducers/state machine si es necesario
3. NO duplicar lógica entre agendas.
4. Todas las agendas deben consumir el mismo componente base.
5. Todas las acciones deben sincronizar correctamente:
    - UI
    - estado local
    - Supabase/backend
    - notificaciones
    - bandeja de entrada
    - calendario
6. Revisar y solucionar:
    - race conditions
    - doble creación de citas
    - timezone bugs
    - estados inconsistentes
    - citas fantasmas
    - slots duplicados
    - citas fuera de horario
    - citas superpuestas

UNIFICACIÓN DE AGENDAS con calendar

Todas deben renderizar el mismo calendario/componente base y solo cambiar:

- permisos
- acciones disponibles
- validaciones
- estados visibles

NO más componentes independientes con lógica distinta.

REGLAS ROLE: COMPANY Y WORKER

Los roles company y worker:

- pueden crear citas libremente
- pueden bloquear horarios
- pueden confirmar citas
- pueden completar citas
- pueden reprogramar citas
- pueden marcar no-show
- pueden cancelar citas

Cada acción debe:

- actualizar estado de cita
- registrar timestamp
- guardar historial
- enviar notificación al client
- enviar mensaje a bandeja de entrada del client
- reflejarse en tiempo real en agenda

REPROGRAMACIÓN

Cuando se reprograma:

- mantener historial anterior
- registrar usuario que hizo el cambio
- enviar notificación automática
- mostrar fecha anterior y nueva
- permitir aceptación futura del cliente

NO-SHOW

Implementar:

- no_show_by_client
- no_show_by_business

COMPLETAR CITA

Al completar:

- guardar hora real de finalización
- permitir notas finales
- habilitar futura calificación/review

BLOQUEO DE HORARIO

El bloqueo:

- debe ocupar slots reales
- impedir reservas
- distinguirse visualmente
- permitir motivo del bloqueo

REGLAS ROLE: CLIENT

El cliente:

- NO puede reservar con menos de 2 horas de anticipación
- NO puede cancelar con menos de 2 horas de anticipación
- aplicar esta regla también para gimnasios

Ejemplo:

Si son las 13:00:

- NO puede reservar 14:00
- NO puede reservar 14:59

El cálculo debe ser exacto usando datetime real, no solo horas.

CLIENT GYM

Mantener lógica de:

- cliente estático
- cliente dinámico
- tipos de plan

Validar:

- límites de reservas
- cupos por plan
- expiración de plan
- días permitidos
- horarios permitidos

OTROS NEGOCIOS

Clientes generales:

- siguen reglas estándar
- pueden solicitar citas
- pueden cancelar dentro del tiempo permitido
- pueden reprogramar solo si negocio lo permite

VALIDACIONES IMPORTANTES

Crear sistema centralizado de validaciones:

- overlap de horarios
- horario laboral
- duración mínima
- duración máxima
- trabajador disponible
- negocio disponible
- feriados futuros
- bloqueo activo
- plan válido
- capacidad disponible
- cita pasada
- timezone correcto
- citas simultáneas

MEJORAS IMPORTANTES PARA EL CORE

Implementa además:

1. Estados de cita robustos:
- pending
- confirmed
- rescheduled
- completed
- cancelled
- no_show
- blocked
1. Historial completo de eventos
2. Auditoría de cambios
3. Optimistic updates
4. Rollback si falla backend
5. Prevención de doble tap
6. Debounce en creación
7. Locks temporales de slot
8. Actualización realtime
9. Cache inteligente
10. Skeleton loaders
11. Manejo offline parcial
12. Retry automático
13. Logs claros para debugging

NOTIFICACIONES

Cada acción importante debe:

- crear notificación
- crear mensaje en inbox
- actualizar badge
- incluir metadata útil

UI/UX OBLIGATORIO

La agenda debe sentirse premium y extremadamente fluida:

- animaciones suaves
- feedback háptico
- cero flickering
- cero recargas bruscas
- transición limpia entre estados
- loading elegante
- scroll ultra fluido

IMPORTANTE

NO rompas el diseño actual.

NO cambies el estilo visual del modal.

NO hagas refactors parciales.

NO dejes lógica vieja coexistiendo con la nueva.

Necesito:

- refactor completo
- arquitectura sólida
- componente único
- lógica desacoplada
- escalabilidad futura
- código mantenible
- performance optimizada

Usa como BASE PRINCIPAL el componente `AppointmentFormModal` actual y conviértelo en el único sistema de creación/edición de citas de toda la aplicación.

Definir reglas completas y centralizadas para el CORE de citas según rol. El sistema debe funcionar como una plataforma profesional de reservas y operación diaria. Todas las reglas deben ser reutilizables y desacopladas de la UI.

# ROLES DEL SISTEMA

- client
- worker
- company

Cada rol debe tener:

- permisos claros
- restricciones
- acciones válidas
- estados visibles
- límites operacionales
- auditoría de acciones

---

## ROLE: COMPANY

El rol `company` es el administrador principal del negocio.

PERMISOS:

- crear citas manualmente
- editar cualquier cita
- confirmar citas
- completar citas
- cancelar citas
- reprogramar citas
- marcar no-show
- bloquear horarios
- desbloquear horarios
- reasignar worker
- modificar duración
- modificar precio
- crear sobrecupos si el negocio lo permite
- aprobar o rechazar solicitudes
- gestionar horarios del negocio
- gestionar disponibilidad de workers
- gestionar servicios
- gestionar planes gym
- ver métricas y analytics
- ver historial completo
- enviar mensajes masivos
- activar/desactivar reservas automáticas

REGLAS:

- puede crear citas en cualquier horario válido
- puede cancelar incluso fuera del margen de 2h
- puede sobreescribir restricciones normales
- no puede generar overlapping si el negocio no lo permite
- toda modificación debe quedar auditada
- toda acción debe generar notificación al client

ESTADOS VISIBLES:

- pending
- confirmed
- completed
- cancelled
- no_show
- blocked
- rescheduled

ACCIONES IMPORTANTES:

- si reprograma:
    - guardar fecha antigua y nueva
    - registrar motivo
    - enviar notificación
    - actualizar inbox client
- si cancela:
    - registrar motivo
    - registrar quién canceló
    - liberar slot automáticamente
- si marca no-show:
    - registrar responsable
    - afectar métricas del cliente
- si completa:
    - guardar hora real de término
    - permitir agregar observaciones

FUNCIONALIDADES EXTRA:

- vista diaria/semanal/mensual
- drag & drop de citas
- filtros por worker
- filtros por servicio
- filtros por estado
- heatmap de ocupación
- exportación futura
- métricas de asistencia
- detección de horarios muertos

---

## ROLE: WORKER

El rol `worker` es el profesional operativo.

PERMISOS:

- ver solo sus citas
- confirmar citas
- completar citas
- cancelar citas
- reprogramar citas
- marcar no-show
- bloquear horarios propios
- agregar notas internas
- gestionar descansos
- configurar disponibilidad propia

RESTRICCIONES:

- no puede editar configuración global
- no puede modificar workers ajenos
- no puede acceder a analytics administrativos
- no puede alterar reglas del negocio

REGLAS:

- puede crear citas manualmente si el negocio lo permite
- puede mover citas solo dentro de su disponibilidad
- toda modificación debe notificar al client
- no puede generar overlaps
- bloqueos deben respetar horario empresa

ESTADOS VISIBLES:

- pending
- confirmed
- completed
- cancelled
- no_show
- blocked
- rescheduled

ACCIONES:

- completar cita
- agregar notas internas
- marcar llegada cliente
- marcar cliente atrasado
- iniciar cita
- finalizar cita

FUNCIONALIDADES EXTRA:

- indicador de próxima cita
- tiempo restante
- pausas/breaks
- vista rápida del día
- acceso rápido a confirmaciones
- disponibilidad temporal
- modo ocupado/no disponible

---

## ROLE: CLIENT

El rol `client` es el consumidor final.

PERMISOS:

- crear solicitudes de cita
- cancelar citas
- reprogramar citas si negocio lo permite
- ver historial
- ver próximas citas
- recibir notificaciones
- enviar mensajes
- guardar notas personales
- calificar servicios futuros

RESTRICCIONES:

- NO puede reservar con menos de 2h
- NO puede cancelar con menos de 2h
- NO puede generar overlaps propios
- NO puede reservar fuera del horario negocio
- NO puede modificar citas completadas
- NO puede editar citas ajenas

REGLAS GENERALES:

- validación exacta por datetime
- timezone consistente
- prevenir spam de reservas
- debounce en reservas
- evitar doble click

LÓGICA DE RESERVA:

- si horario ya ocupado:
    - impedir creación
- si worker no disponible:
    - impedir creación
- si negocio cerrado:
    - impedir creación
- si slot bloqueado:
    - impedir creación

REPROGRAMACIÓN:

- permitida solo si:
    - negocio lo habilita
    - faltan más de 2h
    - existe disponibilidad

CANCELACIÓN:

- permitida solo si:
    - faltan más de 2h
- si no:
    - mostrar mensaje claro

ESTADOS VISIBLES:

- pending
- confirmed
- cancelled
- completed
- rescheduled

NO debe ver:

- bloqueos internos
- notas internas
- analytics internos

---

## ROLE CLIENT - GYM

Los gimnasios tienen lógica especial.

TIPOS:

- cliente estático
- cliente dinámico

VALIDACIONES:

- cupos máximos
- límite semanal
- límite mensual
- horarios permitidos
- plan activo
- fecha expiración plan
- acceso según plan
- clases permitidas
- capacidad por clase

REGLAS:

- respetar regla de 2h
- impedir reservas fuera del plan
- impedir sobrecupos
- impedir duplicados
- validar asistencia

FUNCIONALIDADES:

- lista espera
- cupos restantes
- check-in QR futuro
- penalización por no-show
- recuperación de clases
- historial asistencia

---

## ESTADOS DEL SISTEMA

Definir máquina de estados robusta.

FLOW:

pending

→ confirmed

→ completed

OTROS:

pending → cancelled

confirmed → cancelled

confirmed → no_show

confirmed → rescheduled

rescheduled → confirmed

REGLAS:

- completed es terminal
- cancelled libera slot
- blocked ocupa slot
- no_show afecta métricas

---

## NOTIFICACIONES

Toda acción importante debe generar:

- push notification
- inbox notification
- realtime update
- badge update

EVENTOS:

- cita creada
- cita confirmada
- cita cancelada
- cita reprogramada
- cita completada
- no-show
- recordatorio próximo

---

## RECORDATORIOS

Implementar:

- 24h antes
- 2h antes
- “ya comenzó”
- “cita finalizada”

---

## PROTECCIONES IMPORTANTES

Implementar:

- anti doble reserva
- optimistic updates
- rollback
- retry automático
- locks temporales
- validación realtime
- sincronización agenda
- prevención race conditions

---

## EXPERIENCIA PREMIUM

La agenda debe sentirse:

- instantánea
- fluida
- estable
- consistente

NO permitir:

- flickering
- refreshes bruscos
- estados fantasmas
- loaders eternos
- inconsistencias visuales

Toda acción debe tener:

- feedback háptico
- animación suave
- loading elegante
- confirmación visual inmediata