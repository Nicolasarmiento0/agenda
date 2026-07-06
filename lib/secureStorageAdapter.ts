import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

/**
 * Adapter de storage para `supabase-js` sobre `expo-secure-store` (Keychain iOS / Keystore
 * Android). SecureStore limita cada valor a 2048 bytes y el objeto de sesión serializado de
 * supabase-js (JWT + refresh token + metadata del user) normalmente lo excede, así que los
 * valores largos se parten en chunks bajo keys derivadas (`<key>.chunk_N`) y la key principal
 * guarda un marcador con el número de chunks.
 *
 * `getItem` incluye una migración one-time: si la key no existe en SecureStore pero sí en
 * `AsyncStorage` (donde vivía la sesión antes de esta feature), la mueve a SecureStore y la
 * borra del storage en texto plano, evitando forzar un re-login tras actualizar la app.
 */

/** Tamaño máximo de cada chunk en caracteres. Conservador frente al límite de 2048 bytes de SecureStore porque un carácter no-ASCII (ej. tildes en metadata del user) ocupa más de un byte en UTF-8. */
const CHUNK_SIZE = 1024

/** Marcador guardado en la key principal cuando el valor está chunkeado: `__chunked__:<n>`. */
const CHUNK_MARKER_PREFIX = '__chunked__:'

/** Permite que supabase-js refresque el token con la app en background tras reiniciar el dispositivo. */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}

/**
 * Deriva la key de SecureStore para el chunk `index` de `key`.
 * @param key Key principal del valor.
 * @param index Índice del chunk (0-based).
 * @returns Key derivada, solo con caracteres válidos para SecureStore.
 */
function chunkKey(key: string, index: number): string {
  return `${key}.chunk_${index}`
}

/**
 * Interpreta el valor guardado en la key principal como marcador de chunking.
 * @param stored Valor crudo leído de SecureStore.
 * @returns Número de chunks si el valor es un marcador, o `null` si es un valor normal.
 */
function parseChunkCount(stored: string | null): number | null {
  if (stored === null || !stored.startsWith(CHUNK_MARKER_PREFIX)) return null
  const count = Number.parseInt(stored.slice(CHUNK_MARKER_PREFIX.length), 10)
  return Number.isInteger(count) && count > 0 ? count : null
}

/**
 * Lee y reensambla un valor chunkeado.
 * @param key Key principal del valor.
 * @param count Número de chunks esperados.
 * @returns El valor completo, o `null` si falta algún chunk (valor corrupto/incompleto).
 */
async function readChunks(key: string, count: number): Promise<string | null> {
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))),
  )
  if (chunks.some((chunk) => chunk === null)) return null
  return chunks.join('')
}

/**
 * Borra los chunks de `key` en el rango [from, to). No falla si alguno no existe.
 * @param key Key principal del valor.
 * @param from Índice inicial (inclusive).
 * @param to Índice final (exclusive).
 */
async function deleteChunks(key: string, from: number, to: number): Promise<void> {
  const deletions = []
  for (let i = from; i < to; i++) {
    deletions.push(SecureStore.deleteItemAsync(chunkKey(key, i)))
  }
  await Promise.all(deletions)
}

/**
 * Migración one-time desde AsyncStorage: si la sesión previa a esta feature sigue ahí,
 * la copia a SecureStore y la elimina del storage sin cifrar.
 * @param key Key de la sesión (la misma que usaba supabase-js con AsyncStorage).
 * @returns El valor migrado, o `null` si no había sesión previa.
 */
async function migrateFromAsyncStorage(key: string): Promise<string | null> {
  const legacyValue = await AsyncStorage.getItem(key)
  if (legacyValue === null) return null
  await secureStorageAdapter.setItem(key, legacyValue)
  await AsyncStorage.removeItem(key)
  return legacyValue
}

/**
 * Implementación de la interfaz de storage (`getItem`/`setItem`/`removeItem`) que espera
 * `supabase-js`, respaldada por SecureStore con soporte de chunking.
 */
export const secureStorageAdapter = {
  /**
   * Lee un valor, reensamblando chunks si aplica y migrando desde AsyncStorage si es la
   * primera lectura tras el update.
   * @param key Key del valor.
   * @returns El valor, o `null` si no existe o está corrupto (fuerza re-login limpio).
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      const stored = await SecureStore.getItemAsync(key)
      if (stored === null) return await migrateFromAsyncStorage(key)
      const chunkCount = parseChunkCount(stored)
      if (chunkCount === null) return stored
      return await readChunks(key, chunkCount)
    } catch (error) {
      console.error('[secureStorageAdapter] getItem falló:', error)
      return null
    }
  },

  /**
   * Guarda un valor, chunkeándolo si excede el límite de SecureStore y limpiando chunks
   * sobrantes de escrituras anteriores.
   * @param key Key del valor.
   * @param value Valor a persistir.
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const previousChunkCount = parseChunkCount(await SecureStore.getItemAsync(key)) ?? 0
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS)
        await deleteChunks(key, 0, previousChunkCount)
        return
      }
      const chunkCount = Math.ceil(value.length / CHUNK_SIZE)
      for (let i = 0; i < chunkCount; i++) {
        const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        await SecureStore.setItemAsync(chunkKey(key, i), chunk, SECURE_STORE_OPTIONS)
      }
      await SecureStore.setItemAsync(key, `${CHUNK_MARKER_PREFIX}${chunkCount}`, SECURE_STORE_OPTIONS)
      await deleteChunks(key, chunkCount, previousChunkCount)
    } catch (error) {
      console.error('[secureStorageAdapter] setItem falló:', error)
    }
  },

  /**
   * Elimina un valor y todos sus chunks. También limpia la copia legacy en AsyncStorage
   * por si el logout ocurre antes de que la migración haya corrido.
   * @param key Key del valor.
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      const chunkCount = parseChunkCount(await SecureStore.getItemAsync(key)) ?? 0
      await SecureStore.deleteItemAsync(key)
      await deleteChunks(key, 0, chunkCount)
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('[secureStorageAdapter] removeItem falló:', error)
    }
  },
}
