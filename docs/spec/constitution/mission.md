# Misión

Nucora es un SaaS en la nube de agendamiento y CRM para negocios que dependen de reserva de horas y atención al público (salones, barberías, centros de estética, spas, clínicas de salud, centros deportivos).

## Problema

1. **Fricción operativa** — coordinación manual de citas por teléfono/chat.
2. **Inasistencias y cancelaciones tardías** — sin reglas de negocio que protejan el tiempo del profesional (ej. bloquear cancelación con <2h de anticipación).
3. **Falta de visibilidad para PyMEs** — sin un lugar único para gestionar agendas multi-trabajador.
4. **Experiencia fragmentada para clientes** — sin una app unificada para explorar negocios y gestionar todas sus citas.

## Para quién

- **Cliente final**: agenda, reagenda y cancela citas 24/7 sin fricción.
- **Negocio (company/worker)**: gestiona agenda multi-trabajador, catálogo de servicios y CRM de clientes en un solo lugar.
- **Admin (Nucora)**: supervisa y modera negocios en la plataforma.

## Modelo

SaaS multi-tenant: cada negocio es un tenant aislado vía RLS en Supabase. Cada negocio obtiene un enlace público de reserva (`/{slug}`) con necesidad de login para el cliente final.
