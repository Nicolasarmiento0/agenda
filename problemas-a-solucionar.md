# prompts-tareas-app.md

# Prompts para Agente IA — Sistema de Agenda / SaaS

# 1. Ingresos company y worker

## Objetivo
Mostrar ingresos correctamente para company y worker.

## Tareas
- Calcular:
  - ingresos diarios
  - semanales
  - mensuales
  - totales
- Verificar filtros por fecha.
- Revisar timezone.
- Validar cálculos de citas completadas.
- Optimizar queries.
- Agregar loading states.
- Reiniciar conteo al iniciar un nuevo mes, guardar en el historial la información de ingresos de todos los meses.

## Resultado esperado
- Los ingresos coinciden correctamente con servicios realizados.
---

# 2. Mini calendario al cambiar fecha

## Objetivo
Permitir cambiar fecha desde crear cita usando mini calendario mensual.

## Tareas
- Agregar date picker visual.
- Compatible iOS/Android/Web.
- Mantener diseño moderno.
- Permitir navegación mensual rápida.

## Resultado esperado
- El usuario puede seleccionar fecha fácilmente.
---

# 3. Loading states globales

## Objetivo
Agregar estados de carga visuales para todas las screens.

## Tareas
- Crear sistema global reusable:
  - skeletons
  - spinners
  - placeholders
- Integrar en:
  - calendar
  - dashboard
  - business
  - appointments
- Evitar pantallas vacías y carga de pantallas que se demoran en entrar.

## Resultado esperado
- Toda la app tiene feedback visual mientras carga.

---

# 4. Navegar desde Mis Citas al calendario

## Objetivo
Permitir abrir cita directamente en calendar desde “Mis Citas” opción valida para rol client.

## Tareas
- Navegar hacia:
  - fecha correcta
  - worker correcto
  - cita resaltada
- Mantener animación fluida.

## Resultado esperado
- El usuario llega directamente a la cita seleccionada en calendar.
---

# 5. Mejorar navegación “Mi negocio”

## Objetivo
Corregir falta de fluidez al ingresar a “Mi negocio” desde sidebar.

## Tareas
- Revisar navegación.
- Optimizar renders innecesarios.
- Implementar lazy loading si aplica.
- Mejorar transición.

## Resultado esperado
- Navegación rápida y fluida.

---

# 6. Bandeja de entrada global

## Objetivo
Crear sistema de inbox/notificaciones para todos los roles.

## Tareas
- Implementar bandeja de entrada.
- Soportar:
  - cita creada
  - confirmada
  - cancelada
  - reprogramada
  - completada
  - no-show
- Compatible con:
  - client
  - worker
  - company
- Persistencia en Supabase.
- Marcar leído/no leído.
- Optimizar realtime.

## Resultado esperado
- Todos los roles reciben notificaciones correctamente.

---

# 7. Mejorar appointModal

MODO CLARO, COLORES DE AGENDAR CITA Y BLOQUEAR HORARIO.
---

# 8. Solucionar creación de citas para negocios gym

## Objetivo
Corregir la lógica de creación de citas para negocios tipo gym.

## Tareas
- Revisar reglas de negocio gym.
- Validar:
  - cupos
  - horarios
  - trainers/workers
  - clases grupales
- Revisar conflictos de agenda.
- Verificar duración automática.
- Validar timezone.
- Corregir persistencia.

## Resultado esperado
- Las citas gym funcionan correctamente en todos los escenarios.