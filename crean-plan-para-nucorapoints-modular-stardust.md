# Plan: NucoraPoints — Sistema de Fidelidad por Negocio

## Contexto

Nucora necesita un sistema de fidelización que genere retención de clientes para los negocios y aumente el número de usuarios activos en la plataforma. El sistema se llama **NucoraPoints** y es **opt-in por negocio**: cada empresa puede activarlo/desactivarlo y configurar qué beneficios ofrece.

No existe ninguna infraestructura de descuentos, puntos o referidos en el código actual. Los `appointments` tienen un campo `price` fijo sin lógica de descuentos. Los `profiles` no tienen `birthdate` ni `referral_code`.

---

## Alcance del MVP

### Funcionalidades requeridas
1. **Sello x9 → 10° al 50%**: Después de 9 servicios completados en un negocio, el 10° tiene 50% de descuento. Solo una vez por cliente por negocio.
2. **Descuento de cumpleaños (30%)**: Si el cliente tiene `birthdate` configurado, durante su semana de cumpleaños obtiene 30% off.
3. **Invitado (20%)**: El cliente trae un amigo que agenda por Nucora en ese negocio → el referidor obtiene 20% en su próxima cita.
4. **Link de referido (platform-wide)**: Cada usuario tiene un código único. Quien se registra con ese código y completa su primera cita → el referidor obtiene 12% off en su próxima cita en cualquier negocio con points activos.
5. **Toggle por negocio**: El empresario puede activar/desactivar NucoraPoints y cada feature por separado desde la configuración del negocio.

### Funcionalidades adicionales recomendadas (incluir en MVP)
6. **Early bird -10%**: Cita agendada con 7+ días de anticipación.
7. **Descuento por reseña**: Dejar reseña → 10% off próxima cita en ese negocio.

### Para considerar en una iteración posterior
- Tier VIP (20+ citas completadas en un negocio)
- Re-engagement (60 días inactivo → notificación + descuento)
- Slots de último momento con precio reducido

---

## Base de Datos

### 1. Modificar tablas existentes

```sql
-- profiles: agregar birthdate y referral_code
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthdate     date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT NULL;

UPDATE profiles SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 8)) WHERE referral_code IS NULL;
ALTER TABLE profiles ALTER COLUMN referral_code SET NOT NULL;

-- appointments: tracking de descuentos
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS original_price  numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_pct    numeric(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type   text          DEFAULT NULL;
-- discount_type: 'stamp' | 'birthday' | 'guest_referral' | 'platform_referral' | 'early_bird' | 'review'
```

### 2. Nueva tabla: `business_loyalty_config`
Config por negocio. Una fila por business. Columnas clave:
- `nucora_points_enabled` boolean (master switch)
- `stamps_enabled`, `birthday_enabled`, `guest_referral_enabled`, `platform_referral_enabled`, `early_bird_enabled`, `review_reward_enabled` booleans
- `stamps_required` int (default 9), `stamp_discount_pct` numeric (default 50)
- `birthday_discount_pct` numeric (default 30)
- `guest_referral_pct` numeric (default 20)
- `platform_referral_pct` numeric (default 12)
- `early_bird_days` int (default 7), `early_bird_pct` numeric (default 10)
- `review_reward_pct` numeric (default 10)

**RLS**: Company manages own config; authenticated users can SELECT (para mostrar beneficios al cliente).

### 3. Nueva tabla: `stamp_cards`
Una fila por `(business_id, client_id)`.
- `stamps_count` int (0-9), `reward_earned` boolean, `reward_used` boolean
- Se actualiza via DB trigger al completar cita. Solo una recompensa por cliente por negocio.

**RLS**: Client ve las suyas; company ve las de su negocio; no escritura directa del cliente (solo triggers).

### 4. Nueva tabla: `guest_referrals`
- `business_id`, `referrer_id`, `guest_id`, `appointment_id`
- `reward_used` boolean
- UNIQUE(`business_id`, `guest_id`): un invitado solo puede ser referido una vez por negocio.

**RLS**: Client ve donde es referrer o guest; company ve las de su negocio; cliente puede INSERT donde `guest_id = auth.uid()`.

### 5. Nueva tabla: `platform_referrals`
- `referrer_id`, `referred_id`, `referral_code`, `first_appt_id`
- `qualified_at` timestamptz (null hasta que referred complete su 1ra cita), `reward_used` boolean
- UNIQUE(`referred_id`): un usuario solo puede haber sido referido una vez.

