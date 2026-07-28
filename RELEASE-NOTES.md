# Fundación Meriggi — versión 1.0.0

## Producto incluido

- Autenticación real con usuario o correo.
- Contraseña elegida por cada persona mediante invitación de un solo uso.
- Recuperación de contraseña.
- Roles: administrador total, administradora/profesional, Secretaría, profesional y paciente.
- Staff real precargado; no hay pacientes ficticios.
- Alta y edición de pacientes.
- Agenda diaria, turnos recurrentes, sobreturnos, bloqueos, estados y modalidades.
- Solicitudes de nuevos turnos y reprogramaciones desde el portal.
- Historia clínica longitudinal con privacidad, versionado y auditoría.
- Asignación de equipo tratante.
- Grupos y talleres de larga duración.
- Documentos privados y archivos compartidos con pacientes.
- Lista de espera.
- Caja y pagos.
- Comunicaciones, confirmaciones y recordatorios.
- Reportes CSV.
- Portal permanente del paciente.
- PWA instalable en celulares.
- Despliegue automatizado de interfaz, base de datos y funciones.

## Seguridad aplicada

- Row Level Security en todas las tablas expuestas.
- La service-role key nunca se utiliza en el navegador.
- Secretaría sin acceso a evoluciones clínicas.
- Enlaces de activación almacenados como hash, con vencimiento y un solo uso.
- Bucket clínico privado con URLs firmadas temporales.
- Evoluciones sin borrado desde la aplicación y con versiones anteriores.
- Auditoría de cambios relevantes.
- Protección del administrador total y validación de nombres de usuario.
- Correos con contenido escapado para evitar inyección HTML.

## Estado de entrega

El código, esquema, funciones y automatizaciones están terminados como versión 1.0.0. Para habilitar el uso real falta desplegar el paquete en un proyecto de Supabase autorizado por Fundación Meriggi y ejecutar las pruebas de aceptación indicadas en `docs/PUESTA-EN-MARCHA.md`.
