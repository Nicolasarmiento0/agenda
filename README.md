# 📅 Agenda — Reservas para PyMEs

> App móvil para que pequeños negocios (barberías, salones, consultorios, etc.) gestionen sus reservas de forma simple y profesional.

**Stack:** React Native · Expo · Supabase · TypeScript

---

## 🚀 ¿Qué es esto?

**Agenda** es una aplicación móvil pensada para PyMEs de servicios (barberías, peluquerías, centros de estética, consultorios, etc.) que necesitan:

- Que sus clientes reserven online sin llamar ni escribir por WhatsApp
- Ver su agenda del día de un vistazo
- Gestionar sus servicios, horarios y trabajadores
- Fidelizar a sus clientes con puntos o membresías

---

## ✅ Funcionalidades implementadas

| Módulo | Estado |
|---|---|
| Autenticación con Supabase | ✅ |
| Navegación con Expo Router | ✅ |
| Estructura base de la app | ✅ |

> Ver roadmap completo en [`FUNCIONALIDADES.md`](./FUNCIONALIDADES.md)

---

## 🛠️ Instalación y desarrollo

### Requisitos

- Node.js 18+
- Expo CLI
- Cuenta en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Nicolasarmiento0/agenda.git
cd agenda

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Completar SUPABASE_URL y SUPABASE_ANON_KEY

# 4. Iniciar la app
npx expo start
```

### Opciones para correr la app

- 📱 **Expo Go** — escanear QR desde el celular
- 🤖 **Android Emulator** — Android Studio
- 🍎 **iOS Simulator** — Xcode (solo Mac)
- 🌐 **Web** — directamente en el navegador

---

## 📁 Estructura del proyecto

```
agenda/
├── app/               # Rutas y pantallas (file-based routing)
├── components/        # Componentes reutilizables
├── context/           # Estado global (AuthContext, etc.)
├── hooks/             # Custom hooks
├── lib/               # Cliente Supabase y utilidades
├── styles/            # Estilos globales
├── constants/         # Colores, tamaños, textos
└── assets/            # Imágenes e íconos
```

---

## 📄 Documentación

- [`FUNCIONALIDADES.md`](./FUNCIONALIDADES.md) — Roadmap completo de features por fase
- [`GUIA_CLIENTES.md`](./GUIA_CLIENTES.md) — Instrucciones para que las PyMEs compartan con sus clientes

---

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Si querés contribuir:

1. Hacé un fork
2. Creá una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commiteá tus cambios: `git commit -m 'feat: agrego nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abrí un Pull Request

---

## 📬 Contacto

Desarrollado por [@Nicolasarmiento0](https://github.com/Nicolasarmiento0)