# 06 — Estado Actual del Código (Auditoría Real)

> Este archivo documenta el estado REAL del código al momento de iniciar el desarrollo
> del sistema de agendamiento. Sirve como punto de partida exacto para cualquier IA
> que trabaje en el proyecto. Última revisión: inicio de Fase 1.

---

## Advertencia importante — Carpeta de documentos

Los archivos `.md` están guardados en una carpeta llamada `.Md/` (con punto inicial).
En Unix/Linux esta carpeta es **oculta por defecto** (`ls` no la muestra, `ls -a` sí).
**Recomendación:** renombrar a `docs/` para que sea visible normalmente.

```bash
mv .Md docs
```

---

## Archivos existentes en el repositorio

```
/
├── .Md/                          ← OCULTA — renombrar a docs/
│   ├── 02-vision-producto.md
│   ├── 03-base-de-datos.md
│   ├── 04-pantallas-y-flujos.md
│   └── 05-contexto-desarrollo-ia.md
├── app/
│   ├── _layout.tsx               ← Registra 11 pantallas. Falta registrar las 22 nuevas.
│   ├── index.tsx                 ← Redirección básica. Falta lógica de business y admin.
│   └── screens/
│       ├── home.tsx              ✅ Completo
│       ├── loginscreen.tsx       ✅ Completo
│       ├── signup.tsx            ✅ Completo
│       ├── forgotPassword.tsx    ✅ Completo
│       ├── emailConfirmation.tsx ✅ Completo
│       ├── resetPassword.tsx     ✅ Completo
│       ├── role-select.tsx       ⚠️  Funcional pero necesita ajuste (ver abajo)
│       ├── dashboard.tsx         ⚠️  Placeholder — solo muestra "YA ESTÁS DENTRO"
│       ├── dashboard-company.tsx ⚠️  Placeholder — solo muestra "YA ESTÁS DENTRO"
│       └── profile.tsx           ✅ Completo (foto de perfil, nickname, avatar)
├── components/
│   └── Sidebar.tsx               ⚠️  Funcional pero sin items por rol (ver abajo)
├── context/
│   ├── AuthContext.tsx           ⚠️  Funcional pero faltan campos business y admin (ver abajo)
│   └── ThemeContext.tsx          ✅ Completo
├── lib/
│   └── supabase.ts               ✅ Completo
├── styles/
│   └── appStyles.ts              ✅ Completo
└── Contexto-inicial.md           ← Archivo 01 de referencia
```

---

## Análisis detallado de archivos con deuda técnica

### `app/index.tsx` — Redirección incompleta

**Estado actual:** Solo contempla 3 casos.
```typescript
// LO QUE HAY HOY:
if (!profile?.role)         → /screens/role-select
if (role === 'company')     → /screens/dashboard-company
else                        → /screens/dashboard
```

**Lo que necesita para el MVP:**
```typescript
// LO QUE DEBE QUEDAR:
sin sesión                                          → /screens/home
role = 'admin'                                      → /screens/admin-dashboard
role = 'client'                                     → /screens/dashboard
role = 'company' + sin business                     → /screens/business-setup
role = 'company' + business.status = pending/rejected → /screens/business-pending
role = 'company' + business.status = approved       → /screens/dashboard-company
```

**Cambio requerido:** Agregar query a tabla `businesses` y manejar los 6 casos.

---

### `context/AuthContext.tsx` — Falta tipo y campo `business`

**Estado actual:**
- Tipo `Profile`: `{ id, nickname, avatar_url, role }` ✅
- Campo `business`: **no existe** ❌
- `navigateByRole`: solo maneja `client`, `company`, sin `admin` ❌
- `refreshProfile`: ✅ correcto, no navega
- `fetchProfile`: ✅ correcto, navega solo al cargar inicial

**Cambios requeridos:**
1. Agregar tipo `Business`:
```typescript
type Business = {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
};
```
2. Agregar estado `business: Business | null` al contexto.
3. En `fetchProfile`: si `role === 'company'`, hacer query a `businesses` y setear `business`.
4. En `refreshProfile`: igual, refrescar también `business` si aplica.
5. Agregar `business` al `AuthContextType` y al `Provider`.
6. En `navigateByRole`: agregar caso `'admin'` → `/screens/admin-dashboard`.

---

### `components/Sidebar.tsx` — Items iguales para todos los roles

**Estado actual:** Muestra exactamente los mismos items sin importar el rol.
- HOME → redirige a `/dashboard` o `/dashboard-company` según rol ✅ (ya tiene este condicional)
- PERFIL → `/screens/profile` ✅
- CERRAR SESIÓN ✅

**Cambios requeridos:** Agregar items distintos según rol:

```
Cliente:         HOME | EXPLORAR | MIS CITAS | PERFIL
Empresa aprobada: HOME | AGENDA | SERVICIOS | EMPLEADOS | MI NEGOCIO | PERFIL
Admin:           HOME | EMPRESAS | PERFIL
```

