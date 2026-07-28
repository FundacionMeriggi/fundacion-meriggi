-- Activación de cuentas: cada integrante elige su propia contraseña.
-- Ejecutar después de 003_user_accounts_and_roles.sql.

alter table public.profiles
  add column if not exists auth_email text,
  add column if not exists activation_token_hash text,
  add column if not exists activation_expires_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists invitation_sent_at timestamptz;

update public.profiles
set auth_email = coalesce(auth_email, email)
where auth_email is null and email is not null;

create unique index if not exists profiles_auth_email_unique_idx
  on public.profiles (lower(auth_email))
  where auth_email is not null;

create index if not exists profiles_pending_activation_idx
  on public.profiles (clinic_id, activation_expires_at)
  where activation_token_hash is not null;

-- Los tokens de activación nunca se exponen mediante RLS al personal común.
-- Las rutas de servidor los gestionan exclusivamente con la service role.
