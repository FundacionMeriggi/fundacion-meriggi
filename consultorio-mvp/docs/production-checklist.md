# Checklist de publicación — Fundación Meriggi

## Infraestructura

- [ ] Dominio propio y HTTPS obligatorio.
- [ ] Proyecto Supabase de producción en una región adecuada.
- [ ] Base de datos con las migraciones 001 y 002.
- [ ] Backups automáticos y restauración probada.
- [ ] Proyecto Resend con dominio verificado.
- [ ] Hosting con variables de entorno protegidas.

## Acceso y seguridad

- [ ] Autenticación real y recuperación de contraseña.
- [ ] Doble factor para administradores y perfiles clínicos.
- [ ] Row Level Security habilitado en todas las tablas expuestas.
- [ ] Recepción sin acceso a evoluciones clínicas.
- [ ] Sesiones con vencimiento y cierre remoto.
- [ ] Registro de accesos y cambios sensibles.
- [ ] Cifrado en tránsito y controles del proveedor sobre datos en reposo.
- [ ] Revisión de permisos de almacenamiento de archivos.

## Datos clínicos

- [ ] Formularios de consentimiento definidos por la institución.
- [ ] Política de acceso a historias clínicas aprobada.
- [ ] Evoluciones sin eliminación física; anulación con motivo y auditoría.
- [ ] Procedimiento de exportación de historia clínica.
- [ ] Protocolo para corrección de datos.
- [ ] Política de retención y eliminación conforme a asesoramiento legal.

## Comunicaciones

- [ ] Plantillas aprobadas sin información clínica sensible en el asunto.
- [ ] Preferencias de contacto del paciente registradas.
- [ ] Consentimiento para los canales utilizados.
- [ ] Manejo de rebotes, direcciones inválidas y bajas.
- [ ] Tareas programadas para recordatorios y resumen diario.

## Operación

- [ ] Pruebas con datos ficticios.
- [ ] Capacitación del staff.
- [ ] Manual de contingencia ante caída del sistema.
- [ ] Responsable interno de accesos y altas/bajas.
- [ ] Revisión técnica y legal antes de cargar información real.

## Usuarios y permisos

- [ ] Ejecutar `003_user_accounts_and_roles.sql` después de las migraciones 001 y 002.
- [ ] Crear el primer usuario administrador desde un entorno seguro.
- [ ] Comprobar que cada nombre de usuario sea único.
- [ ] Exigir contraseñas de al menos 12 caracteres para producción.
- [ ] Activar protección contra contraseñas filtradas y MFA para administradores.
- [ ] Confirmar que secretaría no puede consultar `clinical_notes` ni `patient_files`.
- [ ] Confirmar que profesionales solo accedan a los pacientes autorizados.
- [ ] Registrar creación, cambio de rol, desactivación y restablecimiento de claves en auditoría.
- [ ] Nunca compartir `SUPABASE_SERVICE_ROLE_KEY` ni incluirla en GitHub.
