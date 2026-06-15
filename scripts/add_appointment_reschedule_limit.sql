-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: LÍMITE DE REAGENDAMIENTO DE CITAS
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar la columna 'reschedule_count' si no existe
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;
