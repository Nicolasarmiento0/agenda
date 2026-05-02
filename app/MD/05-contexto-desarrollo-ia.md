# 05 — Contexto de Desarrollo para IA

> Este archivo es el punto de entrada para cualquier IA que colabore en el proyecto.
> Leer este archivo COMPLETO antes de tocar cualquier código.

---

## ¿Qué es este proyecto?
App de agendamiento de citas para negocios de servicios (barberías, salones de belleza, uñas, pestañas, gimnasios, etc.). Una sola base de código en **React Native Expo** que compila para **iOS, Android y Web**. Backend en **Supabase**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React Native con Expo SDK (TypeScript) |
| Routing | Expo Router (file-based, carpeta `app/`) |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Estilos | StyleSheet nativo + ThemeContext propio |
| Iconos | `@expo/vector-icons` (Feather) |
| Blur | `expo-blur` (Sidebar) |
| Navegación | `expo-router` (`router.push`, `router.replace`, `useFocusEffect`) |

---

## Roles de usuario

| Rol | Valor en DB | Descripción |
|---|---|---|
| Cliente | `'client'` | Busca empresas, agenda citas, ve su historial |
| Empresa | `'company'` | Gestiona negocio, empleados, servicios, ve reservas |
| Admin | `'admin'` | Aprueba empresas, gestiona catálogo de servicios |

---

## Estados de una empresa (`businesses.status`)

| Estado | Descripción | Lo que ve la empresa |
|---|---|---|
| `pending` | Recién registrada, sin revisar | Pantalla bloqueante "en revisión". Sin acciones. |
| `approved` | Aprobada por el admin | Acceso completo: dashboard, agenda, servicios, empleados |
| `rejected` | Rechazada por el admin | Pantalla con mensaje de rechazo. Solo puede cerrar sesión. |
| `suspended` | Suspendida temporalmente | Igual que `rejected` |

**Regla crítica:** Solo las empresas con `status = 'approved'` aparecen visibles para los clientes.

---

## Lógica de redirección en `index.tsx`

```
sin sesión                                          → /screens/home
sesión + role = 'admin'                             → /screens/admin-dashboard
sesión + role = 'client'                            → /screens/dashboard
sesión + role = 'company' + sin business            → /screens/business-setup
sesión + role = 'company' + status pending/rejected → /screens/business-pending
sesión + role = 'company' + status approved         → /screens/dashboard-company
```

---

## Contexto de autenticación (AuthContext)

```typescript
session: Session | null
user: User | null
profile: Profile | null       // { id, nickname, avatar_url, role }
business: Business | null     // { id, name, status } — solo cuando role = 'company'
loading: boolean
profileLoaded: boolean
refreshProfile: () => Promise<void>   // re-fetch SIN navegar
updateProfileState: (updates) => void // actualiza estado local
signOut: () => Promise<void>
```

**Regla crítica:** `refreshProfile()` solo actualiza datos, NUNCA navega.

---

## Contexto de tema (ThemeContext)

```typescript
isDarkMode: boolean
toggleTheme: () => void
colors: {
  background, surface, border,
  primary,        // #E31937 (rojo)
  textPrimary, textSecondary,
  white, black, error
}
```

**Regla absoluta:** Nunca hardcodear colores. Siempre `colors.X` del ThemeContext.

---

## Tablas en Supabase

### Existentes
| Tabla | Campos clave |
|---|---|
| `profiles` | id, nickname, avatar_url, role |

### A crear (ver `03-base-de-datos.md` para SQL completo)
| Tabla | Descripción |
|---|---|
| `service_categories` | Categorías del catálogo. Creadas por el admin. |
| `catalog_services` | Servicios base por categoría. Creados por el admin. |
| `businesses` | Perfil del negocio + status de aprobación. |
| `business_services` | Pivot: servicios del catálogo que ofrece cada empresa, con precio y duración propios. |
| `employees` | Empleados del negocio. Sin login propio en MVP. |
| `employee_availability` | Disponibilidad semanal por empleado (día, inicio, fin, duración de slot). |
| `appointments` | Reservas: cliente + empleado + servicio + fecha/hora + status. |

---

## Flujo de agendamiento (orden exacto)

1. Cliente selecciona empresa (solo `approved`)
2. Cliente selecciona **servicio** (de `business_services` activos de esa empresa)
3. Cliente selecciona **profesional** (empleados activos del negocio)
4. Se consulta `employee_availability` para ese empleado según día de semana
5. Se generan slots y se restan citas `confirmed` del empleado en esa fecha
6. Cliente elige slot disponible
7. Pantalla de confirmación → INSERT en `appointments`

---

## Estructura de pantallas

Ver `04-pantallas-y-flujos.md` para el detalle completo.

**Resumen de pantallas nuevas (22 total):**
- 9 flujo cliente: explore, business-detail, booking-service/professional/datetime/confirm/success, my-appointments, appointment-detail
- 10 flujo empresa: business-setup, business-pending, dashboard-company(mod), company-calendar, company-appointment-detail, company-services, company-service-config, company-employees, company-employee-form, company-profile
- 3 flujo admin: admin-dashboard, admin-businesses, admin-business-detail

---

## Patrón de pantalla estándar

```typescript
export default function MiScreen() {
  const { profile, user, business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tabla')
        .select('*')
        .eq('campo', valor);
      if (error) throw error;
      setData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  if (loading) return <ActivityIndicator />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Contenido */}
    </View>
  );
}
```

---

## Convenciones de código

- **TypeScript estricto** — tipar todo. No usar `any` salvo excepciones justificadas.
- **Nombres de archivos** — kebab-case: `booking-datetime.tsx`
- **Nombres de componentes** — PascalCase: `BookingDateTimeScreen`
- **Colores** — siempre desde `useTheme()`, nunca hardcodeados
- **Navegación** — `router.replace()` para flujos de auth/rol, `router.push()` para flujo normal
- **Datos** — nunca borrar registros; usar `is_active = false` o cambiar `status`
- **Errores** — siempre `try/catch` + `Alert.alert('Error', error.message)`
- **Listas vacías** — siempre mostrar componente `EmptyState`
- **Carga** — siempre `ActivityIndicator` mientras `loading = true`

---

## Reglas que NO se deben romper

1. **No hardcodear colores** — siempre ThemeContext
2. **No navegar desde `refreshProfile()`** — solo actualiza datos
3. **No borrar registros en DB** — solo desactivar o cambiar status
4. **No crear pantallas sin registrarlas en `_layout.tsx`**
5. **No mostrar empresas con `status != 'approved'` a los clientes**
6. **No permitir reservas en empleados sin disponibilidad configurada**
7. **No calcular slots disponibles sin restar las citas ya confirmadas** del empleado en esa fecha
8. **No usar `AsyncStorage` para datos de negocio** — todo va a Supabase
9. **La pantalla `business-pending` no tiene Sidebar ni navegación** — es bloqueante
10. **Solo usuarios con `role = 'admin'` pueden cambiar `businesses.status`**
