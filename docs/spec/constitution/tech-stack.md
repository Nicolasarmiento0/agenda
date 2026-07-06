# Tech Stack

## App
- **React Native + Expo SDK 55** (`expo-router`), target web + iOS + Android.
- **React 19 / React Native 0.83**, TypeScript estricto (`tsconfig.json` con `strict: true`).
- **expo-router** con grupos por rol: `(auth)`, `(client)`, `(company)`, `(worker)`, `(admin)`, `(shared)`, más `[slug].tsx` público.

## Backend
- **Supabase**: PostgreSQL + RLS multi-tenant, Auth, Storage (fotos de perfil/portfolio), Edge Functions (`supabase/functions/`).
- Sesión de Auth: en nativo se persiste cifrada vía `expo-secure-store` (Keychain/Keystore) usando `lib/secureStorageAdapter.ts` (con chunking por el límite de 2048 bytes); en web se mantiene `localStorage`. No usar `AsyncStorage` para tokens ni datos sensibles.
- Migraciones SQL versionadas en `supabase/.migrations/`.
- Policies RLS siempre versionadas en migraciones (nunca solo vía dashboard). Checks de rol vía helpers `public.is_admin()` / `public.get_my_role()` (SECURITY DEFINER) — no subconsultar `profiles` inline dentro de policies de `profiles` (recursión).
- Lógica crítica (anti-solapamiento de citas, historial de actividades) vive en triggers de Postgres, no en el cliente.

## UI / Estado
- Sistema de diseño propio dark-first (Tesla + Liquid Glass), `expo-blur`, `expo-linear-gradient`.
- Estado global vía React Context (`context/`: Auth, Business, Theme, Toast, Alert) — sin librería externa de estado.
- `react-native-calendars`, `@gorhom/bottom-sheet`, `expo-image`, `expo-haptics`.

## Convenciones
- Componentes UI reutilizables en `components/` (subcarpetas por rol: `client/`, `company/`, `calendar/`, `ui/`).
- Helpers en `utils/`, hooks custom en `hooks/`, cliente Supabase en `lib/`.
- Fechas en formato local puro `YYYY-MM-DD` (evitar UTC/ISO) por consistencia horaria LatAm.

## Tooling
- Node >=20.19.4 <23, ESLint (`eslint-config-expo`), `expo-doctor` para chequeos de salud del proyecto.
- Deploy web: Vercel (`vercel.json`).
