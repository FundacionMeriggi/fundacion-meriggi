# Fundación Meriggi — Sistema de gestión clínica

Aplicación web interna para la **Fundación Meriggi**, orientada a la gestión de salud mental y adicciones.

## Funciones incluidas en el prototipo

- Panel general de actividad.
- Agenda diaria y gestión de turnos.
- Registro y búsqueda de pacientes.
- Ficha de paciente e historia de evoluciones.
- Gestión de profesionales y personal administrativo.
- Roles previstos: administrador, profesional y recepción.
- Configuración institucional y reglas de notificación.
- Confirmaciones y recordatorios por correo mediante Resend.
- Exportación e importación de respaldos locales.
- Esquema PostgreSQL/Supabase con políticas RLS y auditoría.
- Diseño responsive con identidad visual de Fundación Meriggi.

## Estado del proyecto

La interfaz funciona actualmente como **MVP con datos ficticios y persistencia local en el navegador**. No debe utilizarse todavía con datos clínicos reales.

Para producción faltan conectar Supabase Auth y las consultas reales, configurar el envío de correos, automatizar recordatorios, probar permisos, backups y realizar una revisión técnica y legal.

## Ejecución local

Requisitos: Node.js 20.9 o superior.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Variables de entorno

Copiar `.env.example` como `.env.local` y completar:

```env
RESEND_API_KEY=
EMAIL_FROM=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Nunca subir `.env.local`, contraseñas ni claves privadas al repositorio.

## Base de datos

Las migraciones iniciales están en:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_meriggi_features.sql`

Deben ejecutarse en orden desde el SQL Editor de Supabase.

## Seguridad clínica

Antes de cargar pacientes reales, revisar y completar `docs/production-checklist.md`.

El sistema de producción debe garantizar confidencialidad, acceso autorizado, integridad, disponibilidad, trazabilidad, backups y separación efectiva entre información administrativa y clínica.

## Actualización: usuarios, claves y roles

La versión actual incorpora dos niveles de implementación:

### Demo publicada en GitHub Pages

El archivo `fundacion-meriggi.html` incluye un acceso local por usuario y contraseña, panel de usuarios y vistas diferenciadas por rol:

- **Administrador:** control completo, creación de usuarios, cambio de roles y contraseñas.
- **Secretaría:** agenda, pacientes administrativos y comunicaciones; no puede leer evoluciones clínicas.
- **Profesional:** agenda propia, pacientes asignados y evoluciones clínicas.

Especialidades disponibles para profesionales:

- Psicólogo
- Operador de grupo
- Administrativo
- Taller

Los accesos demostrativos están indicados en la pantalla de inicio. Este modo usa `localStorage` y es únicamente para pruebas; no debe contener datos clínicos reales.

### Producción con Supabase Auth

Se agregaron:

- Inicio de sesión con nombre de usuario y contraseña.
- Rutas de servidor para crear usuarios, editar perfiles y restablecer contraseñas.
- Roles `admin`, `secretary` y `professional`.
- Especialidades `psychologist`, `group_operator`, `administrative` y `workshop`.
- Políticas RLS que impiden a secretaría leer evoluciones y archivos clínicos.
- Migración `003_user_accounts_and_roles.sql`.

Supabase Auth almacena las contraseñas; la aplicación nunca debe guardar contraseñas en tablas propias ni en el navegador en producción.

## Activación de cuentas

La versión actual incluye un flujo donde **cada integrante elige su propia contraseña**:

1. El administrador crea o importa el integrante del staff.
2. El servidor genera un token de activación de un solo uso, válido por 48 horas.
3. Si la persona tiene correo, recibe un enlace de activación.
4. Si no tiene correo —como Cecilia Simari— el administrador entrega el enlace o código personalmente.
5. La persona crea su contraseña; administración no puede verla ni definirla.
6. Para recuperar el acceso, el administrador genera una nueva invitación, que invalida la contraseña anterior.

La nómina inicial se encuentra en `data/staff-inicial.json`.

En la demo estática de GitHub Pages, Ignacio puede activar el acceso inicial con:

```text
Usuario: ignacio.simari
Código: MERIGGI-IGNACIO
```

Esta activación estática sirve únicamente para probar la interfaz. Las cuentas compartidas entre dispositivos requieren desplegar la aplicación Next.js y configurar Supabase.
