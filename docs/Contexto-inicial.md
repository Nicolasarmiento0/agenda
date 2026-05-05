### Estructura general

Es una app con autenticación completa y roles de usuario. Tiene:

- **`app/`** — Pantallas con file-based routing (Expo Router)
- **`context/`** — AuthContext + ThemeContext
- **`components/`** — Sidebar animado con BlurView
- **`lib/supabase.ts`** — Cliente de Supabase
- **`styles/appStyles.ts`** — Estilos globales

---

### 🔐 Autenticación (AuthContext)

- Maneja `session`, `profile`, `loading` y `profileLoaded`
- Redirige automáticamente según el **rol** del usuario:
    - `client` → `/screens/dashboard`
    - `company` → `/screens/dashboard-company`
    - Sin rol → `/screens/role-select`
- Tiene `refreshProfile`, `updateProfileState` y `signOut`

### 🎨 Temas (ThemeContext)

- Modo oscuro/claro con toggle
- Color primario: `#E31937` (rojo)
- Paleta completa para ambos modos

### 🗂️ Pantallas

`home`, `loginscreen`, `signup`, `forgotPassword`, `emailConfirmation`, `resetPassword`, `role-select`, `dashboard`, `dashboard-company`, `profile`

### 📌 Detalles notables

- El Sidebar usa **animaciones nativas** (slide + fade) y `BlurView`
- Deep links manejados en `_layout.tsx` para el flujo de reset de contraseña

# Objetivo

El objetivo es crear una aplicaión que sirva como agendamiento de horas de distintos servicios, ya sea barberia, salon de belleza, uñas, pestañas, gimnasios, etc. Ya con todo lo que tengo necesito comenzar a crear el desarrolo de este que es que los usuarios clientes agenden su hora y los usuarios empresa puedan verlas reflejadas en la app. Teniendo los roles designados necesito que comenzemos creando como será la metodologia, intenta darme ideas e investiga con apps que se muevan dentro del rubro para poder replicar y luego innovar. Indicame cuantas screens serán necesarias crear o que hay que modificaren las que ya tenemos, recuerda que la base de datos la tiene supabase donde tambien debere ir realizando modificaciones. Este archivo que te enviare es el primer .MD , creame los necesarios para poder ir dando contexto a todo tipo de ia para poder trabajrlo en conjunto.