-- Script actualizado: Flexibilidad para servicios personalizados y limpieza

-- 1. Permitir que los servicios de negocio NO dependan obligatoriamente del catálogo global
-- Esto permite que cada empresa cree sus propios servicios libremente.
ALTER TABLE business_services ALTER COLUMN catalog_service_id DROP NOT NULL;

-- 2. Asegurarse de que no existan duplicados exactos (opcional, limpieza)
-- Si tienes servicios con el mismo nombre y precio para el mismo negocio, 
-- este comando te ayudará a identificar si hay algo raro, pero la lógica de la app 
-- ahora permitirá borrarlos manualmente.

-- 3. Asegurar que la columna 'name' existe (repetido por seguridad)
ALTER TABLE business_services ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE business_services ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;
ALTER TABLE business_services ADD COLUMN IF NOT EXISTS duration_min int DEFAULT 30;
