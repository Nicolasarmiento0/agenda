-- ═══════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE HISTORIAL DE ACTIVIDADES DE CITAS
-- Ejecutar este script completo en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Crear la tabla de actividades si no existe
CREATE TABLE IF NOT EXISTS public.appointment_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar la seguridad de fila (Row Level Security - RLS)
ALTER TABLE public.appointment_activities ENABLE ROW LEVEL SECURITY;

-- 3. Crear política de lectura segura para la tabla de actividades
-- Permite únicamente a usuarios autenticados leer las actividades de las citas a las que tienen acceso
DROP POLICY IF EXISTS "allow_select_all_activities" ON public.appointment_activities;
CREATE POLICY "allow_select_all_activities" ON public.appointment_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = appointment_activities.appointment_id
        )
    );

-- 4. Crear o reemplazar la función trigger para registrar logs de estado automáticamente
CREATE OR REPLACE FUNCTION public.handle_appointment_activity_log()
RETURNS TRIGGER AS $$
DECLARE
  v_worker_name TEXT;
BEGIN
  -- Obtener el nombre del barbero asignado a la cita
  SELECT name INTO v_worker_name FROM public.workers WHERE id = COALESCE(NEW.worker_id, OLD.worker_id);
  IF v_worker_name IS NULL THEN
    v_worker_name := 'El barbero';
  END IF;

  -- CASO 1: Inserción de una nueva cita (Creada por el cliente)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_activities (appointment_id, status, title, description, created_at)
    VALUES (
      NEW.id,
      'pending',
      'Solicitud enviada al barbero',
      'Esperando confirmación del barbero',
      COALESCE(NEW.created_at, NOW())
    );
    
    -- Si la cita se inserta directamente como confirmada o completada por un admin
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.appointment_activities (appointment_id, status, title, description)
      VALUES (NEW.id, 'confirmed', v_worker_name || ' confirmó tu cita', 'El barbero aceptó tu cita');
    ELSIF NEW.status = 'completed' THEN
      INSERT INTO public.appointment_activities (appointment_id, status, title, description)
      VALUES (NEW.id, 'completed', 'Servicio completado ✓', 'Servicio realizado con éxito');
    END IF;

  -- CASO 2: Actualización de estado de la cita
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'confirmed' THEN
        INSERT INTO public.appointment_activities (appointment_id, status, title, description)
        VALUES (NEW.id, 'confirmed', v_worker_name || ' confirmó tu cita', 'El barbero aceptó tu cita');
      ELSIF NEW.status = 'completed' THEN
        INSERT INTO public.appointment_activities (appointment_id, status, title, description)
        VALUES (NEW.id, 'completed', 'Servicio completado ✓', 'Servicio realizado con éxito');
      ELSIF NEW.status = 'cancelled' THEN
        INSERT INTO public.appointment_activities (appointment_id, status, title, description)
        VALUES (NEW.id, 'cancelled', 'Cita cancelada', 'La cita fue cancelada');
      ELSIF NEW.status = 'rescheduled' THEN
        INSERT INTO public.appointment_activities (appointment_id, status, title, description)
        VALUES (NEW.id, 'rescheduled', 'Cita reprogramada', 'La cita fue reprogramada a nuevo horario');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 5. Crear el trigger en la tabla de citas
DROP TRIGGER IF EXISTS trg_appointment_activity_log ON public.appointments;
CREATE TRIGGER trg_appointment_activity_log
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_appointment_activity_log();

-- 6. Revocar permisos de ejecución pública sobre la función trigger para evitar llamadas directas por API RPC
REVOKE EXECUTE ON FUNCTION public.handle_appointment_activity_log() FROM PUBLIC;

-- 6. Retroalimentación/Poblar actividades básicas para citas pre-existentes
-- Esto garantiza que las citas previas funcionen de inmediato
INSERT INTO public.appointment_activities (appointment_id, status, title, description, created_at)
SELECT 
  a.id, 
  'pending', 
  'Solicitud enviada al barbero', 
  'Esperando confirmación del barbero',
  COALESCE(a.created_at, NOW() - INTERVAL '1 hour')
FROM public.appointments a
ON CONFLICT DO NOTHING;

INSERT INTO public.appointment_activities (appointment_id, status, title, description, created_at)
SELECT 
  a.id, 
  'confirmed', 
  COALESCE(w.name, 'El barbero') || ' confirmó tu cita', 
  'El barbero aceptó tu cita',
  COALESCE(a.created_at, NOW()) + INTERVAL '5 minutes'
FROM public.appointments a
LEFT JOIN public.workers w ON a.worker_id = w.id
WHERE a.status IN ('confirmed', 'completed')
ON CONFLICT DO NOTHING;

INSERT INTO public.appointment_activities (appointment_id, status, title, description, created_at)
SELECT 
  a.id, 
  'completed', 
  'Servicio completado ✓', 
  'Servicio realizado con éxito',
  COALESCE(a.created_at, NOW()) + INTERVAL '30 minutes'
FROM public.appointments a
WHERE a.status = 'completed'
ON CONFLICT DO NOTHING;
