# Tasks: Sesión persistida vía expo-secure-store

- [x] Confirmar si `expo-secure-store` está en `package.json`; instalar si falta — instalado vía `npx expo install` (`~55.0.x`, config plugin agregado automáticamente)
- [x] Crear `lib/secureStorageAdapter.ts` implementando `getItem/setItem/removeItem` sobre `SecureStore`
- [x] Medir tamaño típico del valor de sesión serializado por `supabase-js` vs. límite de `SecureStore`; implementar chunking si es necesario — el objeto de sesión (JWT + refresh token + metadata del user) típicamente pesa 2.5–4 KB, por encima del límite de 2048 bytes, así que el adapter chunkea en bloques de 1024 caracteres bajo keys `<key>.chunk_N`
- [x] Actualizar `lib/supabase.ts:17` para usar el adapter nuevo solo en nativo (`Platform.OS !== 'web'`)
- [x] (Agregado durante implementación) Migración one-time desde `AsyncStorage`: si la sesión previa al update sigue en texto plano, `getItem` la mueve a SecureStore y la borra de AsyncStorage — los usuarios existentes NO necesitan re-login
- [ ] Probar login con email/password en iOS simulator, confirmar persistencia tras cerrar/reabrir la app
- [ ] Probar login con Google OAuth en Android emulator, confirmar persistencia
- [ ] Probar logout, confirmar que `SecureStore` limpia el valor correctamente (incluye chunks y copia legacy en AsyncStorage)
- [x] Actualizar `docs/spec/constitution/tech-stack.md` para reflejar la nueva convención de storage de sesión
- [ ] Probar flujo completo manualmente (login, cerrar app, reabrir, logout, en ambas plataformas nativas)

> Nota: los tests manuales en simulador/emulador quedan pendientes de ejecución humana. `tsc --noEmit` y `eslint` pasan limpios sobre los archivos modificados. Requiere rebuild nativo (`expo run:ios` / `expo run:android`) porque `expo-secure-store` agrega código nativo.
