-- Funciones específicas para Fundación Meriggi.
-- Ejecutar después de 001_initial_schema.sql.

alter table public.clinics
  add column if not exists legal_name text,
  add column if not exists website text,
  add column if not exists logo_url text,
  add column if not exists reminder_hours integer not null default 24,
  add column if not exists daily_digest_time time not null default '18:00';

alter table public.profiles
  add column if not exists email_notifications boolean not null default true,
  add column if not exists daily_digest boolean not null default true;

alter table public.professionals
  add column if not exists email text,
  add column if not exists calendar_color text not null default '#f5bc26';

alter table public.patients
  add column if not exists responsible_name text,
  add column if not exists responsible_phone text,
  add column if not exists primary_professional_id uuid references public.professionals(id) on delete set null,
  add column if not exists informed_consent_at timestamptz,
  add column if not exists preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','whatsapp'));

alter table public.appointments
  add column if not exists service text,
  add column if not exists modality text not null default 'in_person' check (modality in ('in_person','video')),
  add column if not exists patient_notification_enabled boolean not null default true,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists staff_notification_sent_at timestamptz;

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'email' check (channel in ('email','whatsapp','sms')),
  recipient text not null,
  subject text,
  template_key text,
  status text not null default 'queued' check (status in ('queued','sent','failed','simulated')),
  provider_message_id text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  new_appointment_email boolean not null default true,
  changed_appointment_email boolean not null default true,
  daily_agenda_email boolean not null default true,
  daily_agenda_time time not null default '18:00',
  unique (profile_id)
);

create table if not exists public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  granted_by_name text,
  document_storage_path text,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists communications_clinic_created_idx on public.communications (clinic_id, created_at desc);
create index if not exists communications_appointment_idx on public.communications (appointment_id, created_at desc);
create index if not exists patient_consents_patient_idx on public.patient_consents (patient_id, recorded_at desc);

alter table public.communications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.patient_consents enable row level security;

create policy "clinic members read communications" on public.communications
for select using (clinic_id = public.current_clinic_id());

create policy "authorized users create communications" on public.communications
for insert with check (
  clinic_id = public.current_clinic_id()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','professional','reception') and p.active = true
  )
);

create policy "users read own notification preferences" on public.notification_preferences
for select using (
  clinic_id = public.current_clinic_id()
  and (profile_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
);

create policy "admins manage notification preferences" on public.notification_preferences
for all using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (clinic_id = public.current_clinic_id());

create policy "clinical users read consents" on public.patient_consents
for select using (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional','reception'))
);

create policy "authorized users record consents" on public.patient_consents
for insert with check (
  clinic_id = public.current_clinic_id()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','professional','reception'))
);
