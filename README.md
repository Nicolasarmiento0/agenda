# 📅 Agenda — Reservas para PyMEs

> **La solución profesional de agendamiento para negocios modernos.**  
> Inspirada en la estética minimalista y potente de Tesla, esta aplicación permite a barberías, salones y consultorios gestionar su día a día mientras ofrecen una experiencia premium a sus clientes.

**Stack:** React Native · Expo · Supabase · TypeScript · Tesla-Inspired UI

---

## 🚀 Vision General

**Agenda** transforma la gestión de turnos eliminando la fricción del contacto manual. Centraliza todo el flujo de trabajo en una plataforma robusta con tres perfiles especializados:

### 👤 Para Clientes
- **Reserva en segundos:** Agendamiento directo seleccionando servicio y profesional.
- **Transparencia:** Visualización de la agenda en tiempo real con privacidad protegida.
- **Control Total:** Dashboard de "Mis Citas" para gestionar cancelaciones y ver historial.

### 🏢 Para Empresas
- **Gestión 360°:** Control total sobre el catálogo de servicios, personal y horarios.
- **Perfil Personalizado:** Espacio de marca con logo, descripción y ubicación GPS.
- **Agenda Inteligente:** Vista de calendario multi-trabajador con estados de cita.

### 🛡️ Para Administradores
- **Control de Calidad:** Supervisión y aprobación de nuevos negocios en la plataforma.
- **Métricas:** Visualización del crecimiento y estado del ecosistema.

---

## ✨ Características Destacadas

- **Estética Tesla:** Interfaz en modo oscuro profundo, tipografía limpia y acentos en Rojo Tesla (#E31937).
- **Seguridad Robusta:** Implementación de RLS (Row Level Security) en Supabase para proteger los datos de cada negocio y cliente.
- **Experiencia Nativa:** Pull-to-Refresh estilo Instagram, animaciones fluidas y navegación intuitiva con Expo Router.
- **Reglas de Negocio Inteligentes:** Restricciones automáticas de cancelación (2h previas) para proteger el tiempo de los profesionales.

---

## 📁 Estructura del Proyecto

```
agenda/
├── app/               # Pantallas y rutas (Admin, Client, Company)
├── components/        # Componentes UI (Sidebar, Agenda, Modales)
├── context/           # Estado Global (Auth, Theme, Contexto unificado)
├── docs/              # Documentación técnica detallada
├── lib/               # Configuración Supabase y utilidades
├── styles/            # Sistema de diseño y tokens visuales
└── assets/            # Recursos visuales y logos
```

---

## 🛠️ Instalación y Desarrollo

### Requisitos
- Node.js 18+
- Expo CLI
- Base de Datos [Supabase](https://supabase.com)

### Configuración Rápida
1. **Clonar e Instalar:**
   ```bash
   git clone https://github.com/Nicolasarmiento0/agenda.git
   cd agenda
   npm install
   ```
2. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=tu_url_aqui
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```
3. **Ejecutar:**
   ```bash
   npx expo start
   ```

---

## 📄 Documentación Adicional
- [**Estado Actual**](./estado%20actual.md) — Reporte de progreso y roadmap inmediato.
- [**Fases de Desarrollo**](./docs/07-funcionalidades.md) — Plan detallado del proyecto.

---

## 📬 Contacto
Desarrollado con ❤️ por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0).  
*Un proyecto enfocado en la excelencia visual y operativa.*