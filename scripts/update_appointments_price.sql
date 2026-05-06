-- Script para habilitar historial y sumatoria de ingresos

-- 1. Añadir columna 'price' a la tabla appointments para registrar el valor al momento de la cita
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;

-- 2. (Opcional) Poblar precios de citas existentes basándose en el servicio (si coincide el nombre)
-- Esto es una aproximación.
UPDATE appointments a
SET price = bs.price
FROM business_services bs
WHERE a.business_id = bs.business_id 
AND a.service = bs.name
AND a.price = 0;
