# Spec: Sesión persistida vía expo-secure-store

## Qué hace

Reemplaza el storage adapter de `supabase-js` (hoy `AsyncStorage` en nativo / `localStorage` en
web) por `expo-secure-store` en plataformas nativas, para que el access/refresh token queden
cifrados en Keychain (iOS) / Keystore (Android) en vez de en texto plano.

## Por qué

`lib/supabase.ts:11-24` configura el storage adapter de la sesión usando `AsyncStorage`, sin
cifrado. No hay ningún uso de `expo-secure-store` en todo el repo. Un dispositivo comprometido,
rooteado o con acceso físico podría exponer la sesión completa (incluyendo refresh token) en
texto plano.

## Criterios de aceptación

- [ ] En iOS/Android, la sesión se persiste vía `expo-secure-store` (Keychain/Keystore)
- [ ] En web se mantiene `localStorage` (SecureStore no aplica a esa plataforma)
- [ ] Login, logout y refresh de sesión siguen funcionando en ambas plataformas nativas
- [ ] Usuarios con sesión activa antes del cambio no quedan en un estado roto (se documenta si requieren un re-login único tras el update de la app)

## Fuera de alcance

Cambios al flujo de OAuth de Google en sí (`context/AuthContext.tsx`, parseo del redirect) — esta
feature solo toca el storage adapter de la sesión, no el mecanismo de login.
