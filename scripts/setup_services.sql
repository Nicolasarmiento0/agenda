-- Script actualizado: Añade columna 'name' a business_services y pobla datos

-- 1. Asegurarse de que business_services tenga columna 'name' para personalización
-- Esto permite que cada negocio le ponga su propio nombre al servicio (ej: 'Corte Varón')
-- sin afectar al catálogo global.
ALTER TABLE business_services ADD COLUMN IF NOT EXISTS name text;

-- 2. Poblar catalog_services con nombres genéricos (si no existen)
DO $$
DECLARE
    cat_record RECORD;
BEGIN
    FOR cat_record IN SELECT id FROM service_categories WHERE parent_id IS NOT NULL LOOP
        INSERT INTO catalog_services (category_id, name, description)
        VALUES (cat_record.id, 'Servicio 1', 'Descripción personalizable')
        ON CONFLICT DO NOTHING;
        
        INSERT INTO catalog_services (category_id, name, description)
        VALUES (cat_record.id, 'Servicio 2', 'Descripción personalizable')
        ON CONFLICT DO NOTHING;
        
        INSERT INTO catalog_services (category_id, name, description)
        VALUES (cat_record.id, 'Servicio 3', 'Descripción personalizable')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 3. Poblar business_services con NOMBRES y PRECIOS por defecto
DO $$
DECLARE
    biz_record RECORD;
    cat_svc RECORD;
BEGIN
    FOR biz_record IN SELECT id, category_id FROM businesses LOOP
        FOR cat_svc IN (
            SELECT id, name FROM catalog_services WHERE category_id = biz_record.category_id
        ) LOOP
            INSERT INTO business_services (business_id, catalog_service_id, name, price, duration_min)
            VALUES (biz_record.id, cat_svc.id, cat_svc.name, 10000.00, 30)
            ON CONFLICT (business_id, catalog_service_id) DO UPDATE 
            SET 
                name = COALESCE(business_services.name, EXCLUDED.name),
                price = COALESCE(business_services.price, EXCLUDED.price);
        END LOOP;
    END LOOP;
END $$;
