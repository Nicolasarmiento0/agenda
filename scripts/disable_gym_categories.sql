-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Desactivar Categoría de Gimnasios y Cuidado de Membresías
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Desactivar la categoría específica de Gimnasios en el catálogo
UPDATE service_categories
SET is_active = false
WHERE id = '854d3db2-1e6c-4e61-be48-e7a3fb887bd9';

-- 2. Limpieza de tablas de membresía y clases (Opcional, pero recomendado)
-- Descomentar si se desea eliminar físicamente la estructura de gimnasio de la DB:
-- DROP TABLE IF EXISTS gym_memberships CASCADE;
-- DROP TABLE IF EXISTS membership_requests CASCADE;
