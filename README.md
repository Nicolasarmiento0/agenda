# 📅 Agenda — Plataforma Premium de Agendamiento, Historial de Ingresos y CRM para PyMEs

> **¡MVP 100% COMPLETADO Y OPERATIVO!** 🚀  
> **La solución profesional definitiva de agendamiento y administración para negocios modernos.**  
> Diseñada con una estética high-tech de alto impacto (Obsidian & Neon Volt Lime UI), esta aplicación permite a barberías, salones, consultorios y centros deportivos gestionar su operación diaria mientras ofrecen una experiencia interactiva y premium de clase mundial.

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
- **Módulo de CRM & Historial Financiero:** Consulta de ingresos históricos y citas completadas con filtros por rangos y filtros especializados por empleado ([company-history.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-history.tsx)).
- **Gestión de Personal & Catálogos:** Control detallado de empleados ([company-employees.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-employees.tsx)), servicios ([company-services.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-services.tsx)), y ventanas horarias ([company-booking-window.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-booking-window.tsx)).
- **Control de Membresías:** Panel administrativo para dar de alta y seguir planes y clases consumidas por socios ([company-members.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/company/company-members.tsx)).

### 🛠️ 3. Profesionales y Colaboradores (`worker`)
- **Dashboard de Trabajo:** Vista focalizada e individual con su agenda diaria, indicadores personales y valoraciones ([worker-dashboard.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/worker/worker-dashboard.tsx)).
- **Historial de Comisiones & Reporte:** Registro de servicios completados de forma exclusiva e ingresos acumulados en el tiempo con navegación temporal de periodos ([worker-history.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/worker/worker-history.tsx)).

### 🛡️ 4. Administradores de la Plataforma (`admin`)
- **Supervisión Global:** Métricas de crecimiento general, negocios activos y volumen de transacciones de la plataforma ([admin-dashboard.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/admin/admin-dashboard.tsx)).
- **Auditoría & Moderación:** Flujo de aprobación y control de calidad de comercios solicitantes ([admin-businesses.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/app/screens/roles/admin/admin-businesses.tsx)).

---

## 💎 Características Estrella del MVP Completado

### 📊 1. Módulo CRM de Ingresos & Historial Consistente
* **Cálculo de Ingresos Reales:** Suma acumulada basada única y estrictamente en las citas con estado `'completed'`.
* **Filtros de Rangos Estrictos:** Limites cerrados mediante consultas dinámicas en Supabase (`.eq` para día seleccionado; `.gte` y `.lte` para rangos semanales y mensuales). Evita la fuga de ingresos o fechas futuras.
* **Filtros Cruzados:** Las empresas pueden cruzar el periodo seleccionado con un profesional en particular para obtener reportes de productividad instantáneos.

### 📅 2. Navegador Temporal por Periodos
* **Navegación Interactiva:** Contenedores horizontales de diseño glassmorphic con botones Feather (`chevron-left` / `chevron-right`) para desplazarse de forma infinita hacia atrás o adelante en el tiempo (días anteriores, semanas previas, meses pasados).
* **Labels Amigables en Español:** Formateo local descriptivo automático (Ej: *"Lunes, 25 de Mayo, 2026"*, *"18 - 24 de Mayo, 2026"*, *"Mayo 2026"*).

### 🔒 3. Bloqueo de Horarios con Rango Flexible
* **Selector Dinámico Desde / Hasta:** Al inhabilitar bloques en el calendario (`isBlockedSlot` en [AppointmentModal.tsx](file:///Users/nico/Desktop/Workspace/my-app/myapp/components/calendar/AppointmentModal.tsx)), se habilitan dos selectores de tiempo `TimeWheelPicker` independientes para elegir la hora de inicio y término con total precisión.
* **Validación de Consistencia Temporal:** El sistema verifica que la hora de término sea posterior a la de inicio e impide el guardado de bloques inconsistentes.
* **Sincronización Inteligente:** Si la hora "Desde" es movida después de la hora "Hasta", esta última se auto-ajusta 1 hora adelante para mantener el flujo de usuario limpio.

### 🌐 4. Consistencia Absoluta de Zona Horaria (Fecha Local)
* **Eliminación de Desfases UTC/ISO:** Lógica de formateo puramente local en formato `YYYY-MM-DD` que previene el desplazamiento de días, garantizando que el calendario y los filtros operen exactamente en el huso horario local.

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
- [**Estado del Proyecto**](./estado_proyecto.md) — Progreso del MVP, funcionalidades completadas y roadmaps.
- [**Filosofía y Objetivos**](./QUE-ES-Y-OBJETIVO.md) — Análisis detallado del valor de negocio y flujos principales.
- [**Arquitectura de Creación de Citas**](./solución-crear-citas.md) — Estándares técnicos aplicados al core de reservas.

---

## 📬 Contacto & Soporte
Desarrollado con dedicación y enfoque en la excelencia por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0).  
*Haciendo de la gestión comercial y agendamiento una experiencia fluida, rápida y sumamente visual.*