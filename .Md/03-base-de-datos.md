# 03 — Esquema de Base de Datos (Supabase)

## Stack de datos
- **Base de datos:** PostgreSQL vía Supabase
- **Autenticación:** Supabase Auth (ya implementado)
- **Storage:** Supabase Storage (bucket `avatars` ya en uso)
- **Realtime:** Supabase Realtime (activar en tabla `appointments`)

---

## Tablas existentes

### `profiles`
Ya existe. Vinculada a `auth.users` por `id`.

```sql
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  nickname    text,
  avatar_url  text,
  role        text  -- 'client' | 'company' | 'admin'
)
```

---

## Tablas nuevas a crear

### `service_categories`
Las categorías de negocio. Las crea el admin.

```sql
service_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,   -- ej: 'Barbería', 'Salón de Belleza', 'Uñas'
  icon       text,                   -- nombre del icono Feather o emoji
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
```

**RLS:** Solo admin puede insertar/modificar. Lectura pública.

---

### `catalog_services`
Los servicios base del catálogo global. Los crea el admin.

```sql
catalog_services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id),
  name        text NOT NULL,    -- ej: 'Corte de cabello', 'Fade', 'Manicure'
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
)
```

**RLS:** Solo admin puede insertar/modificar. Lectura pública para empresas al configurar sus servicios.

---

### `businesses`
Perfil del negocio. Se crea al completar el onboarding. Requiere aprobación del admin.

```sql
businesses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category_id  uuid NOT NULL REFERENCES service_categories(id),
  description  text,
  address      text,
  phone        text,
  logo_url     text,
  status       text NOT NULL DEFAULT 'pending',
               -- 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at   timestamptz DEFAULT now()
)
```

**RLS:**
- Solo el `owner_id` puede modificar su negocio.
- Lectura pública solo para negocios con `status = 'approved'`.
- El admin puede cambiar `status`.

---

### `business_services`
Tabla pivote: qué servicios del catálogo ofrece cada empresa, con sus precios y duraciones propias.

```sql
business_services (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  catalog_service_id uuid NOT NULL REFERENCES catalog_services(id),
  price              numeric(10,2),   -- precio propio del negocio (null = consultar)
  duration_min       int NOT NULL,    -- duración en minutos que le toma a este negocio
  is_active          boolean DEFAULT true,
  UNIQUE(business_id, catalog_service_id)
)
```

**RLS:** Solo el owner del negocio puede gestionar. Lectura pública.

---

### `employees`
Profesionales que trabajan en el negocio. Los crea la empresa, sin cuenta propia en el MVP.

```sql
employees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        text NOT NULL,
  photo_url   text,
  bio         text,             -- descripción breve / especialidades
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
)
```

**RLS:** Solo el owner del negocio puede gestionar. Lectura pública de empleados activos de empresas aprobadas.

---

### `employee_availability`
Disponibilidad semanal por empleado. Define sus bloques de atención por día de la semana.

```sql
employee_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week  int NOT NULL,      -- 0=Domingo, 1=Lunes ... 6=Sábado
  start_time   time NOT NULL,     -- ej: '09:00'
  end_time     time NOT NULL,     -- ej: '18:00'
  slot_duration int NOT NULL      -- minutos por slot (ej: 30)
)
```

> Los slots disponibles se calculan dinámicamente al reservar:
> se toma el bloque horario del día de la semana correspondiente,
> se genera la lista de slots y se restan los que ya tienen citas `confirmed`.

**RLS:** Solo el owner del negocio puede gestionar. Lectura pública.

---

### `appointments`
El corazón del sistema. Una reserva vincula cliente + empleado + servicio + fecha/hora.

```sql
appointments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id),
  client_id           uuid NOT NULL REFERENCES profiles(id),
  employee_id         uuid NOT NULL REFERENCES employees(id),
  business_service_id uuid NOT NULL REFERENCES business_services(id),
  date                date NOT NULL,
  start_time          time NOT NULL,
  end_time            time NOT NULL,    -- start_time + duration_min del servicio
  status              text NOT NULL DEFAULT 'confirmed',
                      -- 'confirmed' | 'cancelled_by_client' | 'cancelled_by_business' | 'completed'
  notes               text,             -- nota opcional del cliente al reservar
  created_at          timestamptz DEFAULT now()
)
```

