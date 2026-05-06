-- Actualizaciones para modelo de Gimnasios y Membresías

-- 1. Añadir flag para identificar servicios que son membresías (pagos mensuales)
ALTER TABLE business_services ADD COLUMN IF NOT EXISTS is_membership boolean DEFAULT false;

-- 2. Asegurar que los estados de cita incluyan los necesarios para gimnasios
-- (En Postgres, si es un campo de texto, no hay problema. Si es un ENUM, habría que alterarlo)
-- Como es texto, simplemente usaremos los nuevos strings en la lógica.

-- 3. (Opcional) Tabla para vincular clientes con membresías activas si se requiere mayor control
-- Por ahora lo manejaremos con el historial de citas marcadas como membresía.
