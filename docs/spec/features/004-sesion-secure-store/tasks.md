# Tasks: Sesión persistida vía expo-secure-store

- [ ] Confirmar si `expo-secure-store` está en `package.json`; instalar si falta
- [ ] Crear `lib/secureStorageAdapter.ts` implementando `getItem/setItem/removeItem` sobre `SecureStore`
- [ ] Medir tamaño típico del valor de sesión serializado por `supabase-js` vs. límite de `SecureStore`; implementar chunking si es necesario
- [ ] Actualizar `lib/supabase.ts:17` para usar el adapter nuevo solo en nativo (`Platform.OS !== 'web'`)
- [ ] Probar login con email/password en iOS simulator, confirmar persistencia tras cerrar/reabrir la app
- [ ] Probar login con Google OAuth en Android emulator, confirmar persistencia
- [ ] Probar logout, confirmar que `SecureStore` limpia el valor correctamente
- [ ] Actualizar `docs/spec/constitution/tech-stack.md` para reflejar la nueva convención de storage de sesión
- [ ] Probar flujo completo manualmente (login, cerrar app, reabrir, logout, en ambas plataformas nativas)