**RLS:**
- Cliente: ve y puede cancelar sus propias citas (`client_id = auth.uid()`).
- Empresa: ve todas las citas de su negocio. Puede marcar como completadas o cancelar.
- Nadie puede modificar una cita en estado `completed` o `cancelled_*`.

---

## Relaciones entre tablas

```
auth.users
    └── profiles (1:1)
            └── businesses (1:1 por owner_id)
                    ├── business_services (1:N)  ←→  catalog_services (N:1)
                    │                                        └── service_categories (N:1)
                    ├── employees (1:N)
                    │       └── employee_availability (1:N)
                    └── appointments (1:N por business_id)
                            ├── profiles (N:1 por client_id)
                            ├── employees (N:1 por employee_id)
                            └── business_services (N:1)
```

---

## Políticas RLS — resumen

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `service_categories` | Todos | Solo admin | Solo admin | No |
| `catalog_services` | Todos | Solo admin | Solo admin | No |
| `businesses` | Approved = todos / Pending = solo owner | Owner autenticado | Solo owner | No |
| `business_services` | Todos | Owner del negocio | Owner del negocio | Owner del negocio |
| `employees` | Todos (activos de approved) | Owner del negocio | Owner del negocio | No |
| `employee_availability` | Todos | Owner del negocio | Owner del negocio | Owner del negocio |
| `appointments` | Client propias + Company su negocio | Cliente autenticado | Client cancelar + Company gestionar | No |

---

## Storage Buckets

| Bucket | Acceso | Uso |
|---|---|---|
| `avatars` | Público | Foto de perfil de usuarios (ya existe) |
| `business-logos` | Público | Logo de cada empresa (crear) |
| `employee-photos` | Público | Foto de cada empleado (crear) |

---

## Datos semilla que debe crear el admin (antes de que el primer negocio se registre)

```sql
-- Categorías
INSERT INTO service_categories (name, icon) VALUES
  ('Barbería', 'scissors'),
  ('Salón de Belleza', 'star'),
  ('Uñas', 'feather'),
  ('Pestañas', 'eye'),
  ('Gimnasio', 'activity'),
  ('Spa / Masajes', 'heart'),
  ('Otro', 'grid');

-- Servicios de ejemplo para Barbería
INSERT INTO catalog_services (category_id, name) VALUES
  ((SELECT id FROM service_categories WHERE name = 'Barbería'), 'Corte de cabello'),
  ((SELECT id FROM service_categories WHERE name = 'Barbería'), 'Fade / Degradado'),
  ((SELECT id FROM service_categories WHERE name = 'Barbería'), 'Barba'),
  ((SELECT id FROM service_categories WHERE name = 'Barbería'), 'Corte + Barba'),
  ((SELECT id FROM service_categories WHERE name = 'Barbería'), 'Afeitado clásico');
```

---

## Orden de creación en Supabase

1. `service_categories`
2. `catalog_services`
3. `businesses`
4. `business_services`
5. `employees`
6. `employee_availability`
7. `appointments`
8. Activar RLS en cada tabla y crear políticas
9. Crear buckets `business-logos` y `employee-photos` en Storage
10. Activar Realtime en tabla `appointments`
11. Insertar datos semilla (categorías y servicios base)

---

## Notas importantes
- **Nunca borrar registros** — usar `is_active = false` o cambiar `status`.
- El campo `end_time` en `appointments` se calcula antes de insertar: `start_time + duration_min`.
- Para evitar doble reserva: verificar que no exista otra cita `confirmed` con el mismo `employee_id + date + start_time` antes de insertar.
- La lógica de slots disponibles se calcula en la app consultando `employee_availability` y restando las citas ya confirmadas para ese empleado en esa fecha.
- El admin identifica por `profiles.role = 'admin'`. Las políticas RLS deben verificar este campo.
