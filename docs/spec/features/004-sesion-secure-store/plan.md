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
