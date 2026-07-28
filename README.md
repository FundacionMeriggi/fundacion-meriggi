# Fundación Meriggi — sistema de gestión clínica

Producto web de uso interno y portal de pacientes para Fundación Meriggi. Reemplaza la demostración HTML anterior y utiliza una base de datos central, autenticación real y permisos por rol.

## Incluido

- Sitio público institucional en la portada, separado de la aplicación privada.
- Autenticación con usuario o correo y contraseña personal.
- Invitaciones de un solo uso para que cada integrante elija su contraseña.
- Administrador total, administradora/profesional, Secretaría, profesionales y pacientes.
- Agenda diaria, turnos recurrentes, sobreturnos, bloqueos, estados y modalidad presencial o virtual.
- Alta y edición de fichas de pacientes sin datos ficticios.
- Asignación de profesionales por paciente.
- Historia clínica cronológica, versiones y auditoría.
- Grupos y talleres con participantes permanentes.
- Lista de espera, solicitudes, caja, pagos y reportes CSV.
- Alta de nuevos integrantes desde el panel de administración.
- Comunicaciones y recordatorios.
- Portal permanente del paciente con turnos, solicitudes, documentos compartidos y contacto.
- Base privada de documentos.
- Publicación automática en GitHub Pages.
- Backend en Supabase con políticas RLS y funciones seguras.

## Desarrollo local

1. Copiar `.env.example` como `.env.local`.
2. Completar la URL y la publishable key del proyecto de Supabase.
3. Ejecutar `npm install`.
4. Ejecutar `npm run dev`.

La portada pública funciona sin una sesión. El ingreso, la activación, la
recuperación y los paneles privados requieren la conexión con Supabase.

## Staff precargado

El esquema carga exclusivamente el staff informado por Fundación Meriggi. No crea pacientes, turnos ni historias ficticias.

## Activación inicial

La primera activación corresponde a Ignacio Simari. El código utilizado es el valor del secreto `BOOTSTRAP_SECRET` configurado en GitHub/Supabase. Solo funciona mientras la cuenta de Ignacio todavía no fue vinculada.

1. Abrir `/activar/`.
2. Ingresar el valor privado de `BOOTSTRAP_SECRET`.
3. Elegir una contraseña de al menos 10 caracteres.
4. Ingresar con `ignacio.simari`.
5. Desde **Equipo y usuarios**, generar las invitaciones del resto del staff.

## Variables públicas de GitHub Actions

Crear estos secretos en **Settings → Secrets and variables → Actions**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `BOOTSTRAP_SECRET`
- `REMINDER_WEBHOOK_SECRET`

Opcionales para correo real:

- `RESEND_API_KEY`
- `MAIL_FROM`

No guardar la service-role key en el repositorio ni usarla en el navegador.

## Puesta en marcha

1. Crear un proyecto vacío en Supabase.
2. Cargar los secretos anteriores en GitHub.
3. Ejecutar manualmente **Actions → Actualizar base de datos → Run workflow**.
4. Ejecutar **Actions → Publicar aplicación → Run workflow**.
5. Activar a Ignacio y generar las invitaciones restantes.

## Seguridad y operación

- GitHub Pages publica solamente la interfaz; los datos permanecen en Supabase.
- Todas las tablas expuestas tienen RLS.
- Secretaría no puede leer evoluciones clínicas.
- Los pacientes solo acceden a su ficha, sus turnos y documentos expresamente compartidos.
- Las evoluciones no se eliminan desde la aplicación y sus modificaciones generan versiones.
- La auditoría registra altas y cambios importantes.
- El bucket de documentos es privado.

Antes de uso clínico real deben completarse revisión legal, política de privacidad, consentimiento informado digital, responsables de tratamiento, protocolo de incidentes, backups verificados y capacitación del staff.


## Guía completa

Consultar `docs/PUESTA-EN-MARCHA.md` y `RELEASE-NOTES.md`.
