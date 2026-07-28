# Puesta en marcha — Fundación Meriggi

Este documento describe la publicación del producto real. La página HTML anterior no se utiliza como base de datos ni como sistema de autenticación.

## 1. Servicios utilizados

- **GitHub Pages:** publica la interfaz web y la PWA.
- **Supabase:** autenticación, base de datos, permisos, documentos privados y funciones de servidor.
- **Resend (opcional al inicio):** envío real de invitaciones, confirmaciones y recordatorios por correo.

No se necesita Vercel.

## 2. Crear el proyecto de Supabase

1. Crear un proyecto nuevo y vacío.
2. Guardar de forma privada la contraseña de la base de datos.
3. En la configuración de API copiar:
   - URL del proyecto.
   - Publishable key.
   - Project reference.
4. Crear un access token personal para automatizaciones.
5. En Authentication → URL Configuration agregar:
   - Site URL: `https://fundacionmeriggi.github.io/fundacion-meriggi`
   - Redirect URL: `https://fundacionmeriggi.github.io/fundacion-meriggi/recuperar/`

Nunca enviar por chat la contraseña de la base de datos, access token o claves secretas.

## 3. Subir el producto al repositorio

Los archivos de este paquete deben quedar en la **raíz** de `FundacionMeriggi/fundacion-meriggi`.

La raíz debe mostrar, entre otros:

- `app`
- `components`
- `supabase`
- `.github`
- `package.json`
- `next.config.mjs`

La carpeta antigua `consultorio-mvp` puede conservarse temporalmente hasta comprobar la nueva versión, pero no forma parte del producto nuevo.

## 4. Secretos de GitHub Actions

En GitHub: Settings → Secrets and variables → Actions → New repository secret.

Crear:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `BOOTSTRAP_SECRET`
- `REMINDER_WEBHOOK_SECRET`

Los dos últimos deben ser valores aleatorios largos y diferentes. Ejemplo de generación local:

```bash
openssl rand -base64 36
```

Para correos reales, agregar después:

- `RESEND_API_KEY`
- `MAIL_FROM`

## 5. Ejecutar la instalación

1. GitHub → Actions → **Actualizar base de datos** → Run workflow.
2. Confirmar que finalice en verde.
3. Settings → Pages → Source: **GitHub Actions**.
4. Actions → **Publicar aplicación** → Run workflow.
5. Confirmar que finalice en verde.
6. Actions → **Recordatorios de turnos** → Run workflow para probar la conexión.

## 6. Activación inicial

Abrir:

`https://fundacionmeriggi.github.io/fundacion-meriggi/activar/`

Ingresar el valor privado de `BOOTSTRAP_SECRET` y elegir la contraseña de Ignacio. Después ingresar como `ignacio.simari`.

Desde **Equipo y usuarios** se generan invitaciones individuales para el resto. Cecilia, al no tener correo, recibe el enlace por un canal privado. Cada enlace vence en 72 horas y solo puede usarse una vez.

## 7. Orden recomendado de configuración

1. Completar teléfono, correo institucional y dirección.
2. Revisar roles y matrículas del staff.
3. Definir si el portal permite solicitar turnos, cancelar o pedir reprogramación.
4. Crear pacientes reales.
5. Asignar profesionales.
6. Generar acceso del paciente cuando corresponda.
7. Configurar correo real y probar invitaciones.
8. Probar permisos con una cuenta de cada rol antes de cargar historias clínicas.

## 8. Pruebas obligatorias antes de uso clínico

- Secretaría no puede abrir evoluciones clínicas.
- Un profesional no puede ver pacientes no asignados.
- Un paciente solo ve su propia información.
- Los documentos privados no tienen URL pública.
- El bloqueo de agenda impide superposiciones salvo sobreturno autorizado.
- Las modificaciones de evoluciones conservan versión anterior.
- Las cuentas bloqueadas pierden acceso.
- Los backups y la recuperación fueron comprobados.

