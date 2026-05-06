# 📝 Estado Actual del Proyecto — Agenda PyME

Este documento detalla el progreso actual del desarrollo, las funcionalidades operativas y los próximos pasos inmediatos.

## 🚀 Últimas Actualizaciones (Tesla Style UI)

### 🏢 Gestión de Negocio (Empresa)
- **Perfil de Negocio:** Implementado sistema de edición completa. Las empresas pueden subir su logo (Storage Supabase), agregar una descripción "Acerca de" estilo LinkedIn y vincular su ubicación de Google Maps.
- **Pull-to-Refresh:** Implementado el gesto de "arrastrar para actualizar" en la pantalla de gestión del negocio para obtener datos frescos de Supabase al instante.
- **Navegación Dinámica:** Botones de Maps funcionales que abren directamente la aplicación de navegación del dispositivo.

### 📅 Sistema de Citas y Agenda (Cliente)
- **Agenda Interactiva:** Los clientes pueden ver la disponibilidad de las barberías/negocios aprobados.
- **Privacidad:** Implementada lógica de "enmascaramiento". Los clientes solo ven sus propios detalles de cita; las citas de otros usuarios aparecen simplemente como "Reservado".
- **Regla de 2 Horas:** Restricción estricta de cancelación. Los clientes no pueden cancelar una cita si faltan menos de 120 minutos para el encuentro.
- **Mis Citas:** Nueva pantalla con pestañas para citas "Próximas" e "Historial", con estados visuales (Pendiente, Confirmado).
- **Estabilización de Imágenes:** Sistema de subida unificado y corregido para Perfil y Logo de Negocio. Soporte multiplataforma completo (Nativo y Web) eliminando errores de `Content-Type` y de red.
- **Seguridad y RLS:** Implementación de políticas de Row-Level Security para el bucket de `avatars`, asegurando que cada usuario solo pueda gestionar sus propios archivos.

---

## ✅ Funcionalidades Operativas

### 🔐 Autenticación y Roles
- **Multi-Rol:** Sistema de tres roles (Client, Company, Admin) con flujos de redirección automáticos al iniciar sesión.
- **AuthContext:** Estado global que maneja sesión, perfil y datos del negocio vinculado.

### 💼 Módulo Administrador
- **Dashboard Admin:** Vista de estadísticas globales.
- **Aprobación de Negocios:** Sistema para revisar, aprobar o rechazar nuevas solicitudes de empresas.

### 💈 Módulo Empresa
- **Business Setup:** Registro inicial del negocio tras elegir el rol.
- **Gestión de Agenda:** Vista de calendario para gestionar turnos por trabajador.
- **Servicios y Empleados:** CRUD completo para gestionar el catálogo de servicios y el equipo de trabajo.

### 📱 Módulo Cliente
- **Explorador:** Vista de negocios disponibles (Próximamente búsqueda global).
- **Agendamiento:** Selección de trabajador, servicio, fecha y hora.

---

## 🛠️ Stack Tecnológico
- **Frontend:** React Native (Expo) con TypeScript.
- **Navegación:** Expo Router (File-based).
- **Backend:** Supabase (Auth, Database, Storage).
- **Diseño:** Tesla-inspired (Dark Mode por defecto, tipografía limpia, rojo Tesla #E31937 como color primario).
- **Seguridad:** Políticas RLS (Row Level Security) aplicadas en todas las tablas y buckets de Storage.

---

## 🚧 Próximos Pasos (Roadmap Inmediato)
1. **Pull-to-Refresh Global:** Extender la funcionalidad de actualización manual a todas las pantallas clave (Citas, Servicios, Empleados, Admin).
2. **Explorador Avanzado:** Implementar búsqueda global y filtrado de negocios por categoría y cercanía.
3. **Notificaciones:** Integrar sistema de avisos push para confirmaciones y recordatorios de citas.
4. **Dashboard de Analíticas:** Mejorar la visualización de datos para el rol de Empresa (ingresos, citas por empleado, etc.).
