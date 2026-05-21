-- Agrega columna notes a la tabla appointments
-- Ejecutar una sola vez en el dashboard de Supabase (SQL Editor)

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índice opcional para búsqueda por texto si en el futuro se necesita
-- CREATE INDEX IF NOT EXISTS idx_appointments_notes ON appointments USING gin(to_tsvector('spanish', notes));
