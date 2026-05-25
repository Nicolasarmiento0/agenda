# 📅 Agenda — Plataforma Premium de Agendamiento y CRM para PyMEs

> **La solución profesional de agendamiento y administración para negocios modernos.**  
> Diseñada con una estética high-tech de alto impacto, esta aplicación permite a barberías, salones, consultorios y centros deportivos gestionar su operación diaria mientras ofrecen una experiencia interactiva y premium de clase mundial.

**Stack Tecnológico:** React Native · Expo (Router) · Supabase (PostgreSQL & RLS) · TypeScript · Obsidian & Neon Volt Lime UI

---

## 🚀 Visión General

**Agenda** automatiza la gestión de turnos eliminando la fricción de la coordinación manual. Opera bajo un esquema **Multi-Tenant** robusto, asegurando el aislamiento completo de los datos mediante políticas de seguridad de nivel de fila (**RLS**) en Supabase. Ofrece cuatro perfiles de acceso especializados para cubrir todo el flujo operativo:

### 👤 1. Clientes Finales (`client`)
- **Exploración y Descubrimiento:** Buscador interactivo para descubrir locales y comercios en la plataforma ([explore.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/global/explore.tsx)).
- **Perfil de Negocio Premium:** Visualiza catálogo de servicios, precios, duración, personal disponible y valoraciones ([client-business-profile.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/client/client-business-profile.tsx)).
- **Reserva Inteligente en Segundos:** Agendamiento dinámico seleccionando profesional, fecha y hora disponible en tiempo real con protección contra solapamientos.
- **Dashboard de Control:** Gestión y seguimiento de citas activas, cancelaciones permitidas e historial completo ([my-appointments.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/global/my-appointments.tsx)).
- **Módulo de Gimnasios & Planes:** Control dinámico de clases semanales para gimnasios, contadores de cupos y validez del plan (Básico, Premium, VIP) ([client-gym-plan.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/client/client-gym-plan.tsx)).

### 🏢 2. Empresas y Dueños de Negocio (`company`)
- **Onboarding Guiado:** Configuración inicial del comercio: logo, descripción, ubicación GPS y redes sociales ([business-setup.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/business-setup.tsx)).
- **Dashboard Gerencial:** Visualización en tiempo real de ingresos acumulados del mes, próximas citas y métricas analíticas clave ([dashboard-company.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/dashboard-company.tsx)).
- **Agenda Multitrabajador:** Vista unificada de calendario (diario/semanal) con control absoluto del estado del turno.
- **Gestión de Personal & Catálogos:** Control detallado de empleados ([company-employees.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-employees.tsx)), servicios ([company-services.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-services.tsx)), y ventanas horarias ([company-booking-window.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-booking-window.tsx)).
- **Control de Membresías:** Panel administrativo para dar de alta y seguir planes y clases consumidas por socios ([company-members.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-members.tsx)).

### 🛠️ 3. Profesionales y Colaboradores (`worker`)
- **Dashboard de Trabajo:** Vista focalizada e individual con su agenda diaria, indicadores personales y valoraciones ([worker-dashboard.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/worker/worker-dashboard.tsx)).
- **Historial & Comisiones:** Registro de servicios completados e ingresos generados a lo largo del tiempo ([worker-history.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/worker/worker-history.tsx)).

### 🛡️ 4. Administradores de la Plataforma (`admin`)
- **Supervisión Global:** Métricas de crecimiento general, negocios activos y volumen de transacciones de la plataforma ([admin-dashboard.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/admin/admin-dashboard.tsx)).
- **Auditoría & Moderación:** Flujo de aprobación y control de calidad de comercios solicitantes ([admin-businesses.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/admin/admin-businesses.tsx)).

---

## 🎨 Sistema de Diseño y Estilo Visual

La aplicación destaca por una interfaz moderna inspirada en interfaces futuristas oscuras:

- **Paleta Volt Lime & Obsidian:** 
  - **Fondo Principal:** Negro Obsidian profundo (`#0B0E14`) que maximiza el contraste de las pantallas OLED.
  - **Acento Primario:** Verde Limón de alta intensidad (`#B4F736`) para elementos interactivos, botones de acción y selecciones críticas.
  - **Textos Estructurados:** Tipografía limpia `F9FAFB` para contrastes fuertes y `9CA3AF` para detalles secundarios.
