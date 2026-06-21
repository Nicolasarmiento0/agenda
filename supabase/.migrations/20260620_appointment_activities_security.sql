-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN DE SEGURIDAD: RLS en appointment_activities
-- Creado: 2026-06-20
-- Objetivo: Restringir lectura de actividades a dueños/participantes de la cita
-- ═══════════════════════════════════════════════════════════

-- 1. Asegurar que RLS está activo en la tabla
ALTER TABLE public.appointment_activities ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar la política anterior expuesta públicamente
DROP POLICY IF EXISTS "allow_select_all_activities" ON public.appointment_activities;

-- 3. Crear la nueva política RLS que delega la verificación al RLS de appointments
CREATE POLICY "allow_select_all_activities" ON public.appointment_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = appointment_activities.appointment_id
        )
    );
