-- Añadir columnas JSONB para manejar múltiples bloques de horario
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS schedule JSONB;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb;

-- Ejemplo del formato de business.schedule:
-- {
--   "1": [{ "start": "05:30", "end": "12:00" }, { "start": "17:00", "end": "22:30" }],
--   "2": [{ "start": "05:30", "end": "12:00" }, { "start": "17:00", "end": "22:30" }],
--   "3": [{ "start": "05:30", "end": "12:00" }, { "start": "17:00", "end": "22:30" }],
--   "4": [{ "start": "05:30", "end": "12:00" }, { "start": "17:00", "end": "22:30" }],
--   "5": [{ "start": "05:30", "end": "12:00" }, { "start": "17:00", "end": "22:30" }],
--   "6": [{ "start": "09:00", "end": "14:00" }],
--   "7": []
-- }
