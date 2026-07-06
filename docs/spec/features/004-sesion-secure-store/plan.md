# Plan: Sesión persistida vía expo-secure-store

## Enfoque

1. Confirmar si `expo-secure-store` ya está instalado; agregarlo si falta.
2. Crear `lib/secureStorageAdapter.ts` implementando la interfaz `getItem/setItem/removeItem` que
   espera `supabase-js`, usando `SecureStore.getItemAsync/setItemAsync/deleteItemAsync`.
3. Verificar el tamaño real del valor de sesión serializado que guarda `supabase-js` (incluye
   metadata además del JWT) contra el límite de tamaño de `SecureStore` (2048 bytes en algunas
   plataformas/versiones) — si excede, implementar chunking del valor en múltiples keys antes de
   asumir que un adapter 1:1 alcanza.
4. Actualizar `lib/supabase.ts:17` para usar el nuevo adapter condicionalmente
   (`Platform.OS !== 'web'`), sin tocar el path de web que sigue en `localStorage`.
5. (Agregado durante implementación) Migración one-time desde `AsyncStorage`: la sesión de
   usuarios existentes vive en texto plano bajo la misma key; `getItem` del adapter la detecta,
   la copia a SecureStore y la borra de AsyncStorage. Esto cumple el criterio de aceptación 4
   sin forzar re-login. `removeItem` también limpia la copia legacy por si el logout ocurre
   antes de la primera lectura migrada.

## Archivos afectados

- `lib/supabase.ts`
- `lib/secureStorageAdapter.ts` (nuevo)
- `package.json` (si hace falta agregar la dependencia)

## Cambios de datos (si aplica)

Ninguno — solo afecta el storage local del cliente, no la base de datos.

## Riesgos

El límite de tamaño de `SecureStore` puede no alcanzar para el objeto de sesión completo que
serializa `supabase-js` (no es solo el JWT, incluye metadata adicional) — hay que medirlo antes de
asumir que un adapter simple sin chunking es suficiente.

**Resolución:** confirmado que el objeto de sesión típico (2.5–4 KB) excede los 2048 bytes, así
que el adapter implementa chunking en bloques de 1024 caracteres (`<key>.chunk_N`, con la key
principal guardando el marcador `__chunked__:<n>`). Se usa `keychainAccessible: AFTER_FIRST_UNLOCK`
para que el refresh de token funcione en background tras reiniciar el dispositivo.