**Nota:** La pantalla `business-pending` NO debe tener Sidebar.

---

### `screens/role-select.tsx` — Necesita redirigir a `business-setup`

**Estado actual:** Al elegir `company` redirige directamente a `/screens/dashboard-company`.
```typescript
// HOY:
if (selected === 'company') router.replace('/screens/dashboard-company');
```

**Cambio requerido:** Al elegir `company` redirigir a `/screens/business-setup` (que aún no existe).
```typescript
// DEBE QUEDAR:
if (selected === 'company') router.replace('/screens/business-setup');
```

**Nota:** Este cambio se hace DESPUÉS de crear `business-setup.tsx`, no antes.

---

### `screens/dashboard.tsx` — Placeholder

**Estado actual:** Muestra animación de entrada + tarjetas con "ROL" y "ESTADO: Autenticado".
Estructuralmente está bien construido (usa ThemeContext, Sidebar, animaciones). Solo falta reemplazar el contenido placeholder por accesos reales al sistema de agendamiento.

**No tocar hasta la Fase 4.**

---

### `screens/dashboard-company.tsx` — Placeholder

**Estado actual:** Idéntico al dashboard de cliente, solo cambia el texto "Empresa".
Misma estructura, misma calidad. Solo falta el contenido real.

**No tocar hasta la Fase 3.**

---

## Tabla de supabase — Estado actual

| Tabla | Estado |
|---|---|
| `auth.users` | ✅ Existe (manejo por Supabase Auth) |
| `profiles` | ✅ Existe con campos: id, nickname, avatar_url, role |
| `service_categories` | ❌ No existe |
| `catalog_services` | ❌ No existe |
| `businesses` | ❌ No existe |
| `business_services` | ❌ No existe |
| `employees` | ❌ No existe |
| `employee_availability` | ❌ No existe |
| `appointments` | ❌ No existe |

---

## Buckets en Supabase Storage

| Bucket | Estado |
|---|---|
| `avatars` | ✅ Existe y funciona (con cache-busting implementado) |
| `business-logos` | ❌ No existe |
| `employee-photos` | ❌ No existe |

---

## Dependencias instaladas relevantes

Confirmadas en uso activo en el código:
- `expo-router` — navegación
- `expo-blur` — Sidebar
- `expo-image-picker` — subida de avatar en profile
- `@expo/vector-icons` (Feather) — iconos
- `@supabase/supabase-js` — cliente Supabase

---

## Orden exacto de próximos cambios (Fase 0 y Fase 1)

### Fase 0 — Todo en Supabase (sin tocar código)
1. Crear tabla `service_categories` + RLS
2. Crear tabla `catalog_services` + RLS
3. Crear tabla `businesses` + RLS
4. Crear tabla `business_services` + RLS
5. Crear tabla `employees` + RLS
6. Crear tabla `employee_availability` + RLS
7. Crear tabla `appointments` + RLS
8. Crear bucket `business-logos`
9. Crear bucket `employee-photos`
10. Activar Realtime en `appointments`
11. Insertar datos semilla: categorías + servicios base

### Fase 1 — Primeros cambios en código
1. Renombrar `.Md/` → `docs/`
2. Actualizar `AuthContext.tsx`: agregar tipo Business, campo business, caso admin en navigateByRole
3. Crear `screens/admin-dashboard.tsx`
4. Crear `screens/admin-businesses.tsx`
5. Crear `screens/admin-business-detail.tsx`
6. Actualizar `app/index.tsx`: lógica completa de redirección (6 casos)
7. Actualizar `app/_layout.tsx`: registrar pantallas nuevas
8. Actualizar `components/Sidebar.tsx`: items por rol
9. Crear `screens/business-setup.tsx`
10. Crear `screens/business-pending.tsx`
11. Actualizar `screens/role-select.tsx`: redirigir company a `business-setup`

---

## Patrones de diseño visual establecidos en el código

Observados en las pantallas existentes — **mantener consistencia**:

| Patrón | Detalle |
|---|---|
| Header | `flexDirection: row`, `paddingTop: 50`, hamburger izq. / label centro / toggle der. |
| Título principal | `fontSize: 32`, `fontWeight: '800'`, `letterSpacing: 1`, en mayúsculas |
| Subtítulo | `fontSize: 14`, `letterSpacing: 0.5` |
| Cards | `borderWidth: 1`, `borderRadius: 4-20`, `paddingHorizontal: 16`, `paddingVertical: 14` |
| Badge de estado | Punto de color + texto en mayúsculas con `letterSpacing: 3` |
| Botón primario | `backgroundColor: colors.primary (#E31937)`, `borderRadius: 14`, `paddingVertical: 16` |
| Animación entrada | `Animated.sequence` con delay 200ms + fade + slide desde Y=30 |
| Espaciado global | `paddingHorizontal: 28` en contenedor principal |
| Textos de menú | `fontSize: 13`, `letterSpacing: 2`, `fontWeight: '500'`, en mayúsculas |
