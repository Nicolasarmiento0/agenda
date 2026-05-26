# Plan de Implementación: Corrección de Consistencia y Navegación en Historial de Ingresos

Este plan detalla los cambios para solucionar las inconsistencias de fechas y montos en el historial de ingresos de la empresa (`company-history.tsx`) y del trabajador (`worker-history.tsx`), asegurando que solo se cuenten citas completadas, que se aplique un límite superior estricto en las consultas de Supabase para evitar fugas de fechas futuras, y que se añada un navegador interactivo de periodos (días, semanas y meses anteriores).

## User Review Required

> [!IMPORTANT]
> - **Cálculo de Fechas Local Sin Desfases de Zona Horaria**: En lugar de usar `.toISOString()`, que convierte la fecha local a UTC y desplaza la fecha (causando que en zonas horarias de América del Sur/Norte el filtro de "hoy" muestre citas de mañana), implementaremos un generador de strings de fecha puramente local (`YYYY-MM-DD`).
> - **Límite Superior en Consultas (`.lte`)**: Actualmente, la consulta solo restringe con `.gte('date', startDate)`. Esto hace que al filtrar por "Hoy" se muestre hoy y todas las citas futuras. Implementaremos un límite superior estricto (`.lte`) para cada periodo (día actual para 'day', fin de semana para 'week', fin de mes para 'month').
> - **Navegación de Periodos Anteriores/Siguientes**: Introduciremos un componente de navegación visual minimalista (con chevrons de Feather y etiquetas descriptivas como `"Enero 2026"`, `"25 de Mayo, 2026"` o `"18 - 24 de Mayo, 2026"`). Esto permite navegar libremente hacia atrás y adelante en el tiempo, cumpliendo a la perfección con la solicitud de "poder filtrar para meses anteriores".
> - **Consistencia de Conteo**: El conteo de servicios realizados y el total de ingresos mostrará y sumará exclusivamente citas cuyo estado sea `'completed'`.

## Proposed Changes

### Pantalla de Historial de Empresa

---

#### [MODIFY] [company-history.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-history.tsx)

1. **Definir Estados y Utilidades de Fecha Local**:
   - `anchorDate`: Estado tipo `Date` inicializado a `new Date()` (fecha de hoy). Representa el punto de referencia temporal para la navegación.
   - `toLocalDateString(date)`: Formatea un objeto `Date` a string `YYYY-MM-DD` local.
   - `getStartOfWeek(date)`: Retorna el lunes de la semana del `anchorDate`.
   - `getEndOfWeek(startDate)`: Retorna el domingo de esa semana.
   - `getStartOfMonth(date)`: Retorna el 1 de ese mes.
   - `getEndOfMonth(date)`: Retorna el último día de ese mes.
2. **Formateadores Visuales de Periodo**:
   - `getPeriodLabel()`:
     - `'day'`: Retorna `"Lunes, 25 de Mayo, 2026"` (usando nombres locales de meses y días).
     - `'week'`: Retorna `"25 - 31 de Mayo, 2026"`.
     - `'month'`: Retorna `"Mayo 2026"`.
3. **Navegación Interactiva**:
   - `navigatePeriod(direction)`: Suma o resta 1 día, 1 semana (7 días) o 1 mes al `anchorDate` según el `timeRange` actual.
4. **Actualizar Query de Supabase en `fetchHistory`**:
   - Calcular rangos locales estrictos utilizando `anchorDate` en vez de `new Date()`.
   - Reemplazar la cláusula `.gte('date', startDate)` por:
     - Para `'day'`: `.eq('date', startDateStr)` (donde `startDateStr = toLocalDateString(anchorDate)`).
     - Para `'week'` y `'month'`: `.gte('date', startDateStr).lte('date', endDateStr)`.
   - Asegurar que la suma y renderizado mantengan el filtro `.eq('status', 'completed')` y que no se mezclen datos no completados en el total.
5. **Componente Visual del Navegador**:
   - Insertar un contenedor horizontal con fondo glassmorphic translúcido debajo del `SummaryCard` y arriba de los filtros.
   - Incluir botón izquierdo (`chevron-left`), etiqueta de periodo centrado en mayúsculas negrita, y botón derecho (`chevron-right`).

### Pantalla de Historial de Trabajador

---

#### [MODIFY] [worker-history.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/worker/worker-history.tsx)

1. **Definir Estados y Utilidades**:
   - Implementar el estado `anchorDate` e idénticas funciones utilitarias y formateadores que en la versión de empresa.
2. **Navegación Interactiva**:
   - Añadir la misma lógica de `navigatePeriod` y el componente de UI visualmente consistente.
3. **Actualizar Query de Supabase**:
   - Aplicar los límites estrictos `.eq('date', startDateStr)` o `.gte('date', startDateStr).lte('date', endDateStr)` sobre la consulta de citas del trabajador actual basándose en `anchorDate`.

## Verification Plan

### Verificación Estática
- Ejecutar `npx tsc --noEmit` en el workspace para certificar que no haya errores de tipado o sintaxis de TypeScript.

### Verificación Manual
1. **Prueba de "Hoy" (Day)**:
   - Seleccionar filtro "HOY". Verificar que solo se muestran citas del día actual seleccionado.
   - Usar el botón izquierdo (`chevron-left`) para ir a ayer y días previos. Verificar que se cargan correctamente las citas correspondientes a cada día exacto.
2. **Prueba de "Semana" (Week)**:
   - Seleccionar "SEMANA". Comprobar que el rango cubre exactamente de lunes a domingo.
   - Presionar `chevron-left` y verificar que el rango retrocede exactamente una semana y carga las citas de ese periodo.
3. **Prueba de "Mes" (Month)**:
   - Seleccionar "MES". Comprobar que muestra el mes actual completo.
   - Presionar `chevron-left` varias veces para navegar a meses anteriores (abril, marzo, febrero, etc.). Verificar que se muestran exclusivamente las citas del mes entero y los montos acumulados de forma consistente.
4. **Verificación de Filtro por Trabajador (Solo Empresa)**:
   - Verificar que al filtrar por un trabajador específico en combinación con la navegación temporal, las citas se reduzcan al profesional elegido del día/semana/mes en pantalla.
