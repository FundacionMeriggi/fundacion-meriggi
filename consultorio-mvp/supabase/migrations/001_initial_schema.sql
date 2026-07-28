-- Esquema inicial para un consultorio. Ejecutar en Supabase SQL Editor.
-- Mantiene clinic_id para permitir varias sedes en el futuro sin convertirlo en SaaS.

create extension if not exists pgcrypto;

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','professional','reception')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  specialty text,
  license_number text,
  appointment_duration_minutes integer not null default 30,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  document_number text,
  birth_date date,
  phone text,
  email text,
  insurer text,
  plan text,
  allergies text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','confirmed','arrived','attended','absent','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','coverage','waived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null,
  evolution text not null,
  diagnosis text,
  indications text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  annulled_at timestamptz,
  annulled_by uuid references public.profiles(id) on delete restrict,
  annulment_reason text,
  check ((annulled_at is null and annulled_by is null) or (annulled_at is not null and annulled_by is not null))
);

create table public.patient_files (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index patients_clinic_name_idx on public.patients (clinic_id, last_name, first_name);
create index appointments_professional_start_idx on public.appointments (professional_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id, starts_at desc);
create index clinical_notes_patient_idx on public.clinical_notes (patient_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (clinic_id, entity_type, entity_id, created_at desc);

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.patient_files enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.profiles where id = auth.uid() and active = true
$$;

create policy "clinic members read clinic" on public.clinics
for select using (id = public.current_clinic_id());

create policy "clinic members read profiles" on public.profiles
for select using (clinic_id = public.current_clinic_id());

create policy "clinic members read professionals" on public.professionals
for select using (clinic_id = public.current_clinic_id());
create policy "admins manage professionals" on public.professionals
for all using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (clinic_id = public.current_clinic_id());

create policy "clinic members read patients" on public.patients
for select using (clinic_id = public.current_clinic_id());
create policy "authorized staff create patients" on public.patients
for insert with check (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional','reception'))
);
create policy "authorized staff update patients" on public.patients
for update using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy "clinic members read appointments" on public.appointments
for select using (clinic_id = public.current_clinic_id());
create policy "staff manage appointments" on public.appointments
for all using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional','reception'))
) with check (clinic_id = public.current_clinic_id());

create policy "professionals read clinical notes" on public.clinical_notes
for select using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional'))
);
create policy "professionals create clinical notes" on public.clinical_notes
for insert with check (
  clinic_id = public.current_clinic_id()
  and created_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional'))
);
-- No se permite DELETE de evoluciones. Deben anularse conservando trazabilidad.
create policy "professionals annul clinical notes" on public.clinical_notes
for update using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional'))
) with check (clinic_id = public.current_clinic_id());

create policy "professionals read patient files" on public.patient_files
for select using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional'))
);
create policy "professionals upload patient files" on public.patient_files
for insert with check (
  clinic_id = public.current_clinic_id()
  and uploaded_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional'))
);

create policy "admins read audit log" on public.audit_log
for select using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