**RLS**: Client ve las suyas; INSERT donde `referred_id = auth.uid()`.

### Archivo de migración
`scripts/setup_nucora_points.sql` — todo el DDL, índices, RLS, triggers.

---

## DB Triggers

### `trg_appointment_completed` (AFTER UPDATE ON appointments)
Dispara cuando `status` cambia a `'completed'`:
1. Busca `business_loyalty_config` para ese negocio. Si `nucora_points_enabled=false` o `stamps_enabled=false`, sale.
2. Upsert en `stamp_cards`: incrementa `stamps_count`.
3. Si `stamps_count >= stamps_required` y `reward_used = false`: setea `reward_earned = true`.
4. Dispara también `fn_qualify_platform_referral`: si el cliente tiene un `platform_referrals` con `qualified_at IS NULL`, lo setea a `now()`.

### `trg_set_referral_code` (BEFORE INSERT ON profiles)
Auto-genera `referral_code` si es NULL.

---

## Lógica de Resolución de Descuento (Application Layer)

En `AppointmentModal.tsx`, antes del insert, se llama a `resolveDiscount(businessId, originalPrice)`. Prioridad:

1. Stamp reward (50%) — `stamp_cards.reward_earned=true, reward_used=false`
2. Birthday (30%) — `isInBirthdayWeek(profile.birthdate)` con config enabled
3. Guest referral (20%) — `guest_referrals` con `reward_used=false`
4. Platform referral (12%) — `platform_referrals` con `qualified_at IS NOT NULL, reward_used=false`
5. Early bird (10%) — `appointmentDate - today >= early_bird_days`
6. Review reward (10%) — reviews table: cita completada sin reseña → tiene descuento disponible

Solo aplica el descuento más alto. Se guarda `original_price`, `discount_pct`, `discount_type` en la cita. Inmediatamente después del insert, se marca el descuento como usado en su tabla correspondiente.

```typescript
function isInBirthdayWeek(birthdate: string): boolean {
  const today = new Date();
  const bday = new Date(birthdate);
  bday.setFullYear(today.getFullYear());
  const day = bday.getDay() === 0 ? 7 : bday.getDay();
  const mon = new Date(bday); mon.setDate(bday.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return today >= mon && today <= sun;
}
```

---

## Nuevos Archivos

| Archivo | Propósito |
|---------|-----------|
| `scripts/setup_nucora_points.sql` | Migración completa (DDL + RLS + triggers) |
| `context/LoyaltyContext.tsx` | Estado de loyalty por sesión: config, stamp card, descuento activo, resolveDiscount() |
| `hooks/useLoyalty.ts` | `useContext(LoyaltyContext)` shorthand |
| `components/loyalty/StampCardWidget.tsx` | 9 círculos + estrella de recompensa, estado earned/used |
| `components/loyalty/DiscountBadge.tsx` | Pill con tipo y % de descuento ("Cumpleaños -30%") |
| `components/loyalty/NucoraPointsCard.tsx` | Card resumen de todos los beneficios activos en un negocio |
| `components/loyalty/ReferralShareCard.tsx` | Código + botón Share (React Native Share API) |

---

## Archivos Existentes a Modificar

### `context/AuthContext.tsx`
Extender tipo `Profile`:
```typescript
birthdate: string | null;      // ADD
referral_code: string | null;  // ADD
```
`select('*')` ya existe en el fetch → no hay cambios en la query.

### `app/_layout.tsx`
Envolver con `<LoyaltyProvider>` en el árbol de providers.

### `app/(shared)/profile.tsx`
- Agregar campo "Fecha de cumpleaños" (solo rol `client`) con DatePicker nativo.
- Agregar sección "Mi código de referido" con `<ReferralShareCard />`.
- Incluir `birthdate` en el `update()` de Supabase al guardar.

### `app/(auth)/signup.tsx`
- Leer `useLocalSearchParams().ref` al cargar.
- Tras registro exitoso, si `ref` existe, buscar `profiles.referral_code = ref` e insertar en `platform_referrals`.

