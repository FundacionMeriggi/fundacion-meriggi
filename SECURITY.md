# Seguridad operativa

## Controles implementados

- Autenticación central y sesiones gestionadas por Supabase Auth.
- Contraseñas elegidas por cada usuario; la aplicación no almacena contraseñas.
- Invitaciones aleatorias de 256 bits, almacenadas únicamente como hash y con vencimiento.
- Roles y Row Level Security en todas las tablas expuestas.
- Separación entre datos administrativos y evoluciones clínicas.
- Notas privadas o compartidas con el equipo tratante.
- Versionado de evoluciones y auditoría inmutable para usuarios normales.
- Documentos en un bucket privado con enlaces temporales.
- Service role limitada a Edge Functions; nunca se expone al navegador.
- Sin datos ficticios ni pacientes precargados.
- Aplicación marcada para no indexación en buscadores.

## Antes de iniciar el uso clínico

- Revisar términos, privacidad, consentimiento y protocolos con asesoramiento legal local.
- Definir responsable institucional de seguridad y respuesta ante incidentes.
- Configurar MFA para administradores si el proveedor lo permite en el plan utilizado.
- Configurar proveedor de correo, dominio autorizado y remitente institucional.
- Probar restauración de backups, no solo su existencia.
- Revisar periódicamente usuarios activos, permisos y registros de auditoría.
- Capacitar al staff para no compartir cuentas ni enviar información clínica por correo.
- Formalizar alta, baja y bloqueo inmediato de personal.
- Ejecutar pruebas funcionales y de seguridad antes de cargar pacientes reales.