- **Glassmorphism Suite:**
  - Componentes robustos semi-transparentes creados a mano con gradientes suaves y bordes finos utilizando canales alfa (`glassColors`).
  - Integración nativa de hojas de estilo adaptables que detectan Light/Dark Mode mediante [ThemeContext](file:///Users/nico/Desktop/Workspace/my-app/myapp/context/ThemeContext.tsx).
- **Componentes de UI Reutilizables:**
  - [GlassCard.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/GlassCard.tsx) — Tarjetas vidriadas con efecto satinado.
  - [GlassInput.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/GlassInput.tsx) — Entradas de datos adaptables y estilizadas.
  - [GlassModal.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/GlassModal.tsx) — Modales flotantes de confirmación.
  - [ScreenHeader.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/ScreenHeader.tsx) — Encabezado global dinámico.
  - [TimeWheelPicker.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/TimeWheelPicker.tsx) — Selector de horario estilizado en formato de rueda.
  - [RevenueBarChart.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/company/RevenueBarChart.tsx) — Gráfico estilizado para ingresos financieros.

---

## 📅 Motor Centralizado de Agendas y Citas

Para evitar duplicaciones y fugas de lógica, la plataforma cuenta con una arquitectura de agendamiento unificada:

> [!IMPORTANT]
> **Componente Único de Agendamiento:**
> Toda la lógica de reservas y gestión de turnos está integrada en el componente unificado [CalendarScreen.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/calendar/CalendarScreen.tsx) y gestionada con [AppointmentModal.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/calendar/AppointmentModal.tsx). Se adapta dinámicamente según el rol (`client`, `company`, `worker`) y el tipo de negocio.

### Reglas de Negocio Inteligentes Integradas:
1. **Regla de las 2 Horas:** Los clientes no pueden agendar ni cancelar una cita con menos de 2 horas de anticipación.
2. **Máquina de Estados de Citas:** Control preciso de transiciones: `pending` ➔ `confirmed` ➔ `completed` | `cancelled` | `no_show` | `rescheduled` | `blocked`.
3. **Consistencia de Timezones:** Gestión estricta de fechas en formato ISO UTC para sincronizar de manera idéntica los calendarios de los locales y los teléfonos de los clientes.
4. **Protección Multitarea:** Evita solapamientos (overlapping) de trabajadores, bloquea de forma inteligente horarios personales (colaciones, descansos) y detiene la inyección de citas fantasmas.

---

## 📁 Estructura del Proyecto

El código está estructurado bajo principios de modularidad y escalabilidad:

```
agenda/
├── app/                        # Rutas de navegación (Expo Router)
│   ├── _layout.tsx             # Punto de entrada base y cargador de providers
│   ├── index.tsx               # Enrutador inteligente basado en roles de usuario
│   └── screens/
│       ├── global/             # Pantallas compartidas (Autenticación, explorar, citas)
│       └── roles/              # Módulos especializados por rol (admin, client, company, worker)
├── components/                 # Componentes interactivos del ecosistema
│   ├── ui/                     # Primitivas básicas de UI
│   ├── calendar/               # Calendario central, grid de turnos y formularios de citas
│   ├── client/                 # Modales y tarjetas para flujo de clientes
│   └── company/                # Formularios y gráficos financieros de empresa
├── context/                    # Estado global (Autenticación, Alertas, Temas visuales)
├── styles/                     # Sistema de tokens visuales y hojas de estilo (appStyles.ts)
├── lib/                        # Clientes externos e integraciones (Supabase)
├── hooks/                      # Ganchos lógicos personalizados de React
├── utils/                      # Formateadores, validadores de hora y utilidades generales
└── assets/                     # Recursos estáticos, imágenes, fuentes e iconos
```

---

## 🛠️ Instalación y Desarrollo

### Requisitos Previos
- **Node.js:** Versión 18 o superior.
- **Expo CLI:** Configuración global (`npm install -g expo-cli`).
- **Base de Datos:** Proyecto en [Supabase](https://supabase.com) configurado con el schema correspondiente.

### Configuración del Entorno
1. **Clonar el Repositorio e Instalar Dependencias:**
   ```bash
   git clone https://github.com/Nicolasarmiento0/agenda.git
   cd agenda
   npm install
   ```
2. **Configurar Variables de Entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tus credenciales:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=tu_proyecto_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_proyecto_supabase_anon_key
   ```
3. **Iniciar el Servidor de Desarrollo:**
   ```bash
   npx expo start
   ```
   *Puedes presionar `a` para abrir en el emulador de Android, `i` para iOS, o `w` para la versión web.*

---

## 📄 Documentos de Desarrollo e Historial
- [**Estado del Proyecto**](./estado_proyecto.md) — Progreso del MVP, funcionalidades pendientes y roadmaps.
- [**Filosofía y Objetivos**](./QUE-ES-Y-OBJETIVO.md) — Análisis detallado del valor de negocio y flujos principales.
- [**Arquitectura de Creación de Citas**](./solución-crear-citas.md) — Estándares técnicos aplicados al core de reservas.

---

## 📬 Contacto & Soporte
Desarrollado con dedicación y enfoque en la excelencia por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0).  
*Haciendo de la gestión comercial y agendamiento una experiencia fluida, rápida y sumamente visual.*