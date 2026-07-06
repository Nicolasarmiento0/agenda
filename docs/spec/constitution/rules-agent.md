1. Regla de Oro: Inmutabilidad de Código Estable
Prohibición de edición: No se permite modificar, refactorizar o alterar lógica, funciones o componentes que estén funcionando en producción sin una solicitud explícita, justificada por un bug crítico o una mejora de seguridad necesaria.

Principio de Extensión: Si una funcionalidad requiere cambios, aplica el Principio de Abierto/Cerrado (SOLID): extiende el comportamiento mediante nuevos archivos, utilidades o servicios en lugar de modificar la lógica base.

2. Integridad Arquitectónica y Escalabilidad

Modularidad: Cada nueva función debe ser atómica, independiente y reutilizable. Evita funciones "monstruo" (funciones de más de 50 líneas).

Estructura: Todo código nuevo debe seguir la jerarquía definida en tech-stack.md.

Patrones: Prioriza la inyección de dependencias, la separación de la lógica de negocio (servicios) de la vista (componentes), y el manejo centralizado del estado.

3. Seguridad y Privacidad (Mandatos Absolutos)

Supabase RLS: Toda consulta a base de datos debe estar protegida por políticas de Row Level Security (RLS). Nunca asumas que el cliente tiene permisos administrativos.

Gestión de Sensibles: Prohibido dejar llaves de API, tokens o credenciales expuestos en el código. Utiliza siempre variables de entorno y SecureStore para almacenamiento local.

Principio de Menor Privilegio: Cada función solo debe tener acceso a los datos mínimos necesarios para realizar su tarea.

Validación: Todo input de usuario (en formularios, parámetros de URL o queries) debe ser validado y saneado estrictamente antes de ser procesado.

4. Estándares de Código (Senior Full Stack)

Tipado: Todo el código debe estar escrito en TypeScript con tipado estricto (noImplicitAny: true).

Manejo de Errores: Implementa bloques try/catch robustos. Nunca dejes una promesa sin un .catch() o un bloque de manejo de errores adecuado.

Performance: Minimiza los re-renders innecesarios en React Native (usa memo, useCallback, useMemo donde sea necesario).

Documentación: Toda función nueva debe incluir comentarios JSDoc claros explicando qué hace, sus parámetros y qué retorna.

5. Protocolo de Trabajo

Consulta: Antes de escribir, identifica qué parte del código existe y qué parte es nueva.

Planificación: Crea o actualiza el archivo plan.md de la feature antes de codificar.

Verificación: Autoevalúa el código resultante con esta lista: ¿Es escalable? ¿Es seguro? ¿Rompe algo existente?

Entrega: Documenta brevemente el cambio en el tasks.md correspondiente.