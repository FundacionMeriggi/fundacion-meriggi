-- Usuarios, roles y especialidades para Fundación Meriggi.
-- Ejecutar después de 001_initial_schema.sql y 002_meriggi_features.sql.

create extension if not exists citext;

alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles
set role = 'secretary'
where role = 'reception';

alter table public.profiles
  add column if not exists username citext,
  add column if not exists email text,
  add column if not exists specialty text,
  add column if not exists license_number text,
  add column if not exists calendar_color text not null default '#f5bc26',
  add column if not exists must_change_password boolean not null default true,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set specialty = case
  when role = 'secretary' then 'secretary'
  when role = 'admin' then coalesce(specialty, 'administrative')
  else coalesce(specialty, 'psychologist')
end
where specialty is null;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin','professional','secretary'));

alter table public.profiles
  add constraint profiles_specialty_check
  check (
    (role = 'secretary' and specialty = 'secretary')
    or
    (role in ('admin','professional') and specialty in ('psychologist','group_operator','administrative','workshop'))
  );

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username::text))
  where username is not null;

create index if not exists profiles_clinic_role_idx
  on public.profiles (clinic_id, role, active);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and active = true
$$;

create or replace function public.current_user_specialty()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select specialty
  from public.profiles
  where id = auth.uid() and active = true
$$;

-- El administrador puede crear, editar y desactivar perfiles de su clínica.
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
for all using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() = 'admin'
) with check (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() = 'admin'
);

-- Reemplaza políticas que todavía mencionaban reception.
drop policy if exists "authorized staff create patients" on public.patients;
create policy "authorized staff create patients" on public.patients
for insert with check (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
);

drop policy if exists "authorized staff update patients" on public.patients;
create policy "authorized staff update patients" on public.patients
for update using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
) with check (clinic_id = public.current_clinic_id());

drop policy if exists "staff manage appointments" on public.appointments;
create policy "staff manage appointments" on public.appointments
for all using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
) with check (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
);

-- Secretaría puede ver datos administrativos, pero nunca evoluciones clínicas.
drop policy if exists "professionals read clinical notes" on public.clinical_notes;
create policy "clinical staff read clinical notes" on public.clinical_notes
for select using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional')
);

drop policy if exists "professionals create clinical notes" on public.clinical_notes;
create policy "clinical staff create clinical notes" on public.clinical_notes
for insert with check (
  clinic_id = public.current_clinic_id()
  and created_by = auth.uid()
  and public.current_user_role() in ('admin','professional')
);

drop policy if exists "professionals annul clinical notes" on public.clinical_notes;
create policy "clinical staff annul clinical notes" on public.clinical_notes
for update using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional')
) with check (clinic_id = public.current_clinic_id());

drop policy if exists "professionals read patient files" on public.patient_files;
create policy "clinical staff read patient files" on public.patient_files
for select using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional')
);

drop policy if exists "professionals upload patient files" on public.patient_files;
create policy "clinical staff upload patient files" on public.patient_files
for insert with check (
  clinic_id = public.current_clinic_id()
  and uploaded_by = auth.uid()
  and public.current_user_role() in ('admin','professional')
);

-- Las preferencias pueden ser administradas por el administrador.
drop policy if exists "authorized users create communications" on public.communications;
create policy "authorized users create communications" on public.communications
for insert with check (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
);

drop policy if exists "clinical users read consents" on public.patient_consents;
create policy "authorized users read consents" on public.patient_consents
for select using (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
);

drop policy if exists "authorized users record consents" on public.patient_consents;
create policy "authorized users record consents" on public.patient_consents
for insert with check (
  clinic_id = public.current_clinic_id()
  and public.current_user_role() in ('admin','professional','secretary')
);

-- Sin política DELETE para perfiles: se desactivan con active=false para conservar auditoría.