### `app/(client)/client-business-profile.tsx`
- Llamar `loadLoyalty(businessId)` al montar.
- Renderizar `<NucoraPointsCard />` debajo de reviews si `loyaltyConfig?.nucora_points_enabled`.
- Botón "Invitar amigo" → Share link con `?invited_by=CLIENT_ID&business_id=X`.

### `components/calendar/AppointmentModal.tsx`
- En `executeInsert` (solo `mode === 'create'`, rol client): llamar `resolveDiscount()` antes del insert.
- Mostrar `<DiscountBadge />` en la sección de precio.
- Payload extendido: `original_price`, `discount_pct`, `discount_type`.
- Post-insert: marcar descuento como usado.

### `app/(company)/company-business.tsx`
Agregar sección "NucoraPoints" al final:
- Toggle master "Activar NucoraPoints".
- Sub-toggles por feature (visibles solo si master ON).
- Inputs numéricos para personalizar porcentajes.
- `upsert` a `business_loyalty_config` al guardar.

### `app/(auth)/signup.tsx`
- Al registrar un nuevo usuario con `?invited_by=X&business_id=Y` (guest flow), insertar `guest_referrals` tras completar su primera cita en ese negocio.

---

## Flujo Guest Referral (detalle)

1. Cliente A (referidor) → "Invitar amigo" en perfil del negocio → Share link:
   `https://app.nucora.com/business/BIZ_ID?invited_by=CLIENT_A_ID`
2. Amigo (guest) llega a `client-business-profile.tsx` → se guarda `invited_by` en AsyncStorage/state.
3. Guest agenda cita → en el insert de appointment, se adjunta metadata del referido.
4. Cuando la cita del guest se completa → trigger/frontend inserta en `guest_referrals`.
5. Próxima cita del referidor → `resolveDiscount` encuentra `guest_referrals.reward_used=false` → aplica 20%.

---

## Impacto en Métricas

**Para el negocio:**
- Retención aumenta al crear expectativa de recompensa (stamp card).
- Nuevo canal de adquisición orgánico (referidos de clientes).
- Dashboard podría mostrar: clientes recurrentes %, sellos activos, referidos generados.

**Para Nucora:**
- Referral platform-wide → crecimiento viral de usuarios.
- Más negocios activan NucoraPoints → diferencial competitivo vs. agendar por WhatsApp.
- Incentivo para que negocios aprueben la app: les trae más clientes.

---

## Secuencia de Implementación

1. **DB**: Ejecutar `setup_nucora_points.sql` en Supabase.
2. **Tipos**: Actualizar `AuthContext.tsx` (Profile type) y `constants/appointments.ts` (Appointment type).
3. **Context**: Crear `LoyaltyContext.tsx` + `hooks/useLoyalty.ts`. Registrar en `_layout.tsx`.
4. **Componentes UI**: Crear los 4 componentes de `components/loyalty/`.
5. **Profile**: Modificar `profile.tsx` (birthdate + referral card).
6. **Signup**: Modificar `signup.tsx` (ref param).
7. **Booking modal**: Modificar `AppointmentModal.tsx` (resolveDiscount + extended payload).
8. **Business profile (cliente)**: Modificar `client-business-profile.tsx` (NucoraPointsCard + invite button).
9. **Settings empresa**: Modificar `company-business.tsx` (loyalty config section).

---

## Verificación

### DB
```sql
-- 1. Completar appointment manualmente → verificar stamp_cards incrementa
UPDATE appointments SET status='completed' WHERE id='<test_id>';
SELECT * FROM stamp_cards WHERE client_id='<test_user>';

-- 2. Completar 9 citas → verificar reward_earned=true
-- 3. Signup con ref param → verificar platform_referrals row
SELECT * FROM platform_referrals WHERE referred_id='<new_user>';

-- 4. Test RLS: como cliente, intentar leer stamp card de otro → 0 filas
```

### UI
- [ ] Agregar `birthdate` en perfil → guardar → releer → confirmar.
- [ ] `referral_code` se muestra en perfil y se puede compartir.
- [ ] `NucoraPointsCard` aparece en business profile solo cuando `enabled=true`.
- [ ] Booking modal muestra `DiscountBadge` si hay descuento activo.
- [ ] Cita insertada con `original_price` y `discount_pct` correctos.
- [ ] Toggle de NucoraPoints en settings empresa → upsert en DB.
- [ ] Registro con `?ref=CODE` → fila en `platform_referrals`.
