
#### ¿El negocio define si la cita requiere confirmación manual o es automática?

#### Validación de pagos

Dentro de la app el usuario client puede adjuntar screenshot del comprobante del abono o pago una vez verificado manualmente por el negocio este confirma la cita, mi idea es que ocurra todo dentro de la app.

Cliente agenda + sube comprobante
↓
Supabase DB (insert en tabla "citas")
↓
Database Webhook se dispara automáticamente
↓
Edge Function → Resend API
↓
📧 Email al barbero: "Nueva cita, verifica el pago"
📧 Email al cliente: "Tu cita está pendiente de confirmación"

Barbero confirma en la app
↓
📧 Email al cliente: "¡Cita confirmada para las 13:00!"

### ¿Es gratis?

Resend ofrece **3.000 emails/mes gratis**. Para una barbería con 20–100 citas al mes, nunca vas a pasarte del límite

----------------------------------------
#### Opciones que darán plus a las pymes

-mejorar la vista de los trabajadores en la agenda del rol company y client, utiliza la guia docs/Guia-VISTA-DE-TRABAJADORES-EN-LA-AGENDA.png. soluciona el error que está en la imagen docs/ERROR-GRID-desajustado.png 
-mejorar vista en docs/Error-ajustar-ingresos-y-horarios-en-ajustar-a-todas-las-screensdashboards.png

REALIZAME PREGUNTAS ANTES DE COMENZAR A CODEAR Y RECOMENDACIONES VAMOS PASO A PASO.

- La vista de ingresos en dashboard company, que muestre numeros, asi coomo en historial que muestra ingresos, manten la opción que sean valores diarios, semanales o mensuales.