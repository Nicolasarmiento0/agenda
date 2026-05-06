He actualizado el archivo estado actual.md para reflejar la implementación exitosa del sistema de Pull-to-Refresh Global y he refinado el roadmap hacia el MVP.

📋 Sugerencias para completar el MVP (Basado en la Visión de Producto)
Tras comparar el estado actual con el documento de visión, aquí tienes los puntos clave que faltan para cerrar el círculo del MVP:

Horarios de Apertura:
Problema: La agenda permite citas desde las 05:00 AM hasta las 12:00 PM sin importar el horario real del negocio.
Acción: Agregar campos opening_time y closing_time a la tabla businesses y validar que el cliente solo pueda elegir horas dentro de ese rango.

Filtros en el Explorador:
Problema: El cliente ve una lista plana de negocios.
Acción: Implementar el filtrado por categorías (Barbería, Estética, etc.) usando la tabla service_categories que ya existe en la base de datos.

Nota: Vi que realizaste cambios en la lógica de redirección. Hay algunas redundancias en los if de roles que podrían causar conflictos o saltos visuales. Te sugiero unificar esa lógica en un solo bloque switch o if/else más limpio para evitar que el router intente ir a dos lugares a la vez.
