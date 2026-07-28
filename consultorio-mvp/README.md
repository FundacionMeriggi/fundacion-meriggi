# Fundación Meriggi — Gestión clínica

Aplicación para una institución de salud mental y adicciones, con identidad visual basada en el logo de Fundación Meriggi.

## Demo inmediata

Abrir `fundacion-meriggi.html` con Chrome. Es una demo autocontenida que funciona sin instalación y guarda los cambios en el navegador mediante `localStorage`.

Funciones disponibles en la demo:

- Panel institucional.
- Agenda y gestión de turnos.
- Alta de pacientes.
- Fichas, responsables y consentimiento.
- Evoluciones clínicas confidenciales.
- Alta y activación de integrantes del staff.
- Roles: administrador clínico, profesional y recepción.
- Preferencias de correo por integrante.
- Confirmaciones y recordatorios para pacientes.
- Resumen de próximos pacientes para el staff.
- Historial de comunicaciones.
- Configuración editable de la fundación.
- Exportación e importación de respaldos JSON.
- Diseño responsive con colores y logo de Fundación Meriggi.

La demo registra los correos como **simulados**. No almacena datos en un servidor y no debe utilizarse para historias clínicas reales.

## Proyecto Next.js

El código fuente incluye una aplicación Next.js/TypeScript y una ruta de servidor para enviar correos con Resend.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

### Activar envío real de correos

1. Crear una cuenta en Resend.
2. Verificar el dominio desde el que se enviarán los mensajes.
3. Copiar `.env.example` como `.env.local`.
4. Completar:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Fundación Meriggi <turnos@tudominio.com>
```

Sin estas variables, la aplicación conserva las comunicaciones en modo simulado.

## Base de datos y usuarios

Para uso real se recomienda Supabase:

1. Crear un proyecto Supabase.
2. Ejecutar `supabase/migrations/001_initial_schema.sql`.
3. Ejecutar `supabase/migrations/002_meriggi_features.sql`.
4. Conectar Supabase Auth y reemplazar el almacenamiento local por consultas al servidor.
5. Crear al primer usuario como `admin`.

El esquema incluye:

- Institución.
- Staff y roles.
- Profesionales.
- Pacientes y responsables.
- Turnos.
- Evoluciones clínicas sin borrado físico.
- Documentos.
- Consentimientos.
- Comunicaciones y preferencias de notificación.
- Auditoría.
- Row Level Security.

## Estado de la entrega

La interfaz, los flujos y el código de correo están implementados. Para publicarla y utilizar datos reales todavía hay que aportar y configurar cuentas externas: dominio, Supabase, Resend y hosting. También corresponde realizar pruebas de seguridad, backups y validación legal/profesional antes del uso clínico.
