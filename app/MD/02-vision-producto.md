# 02 — Visión de Producto y Análisis de Mercado

## Nombre del proyecto
**Agenda** — App de agendamiento de horas para servicios de belleza, bienestar y cuidado personal.

---

## Problema que resuelve
Negocios de servicios (barberías, salones de belleza, uñas, pestañas, gimnasios, etc.) siguen gestionando sus citas por WhatsApp, llamadas o agendas en papel. Esto genera:
- Pérdida de horas por no-shows
- Confusión de horarios
- Trabajo administrativo innecesario para el negocio
- Experiencia torpe para el cliente

---

## Propuesta de valor

| Para el cliente | Para la empresa |
|---|---|
| Reservar en segundos, 24/7, desde el celular | Recibir reservas sin intervención manual |
| Ver disponibilidad en tiempo real | Gestionar agenda y servicios desde un panel propio |
| Historial de sus citas | Ver todas las reservas del día ordenadas |
| Elegir el profesional de su preferencia | Controlar disponibilidad por empleado y por día |

---

## Análisis de competidores directos

### Fresha (referente principal)
- Líder global. Más de 450.000 negocios en 120+ países.
- Modelo freemium: básico gratis, cobra comisión en marketplace.
- **Lo que hace bien:** UX limpio, onboarding rápido, recordatorios automáticos, multi-profesional.
- **Lo que hace mal:** Cobro 20% por clientes del marketplace, soporte deficiente, UI del lado cliente difícil para encontrar el mismo barbero/estilista.
- **Oportunidad:** Experiencia más simple y directa, sin marketplace con comisiones ocultas.

### Booksy
- Fuerte en América Latina y EEUU para barberías.
- **Oportunidad:** Booksy cobra subscripción mensual. Nosotros podemos empezar sin cobrar.

### AgendaPro
- Referente hispanohablante. Enfocado en salones y centros médicos.
- **Oportunidad:** Experiencia más ligera para negocios pequeños y medianos.

### SimplyBook / Noona
- Buenos en personalización pero curva de aprendizaje alta.
- **Oportunidad:** Setup en minutos, no en horas.

---

## Modelo de negocio (decisiones tomadas)

### Registro de empresas: aprobación manual por admin desde la app
- La empresa se registra y completa su onboarding.
- Queda en estado `pending` — ve una pantalla de "en revisión" y no puede hacer nada más.
- El admin aprueba o rechaza desde una **pantalla de administración dentro de la misma app** (funciona en iOS, Android y Web gracias a Expo).
- Solo tras aprobación la empresa puede configurar su negocio y recibir reservas.
- Diferenciador de confianza: garantiza que solo negocios verificados aparecen para los clientes.

### Catálogo de servicios: definido por el admin, personalizado por la empresa
- El admin crea las **categorías** (ej: `Barbería`, `Salón de Belleza`, `Uñas`) y sus **servicios base**.
- La empresa selecciona qué servicios del catálogo ofrece y **les asigna su propio precio y duración**.
- Estandariza nombres para búsquedas consistentes entre negocios.

### Empleados: perfiles sin login propio, con agenda individual
- La empresa crea sus empleados como perfiles internos (nombre, foto, especialidades).
- Los empleados **no tienen cuenta propia** en el MVP.
- **Cada empleado tiene su propia disponibilidad horaria** independiente.
- Flujo de agendamiento: empresa → servicio → **profesional disponible** → fecha/hora.
- Arquitectura preparada para login propio de empleados en el futuro.

### Monetización futura
- Subscripción mensual por empresa (modelo SaaS), no comisión por reserva.

---

## Plataformas objetivo
- **Una sola base de código** en React Native Expo que compila para **iOS, Android y Web**.
- El panel de admin es accesible desde cualquiera de las tres plataformas.
- Prioridad de desarrollo: Web primero para pruebas, luego mobile.

---

## Alcance del MVP
El MVP debe cubrir el ciclo completo mínimo viable:

1. Admin aprueba una empresa desde la pantalla de administración (dentro de la app).
2. Empresa aprobada configura: empleados, selecciona servicios del catálogo (con precio/duración propia) y disponibilidad por empleado.
3. Cliente busca empresa, elige servicio, elige profesional, elige fecha y hora disponible.
4. Reserva queda confirmada y visible para ambas partes.
5. Cliente puede ver y cancelar sus citas.
6. Empresa ve todas las reservas de su agenda.

**Sin pagos en el MVP.** Sin notificaciones push externas en el MVP (solo in-app).

---

## Lo que viene después del MVP (backlog estratégico)
- Pantalla de admin para gestionar catálogo de servicios desde la app
- Notificaciones push reales (Expo Notifications + Supabase Edge Functions)
- Email de recordatorio automático 24h antes
- Login propio para empleados con vista de su propia agenda
- Reseñas y valoraciones post-servicio
- Panel de estadísticas para la empresa
- Pasarela de pago (MercadoPago para LATAM)
- Link público de reserva por empresa (tipo Calendly)
