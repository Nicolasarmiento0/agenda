Es un software de gestión en la nube (SaaS) diseñado específicamente para negocios que dependen de la reserva de horas y la atención al público, como salones de belleza, barberías, centros de estética, spas, clínicas de salud y centros deportivos.

Sus características principales se centran en automatizar la administración del local:

**Agenda online:** Un portal web o enlace para que los clientes reserven, modifiquen o cancelen sus propias citas de forma autónoma las 24 horas del día.

**CRM (Gestión de clientes):** Mantenimiento de una base de datos con el historial de atenciones, preferencias, compras y datos de contacto de cada usuario.

#### MarketPlace lugares y poder evaluar

Gestión de clientes CRM

- Base de datos
- Historial de servicios y preferencias
- Ficha del cliente
- Promociones personalizadas
- Control de sesiones y tratamientos

### **🔴 ¿Qué problema resuelve?**

1. **Pérdida de tiempo y fricción operativa:** Elimina la necesidad de coordinar citas de forma manual por canales informales (como llamadas telefónicas o chats de mensajería instantánea), automatizando todo el flujo de reserva 24/7.
2. **Inasistencias y cancelaciones de última hora:** Protege el tiempo de los profesionales implementando **reglas de negocio inteligentes**, como la imposibilidad de cancelar una cita si faltan menos de 2 horas para la misma.
3. **Falta de visibilidad y control para PyMEs:** Las empresas suelen batallar para gestionar agendas de múltiples empleados en un solo lugar. La app consolida calendarios multi-trabajador con control de estados en tiempo real.
4. **Experiencia de usuario fragmentada:** Ofrece a los clientes finales una aplicación unificada donde pueden explorar diferentes negocios, gestionar todas sus citas de forma transparente y recibir actualizaciones fluidas.

---

### **⚙️ Funcionalidades Principales por Rol**

La plataforma utiliza una arquitectura **Multi-Tenant**, aislando la información de cada negocio y usuario mediante políticas de seguridad de nivel de fila (**RLS** - *Row Level Security*) en Supabase, y cuenta con cuatro roles de acceso especializados:

### **1. 👤 Para Clientes Finales (`client`)**

- **Exploración y Descubrimiento (`explore.tsx`):** Motor de búsqueda para descubrir negocios locales registrados en la plataforma.
- **Perfil de Negocio (`client-business-profile.tsx`):** Vista detallada del negocio con su catálogo de servicios, precios, duración de los mismos, miembros del equipo e información de contacto o localización.
- **Reserva en Segundos (`client-agenda.tsx`):** Proceso de agendamiento directo donde el cliente selecciona el servicio deseado, el profesional de su preferencia y visualiza las franjas horarias disponibles en tiempo real sin solapamientos.
- **Gestión de Citas (`my-appointments.tsx`):** Panel para dar seguimiento a citas activas, revisar el historial de visitas y gestionar cancelaciones permitidas según las políticas del local.

### **2. 🏢 Para Empresas / Dueños de Negocio (`company`)**

- **Configuración y Onboarding (`business-setup.tsx`):** Flujo para dar de alta el negocio ingresando logotipo, descripción, ubicación GPS, redes sociales y horarios generales.
- **Dashboard Operativo (`dashboard-company.tsx`):** Panel gerencial con métricas de rendimiento del día, próximas citas y resumen de ingresos.
- **Agenda Inteligente (`company-agenda.tsx`):** Vista de calendario integral que consolida las citas de todo el personal, permitiendo cambiar estados del turno (pendiente, confirmado, completado, cancelado, noshow). Por ahora existe un botón con el cual se crean las citas, megustaria que exista la función de presioanar dentro del horairio por ej: en la vista de dia o semanal, presiono las 10:00 y me permita crear la cita si es que fuese posible si hubiese ya una cita ver los detalles como se hace ahora.
- **Agenda Inteligente (`company-agenda.tsx`):** Dejar definido horario disponible en caso de ser gimnasio poder mensualmente mostrar disponibilildad. Por ejemplo de 06:00 a 13:00 primer bloque y luego segundo bloque desde las 17:00 a 22:00. Debe Tener en el dashboard-company la opción donde modificar a gusto estos horarios.
- **Catálogo de Servicios (`company-services.tsx`):** Altas, bajas y modificaciones de servicios con tarifas personalizadas y duraciones configurables.
- **Gestión de Personal y Horarios (`company-employees.tsx`, `company-members.tsx`):** Administración del equipo de trabajo, asignando qué servicios puede realizar cada empleado y definiendo sus horarios específicos.

### **3. 🛠️ Para Empleados / Profesionales (`worker`)**

- **Dashboard Personal (`worker-dashboard.tsx`):** Vista rápida para el empleado con sus indicadores individuales (citas pendientes, ingresos generados y valoración del negocio).
- **Agenda Focalizada (`worker-agenda.tsx`):** Vista exclusiva de su calendario diario/semanal para que se concentre en sus propios clientes asignados.
- **Historial de Servicios (`worker-history.tsx`):** Registro de todos los servicios completados y comisiones o desempeño a lo largo del tiempo.

### **4. 🛡️ Para Administradores de la Plataforma (`admin`)**

- **Supervisión del Ecosistema (`admin-dashboard.tsx`):** Métricas globales de crecimiento de la plataforma, número de negocios activos y volumen general de reservas.
- **Control de Calidad y Moderación (`admin-businesses.tsx`, `admin-business-detail.tsx`):** Flujo de aprobación y auditoría de nuevos comercios que solicitan ingresar a la plataforma, asegurando el cumplimiento de los estándares de calidad.

