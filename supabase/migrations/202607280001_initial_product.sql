-- Fundación Meriggi — esquema productivo inicial
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists unaccent;

create table if not exists public.organizations (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.organizations (id, name)
values ('11111111-1111-4111-8111-111111111111', 'Fundación Meriggi')
on conflict (id) do nothing;

create type public.staff_role as enum ('super_admin','admin_professional','secretary','professional');
create type public.specialty as enum ('psychology','group_operator','administrative','workshop');
create type public.appointment_status as enum ('pending','confirmed','waiting','attended','absent','cancelled');
create type public.appointment_modality as enum ('in_person','video');
create type public.invitation_target as enum ('staff','patient');

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  display_name text not null default 'Fundación Meriggi',
  legal_name text not null default 'Asociación Civil Meriggi — Asistencia en Salud Mental y Adicciones',
  phone text,
  email text,
  address text,
  website text,
  reminder_hours integer not null default 24 check (reminder_hours between 1 and 168),
  patient_self_booking boolean not null default false,
  patient_can_cancel boolean not null default true,
  patient_can_reschedule boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (organization_id, display_name, legal_name)
values ('11111111-1111-4111-8111-111111111111','Fundación Meriggi','Asociación Civil Meriggi — Asistencia en Salud Mental y Adicciones')
on conflict (organization_id) do nothing;

create table public.team_members (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  username citext not null unique,
  email citext,
  role public.staff_role not null,
  specialty public.specialty not null,
  license_number text,
  job_title text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  username citext unique,
  first_name text not null,
  last_name text not null,
  dni text,
  birth_date date,
  email citext,
  phone text,
  coverage text,
  responsible_name text,
  responsible_phone text,
  administrative_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index patients_org_dni_unique on public.patients(organization_id, dni) where dni is not null and dni <> '';

create table public.patient_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete cascade,
  staff_id uuid not null references public.team_members(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(patient_id,staff_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  name text not null,
  specialty public.specialty,
  default_duration_minutes integer not null default 50,
  active boolean not null default true,
  unique(organization_id,name)
);

insert into public.services(name,specialty,default_duration_minutes) values
('Psicología','psychology',50),('Operador de grupo','group_operator',60),('Taller','workshop',90),('Admisión','psychology',60),('Orientación familiar','psychology',60),('Grupo de parejas','psychology',90),('Seguimiento interdisciplinario',null,60)
on conflict do nothing;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete restrict,
  staff_id uuid not null references public.team_members(id) on delete restrict,
  service_name text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 50 check(duration_minutes between 10 and 600),
  modality public.appointment_modality not null default 'in_person',
  status public.appointment_status not null default 'pending',
  administrative_note text,
  recurrence_rule text,
  allow_overlap boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_start_idx on public.appointments(organization_id,starts_at);
create index appointments_patient_idx on public.appointments(patient_id,starts_at desc);
create index appointments_staff_idx on public.appointments(staff_id,starts_at desc);

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete restrict,
  author_id uuid not null references public.team_members(id) on delete restrict,
  note_date date not null default current_date,
  note_type text not null default 'Evolución',
  visibility text not null default 'team' check(visibility in ('team','private')),
  content text not null check(length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clinical_notes_patient_idx on public.clinical_notes(patient_id,note_date desc,created_at desc);

create table public.clinical_note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.clinical_notes(id) on delete restrict,
  previous_content text not null,
  previous_note_type text not null,
  previous_visibility text not null,
  changed_by uuid references public.team_members(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  name text not null,
  kind text not null,
  coordinator_id uuid references public.team_members(id) on delete set null,
  weekday smallint check(weekday between 0 and 6),
  start_time time,
  duration_minutes integer not null default 90,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  group_id uuid not null references public.groups(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  active boolean not null default true,
  joined_at date not null default current_date,
  left_at date,
  unique(group_id,patient_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete restrict,
  uploaded_by uuid references public.team_members(id) on delete set null,
  title text not null,
  category text not null default 'Documento',
  storage_path text not null unique,
  visible_to_patient boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid references public.patients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  recipient_email citext not null,
  recipient_name text,
  subject text not null,
  body text not null,
  kind text not null default 'manual',
  status text not null default 'pending' check(status in ('pending','sent','failed','skipped')),
  provider_id text,
  error_message text,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index communications_appointment_kind_unique on public.communications(appointment_id,kind) where appointment_id is not null;


create or replace function public.queue_appointment_confirmation() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare p record; s record;
begin
  select id,first_name,last_name,email into p from public.patients where id=new.patient_id;
  select full_name into s from public.team_members where id=new.staff_id;
  if p.email is not null then
    insert into public.communications(organization_id,patient_id,appointment_id,recipient_email,recipient_name,subject,body,kind,status,created_by)
    values(new.organization_id,p.id,new.id,p.email,p.first_name||' '||p.last_name,'Confirmación de turno — Fundación Meriggi',
      'Turno registrado para '||to_char(new.starts_at at time zone 'America/Argentina/Buenos_Aires','DD/MM/YYYY HH24:MI')||'. Profesional: '||coalesce(s.full_name,'Fundación Meriggi')||'. Servicio: '||new.service_name||'.',
      'appointment_confirmation','pending',new.created_by)
    on conflict (appointment_id,kind) where appointment_id is not null do nothing;
  end if;
  return new;
end $$;
create trigger appointment_confirmation_after_insert after insert on public.appointments for each row execute function public.queue_appointment_confirmation();

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  target_type public.invitation_target not null,
  target_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default '11111111-1111-4111-8111-111111111111',
  actor_user_id uuid,
  actor_name text,
  action text not null,
  table_name text not null,
  record_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Usuarios reales del staff. No se crean pacientes ficticios.
insert into public.team_members(id,full_name,username,email,role,specialty,license_number,job_title) values
('20000000-0000-4000-8000-000000000001','Ignacio Simari','ignacio.simari','cai.simari.ignacio@gmail.com','super_admin','administrative',null,'Administrador total'),
('20000000-0000-4000-8000-000000000002','Cecilia Simari','cecilia.simari',null,'admin_professional','psychology',null,'Psicóloga / Administradora'),
('20000000-0000-4000-8000-000000000003','Flor Morbelli','flor.morbelli','floor.morbelli@live.com','secretary','administrative',null,'Secretaría'),
('20000000-0000-4000-8000-000000000004','Marcela Alejandra Imar Navarro','marcela.imar','imarmarcela@hotmail.com','professional','psychology','MN 75307','Coordinadora del grupo de parejas'),
('20000000-0000-4000-8000-000000000005','Milena Belén Castaño','milena.castano','milena_belen@hotmail.com','professional','workshop',null,'Taller'),
('20000000-0000-4000-8000-000000000006','Carolina Rojo Álvarez','carolina.rojo','crojo1986@gmail.com','professional','psychology',null,'Psicóloga'),
('20000000-0000-4000-8000-000000000007','Alberto Cárdenas','alberto.cardenas','psialbertocardenas@gmail.com','professional','psychology','62155','Psicólogo'),
('20000000-0000-4000-8000-000000000008','Luis Alberto Pesce','luis.pesce','luisalbertopesce53@gmail.com','professional','group_operator',null,'Operador socioterapéutico'),
('20000000-0000-4000-8000-000000000009','Alejandra Almirón','alejandra.almiron','alejandra.15.1972@gmail.com','professional','group_operator',null,'Operadora'),
('20000000-0000-4000-8000-000000000010','Sofía Bareille','sofia.bareille','lic.bareillesofia@gmail.com','professional','psychology','MN 82799','Psicóloga')
on conflict(id) do update set full_name=excluded.full_name,username=excluded.username,email=excluded.email,role=excluded.role,specialty=excluded.specialty,license_number=excluded.license_number,job_title=excluded.job_title;

-- Identidad y permisos
create or replace function public.current_staff_id() returns uuid language sql stable security definer set search_path=public set row_security=off as $$ select id from public.team_members where auth_user_id=auth.uid() and active limit 1 $$;
create or replace function public.current_staff_role() returns public.staff_role language sql stable security definer set search_path=public set row_security=off as $$ select role from public.team_members where auth_user_id=auth.uid() and active limit 1 $$;
create or replace function public.current_patient_id() returns uuid language sql stable security definer set search_path=public set row_security=off as $$ select id from public.patients where auth_user_id=auth.uid() and active limit 1 $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public set row_security=off as $$ select coalesce(public.current_staff_role() in ('super_admin','admin_professional'),false) $$;
create or replace function public.is_admin_or_secretary() returns boolean language sql stable security definer set search_path=public set row_security=off as $$ select coalesce(public.current_staff_role() in ('super_admin','admin_professional','secretary'),false) $$;
create or replace function public.can_access_patient(target uuid) returns boolean language sql stable security definer set search_path=public set row_security=off as $$
  select case
    when public.current_staff_role() in ('super_admin','admin_professional','secretary') then true
    when public.current_staff_role()='professional' then exists(select 1 from public.patient_assignments pa where pa.patient_id=target and pa.staff_id=public.current_staff_id() and pa.active)
    when public.current_patient_id()=target then true
    else false end
$$;
create or replace function public.can_access_clinical_patient(target uuid) returns boolean language sql stable security definer set search_path=public set row_security=off as $$
  select case
    when public.current_staff_role() in ('super_admin','admin_professional') then true
    when public.current_staff_role()='professional' then exists(select 1 from public.patient_assignments pa where pa.patient_id=target and pa.staff_id=public.current_staff_id() and pa.active)
    else false end
$$;

create or replace function public.patient_username() returns trigger language plpgsql as $$
declare base text; candidate text; n integer := 0;
begin
  if new.username is not null then return new; end if;
  base := lower(regexp_replace(unaccent(new.first_name||'.'||new.last_name),'[^a-zA-Z0-9.]+','','g'));
  if base='' then base:='paciente'; end if;
  candidate:=base;
  while exists(select 1 from public.patients where username=candidate) loop n:=n+1; candidate:=base||'.'||n; end loop;
  new.username:=candidate;
  return new;
end $$;
create trigger patients_username_before_insert before insert on public.patients for each row execute function public.patient_username();

create or replace function public.prevent_cross_username_conflict() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
begin
  if tg_table_name='team_members' and exists(select 1 from public.patients p where p.username=new.username) then raise exception 'El nombre de usuario ya está utilizado por un paciente'; end if;
  if tg_table_name='patients' and exists(select 1 from public.team_members t where t.username=new.username) then raise exception 'El nombre de usuario ya está utilizado por un integrante'; end if;
  return new;
end $$;
create trigger team_username_crosscheck before insert or update of username on public.team_members for each row execute function public.prevent_cross_username_conflict();
create trigger patient_username_crosscheck before insert or update of username on public.patients for each row execute function public.prevent_cross_username_conflict();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger team_members_updated before update on public.team_members for each row execute function public.set_updated_at();
create trigger patients_updated before update on public.patients for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger clinical_notes_updated before update on public.clinical_notes for each row execute function public.set_updated_at();
create trigger org_settings_updated before update on public.organization_settings for each row execute function public.set_updated_at();

create or replace function public.version_clinical_note() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.content is distinct from new.content or old.note_type is distinct from new.note_type or old.visibility is distinct from new.visibility then
   insert into public.clinical_note_versions(note_id,previous_content,previous_note_type,previous_visibility,changed_by) values(old.id,old.content,old.note_type,old.visibility,public.current_staff_id());
 end if;
 return new;
end $$;
create trigger clinical_note_version_before_update before update on public.clinical_notes for each row execute function public.version_clinical_note();

create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare actor text; rid text; org uuid; payload jsonb;
begin
 select full_name into actor from public.team_members where auth_user_id=auth.uid();
 if actor is null then select first_name||' '||last_name into actor from public.patients where auth_user_id=auth.uid(); end if;
 rid:=coalesce((case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id','');
 org:=coalesce(((case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'organization_id')::uuid,'11111111-1111-4111-8111-111111111111');
 payload:=jsonb_build_object('operation',tg_op);
 insert into public.audit_log(organization_id,actor_user_id,actor_name,action,table_name,record_id,metadata) values(org,auth.uid(),coalesce(actor,'Sistema'),lower(tg_op),tg_table_name,rid,payload);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;

create trigger audit_patients after insert or update or delete on public.patients for each row execute function public.audit_change();
create trigger audit_appointments after insert or update or delete on public.appointments for each row execute function public.audit_change();
create trigger audit_notes after insert or update on public.clinical_notes for each row execute function public.audit_change();
create trigger audit_assignments after insert or update or delete on public.patient_assignments for each row execute function public.audit_change();
create trigger audit_team after insert or update or delete on public.team_members for each row execute function public.audit_change();
create trigger audit_groups after insert or update or delete on public.groups for each row execute function public.audit_change();

-- Operaciones restringidas para pacientes
create or replace function public.patient_update_contact(new_email text, new_phone text) returns void language plpgsql security definer set search_path=public as $$
begin
 update public.patients set email=nullif(trim(new_email),''),phone=nullif(trim(new_phone),'') where id=public.current_patient_id();
 if not found then raise exception 'Paciente no vinculado'; end if;
end $$;

create or replace function public.patient_update_appointment_status(appointment_id uuid,new_status text) returns void language plpgsql security definer set search_path=public as $$
begin
 if new_status not in ('confirmed','cancelled') then raise exception 'Estado no permitido'; end if;
 if new_status='cancelled' and not coalesce((select patient_can_cancel from public.organization_settings limit 1),false) then raise exception 'La cancelación directa no está habilitada'; end if;
 update public.appointments set status=new_status::public.appointment_status
 where id=appointment_id and patient_id=public.current_patient_id() and starts_at>now()
   and ((new_status='confirmed' and status in ('pending','waiting')) or (new_status='cancelled' and status in ('pending','confirmed','waiting')));
 if not found then raise exception 'Turno no encontrado o no modificable'; end if;
end $$;


-- Operación administrativa: bloqueos, lista de espera, caja y consentimientos
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  staff_id uuid not null references public.team_members(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  all_day boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check(ends_at > starts_at)
);


create or replace function public.validate_appointment_slot() returns trigger language plpgsql security definer set search_path=public set row_security=off as $$
declare finish timestamptz;
begin
  if new.status='cancelled' or new.allow_overlap then return new; end if;
  finish:=new.starts_at + make_interval(mins=>new.duration_minutes);
  if exists(select 1 from public.availability_blocks b where b.staff_id=new.staff_id and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(new.starts_at,finish,'[)')) then
    raise exception 'El profesional tiene la agenda bloqueada en ese horario';
  end if;
  if exists(select 1 from public.appointments a where a.staff_id=new.staff_id and a.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000') and a.status<>'cancelled' and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes),'[)') && tstzrange(new.starts_at,finish,'[)')) then
    raise exception 'El profesional ya tiene un turno en ese horario';
  end if;
  return new;
end $$;
create trigger appointment_slot_before_write before insert or update of starts_at,duration_minutes,staff_id,status,allow_overlap on public.appointments for each row execute function public.validate_appointment_slot();

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete cascade,
  preferred_staff_id uuid references public.team_members(id) on delete set null,
  service_name text not null,
  preferred_days smallint[],
  preferred_time text,
  priority smallint not null default 2 check(priority between 1 and 3),
  status text not null default 'waiting' check(status in ('waiting','offered','scheduled','closed')),
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric(12,2) not null check(amount >= 0),
  currency text not null default 'ARS',
  method text not null default 'Transferencia',
  status text not null default 'pending' check(status in ('pending','paid','waived','refunded')),
  receipt_number text,
  notes text,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  version text not null,
  content_hash text,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(patient_id,title,version)
);

create trigger waitlist_updated before update on public.waitlist for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();
create trigger audit_waitlist after insert or update or delete on public.waitlist for each row execute function public.audit_change();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function public.audit_change();
create trigger audit_blocks after insert or update or delete on public.availability_blocks for each row execute function public.audit_change();
create trigger audit_consents after insert or update on public.consents for each row execute function public.audit_change();


create table public.appointment_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  request_type text not null check(request_type in ('reschedule','cancel')),
  preferred_text text,
  status text not null default 'pending' check(status in ('pending','approved','rejected','resolved')),
  reviewed_by uuid references public.team_members(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(appointment_id,request_type,status)
);
create trigger audit_change_requests after insert or update or delete on public.appointment_change_requests for each row execute function public.audit_change();

create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade default '11111111-1111-4111-8111-111111111111',
  patient_id uuid not null references public.patients(id) on delete cascade,
  preferred_staff_id uuid references public.team_members(id) on delete set null,
  service_name text not null,
  preferred_text text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','resolved')),
  reviewed_by uuid references public.team_members(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create trigger audit_appointment_requests after insert or update or delete on public.appointment_requests for each row execute function public.audit_change();

-- RLS
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.team_members enable row level security;
alter table public.patients enable row level security;
alter table public.patient_assignments enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.clinical_note_versions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.documents enable row level security;
alter table public.communications enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.waitlist enable row level security;
alter table public.payments enable row level security;
alter table public.consents enable row level security;
alter table public.appointment_change_requests enable row level security;
alter table public.appointment_requests enable row level security;

create policy organizations_read on public.organizations for select to authenticated using (id='11111111-1111-4111-8111-111111111111');
create policy settings_read on public.organization_settings for select to authenticated using (organization_id='11111111-1111-4111-8111-111111111111');
create policy settings_admin_write on public.organization_settings for update to authenticated using (public.is_admin()) with check(public.is_admin());

create policy team_read_staff on public.team_members for select to authenticated using (public.current_staff_id() is not null);
create policy team_read_patient_assignments on public.team_members for select to authenticated using (exists(select 1 from public.patient_assignments pa where pa.staff_id=team_members.id and pa.patient_id=public.current_patient_id() and pa.active));
create policy team_admin_insert on public.team_members for insert to authenticated with check(public.is_admin() and (role <> 'super_admin' or public.current_staff_role()='super_admin'));
create policy team_admin_update on public.team_members for update to authenticated
using(public.is_admin() and (role <> 'super_admin' or public.current_staff_role()='super_admin'))
with check(public.is_admin() and (role <> 'super_admin' or public.current_staff_role()='super_admin'));

create policy patients_select on public.patients for select to authenticated using(public.can_access_patient(id));
create policy patients_insert_admin on public.patients for insert to authenticated with check(public.is_admin_or_secretary());
create policy patients_update_admin on public.patients for update to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy assignments_select on public.patient_assignments for select to authenticated using(public.can_access_patient(patient_id));
create policy assignments_write on public.patient_assignments for all to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy services_read on public.services for select to authenticated using(true);
create policy services_write on public.services for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy appointments_select on public.appointments for select to authenticated using(
  patient_id=public.current_patient_id() or public.is_admin_or_secretary() or staff_id=public.current_staff_id() or public.can_access_patient(patient_id)
);
create policy appointments_insert on public.appointments for insert to authenticated with check(public.is_admin_or_secretary() or staff_id=public.current_staff_id());
create policy appointments_update on public.appointments for update to authenticated using(public.is_admin_or_secretary() or staff_id=public.current_staff_id()) with check(public.is_admin_or_secretary() or staff_id=public.current_staff_id());

create policy notes_select on public.clinical_notes for select to authenticated using(public.is_admin() or author_id=public.current_staff_id() or (visibility='team' and public.can_access_clinical_patient(patient_id)));
create policy notes_insert on public.clinical_notes for insert to authenticated with check(public.can_access_clinical_patient(patient_id) and author_id=public.current_staff_id());
create policy notes_update on public.clinical_notes for update to authenticated using(author_id=public.current_staff_id() or public.is_admin()) with check(public.can_access_clinical_patient(patient_id));
create policy note_versions_select on public.clinical_note_versions for select to authenticated using(exists(select 1 from public.clinical_notes n where n.id=note_id and (public.is_admin() or n.author_id=public.current_staff_id())));

create policy groups_select on public.groups for select to authenticated using(public.current_staff_id() is not null or exists(select 1 from public.group_members gm where gm.group_id=groups.id and gm.patient_id=public.current_patient_id() and gm.active));
create policy groups_write on public.groups for all to authenticated using(public.is_admin_or_secretary() or coordinator_id=public.current_staff_id()) with check(public.is_admin_or_secretary() or coordinator_id=public.current_staff_id());
create policy group_members_select on public.group_members for select to authenticated using(public.can_access_patient(patient_id) or patient_id=public.current_patient_id());
create policy group_members_write on public.group_members for all to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy documents_select on public.documents for select to authenticated using(public.can_access_clinical_patient(patient_id) or (patient_id=public.current_patient_id() and visible_to_patient));
create policy documents_write on public.documents for all to authenticated using(public.can_access_clinical_patient(patient_id)) with check(public.can_access_clinical_patient(patient_id));

create policy communications_select on public.communications for select to authenticated using(public.is_admin_or_secretary());
create policy invitations_admin_select on public.invitations for select to authenticated using(public.is_admin());
create policy audit_admin_select on public.audit_log for select to authenticated using(public.is_admin());


create policy blocks_select on public.availability_blocks for select to authenticated using(public.current_staff_id() is not null);
create policy blocks_write on public.availability_blocks for all to authenticated using(public.is_admin_or_secretary() or staff_id=public.current_staff_id()) with check(public.is_admin_or_secretary() or staff_id=public.current_staff_id());

create policy waitlist_select on public.waitlist for select to authenticated using(public.current_staff_id() is not null);
create policy waitlist_write on public.waitlist for all to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy payments_select on public.payments for select to authenticated using(public.is_admin_or_secretary() or patient_id=public.current_patient_id());
create policy payments_write on public.payments for all to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy consents_select on public.consents for select to authenticated using(public.can_access_clinical_patient(patient_id) or patient_id=public.current_patient_id());
create policy consents_write_staff on public.consents for insert to authenticated with check(public.is_admin_or_secretary() or public.can_access_clinical_patient(patient_id));
create policy consents_accept_patient on public.consents for update to authenticated using(patient_id=public.current_patient_id()) with check(patient_id=public.current_patient_id() and accepted_by_user_id=auth.uid());


create policy change_requests_select on public.appointment_change_requests for select to authenticated using(public.is_admin_or_secretary() or patient_id=public.current_patient_id() or exists(select 1 from public.appointments a where a.id=appointment_id and a.staff_id=public.current_staff_id()));
create policy change_requests_patient_insert on public.appointment_change_requests for insert to authenticated with check(patient_id=public.current_patient_id() and exists(select 1 from public.appointments a where a.id=appointment_id and a.patient_id=public.current_patient_id()));
create policy change_requests_staff_update on public.appointment_change_requests for update to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

create policy appointment_requests_select on public.appointment_requests for select to authenticated using(public.is_admin_or_secretary() or patient_id=public.current_patient_id());
create policy appointment_requests_patient_insert on public.appointment_requests for insert to authenticated with check(patient_id=public.current_patient_id() and coalesce((select patient_self_booking from public.organization_settings limit 1),false));
create policy appointment_requests_staff_update on public.appointment_requests for update to authenticated using(public.is_admin_or_secretary()) with check(public.is_admin_or_secretary());

-- Bucket privado de documentos clínicos
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clinical-documents','clinical-documents',false,20971520,array['application/pdf','image/jpeg','image/png','text/plain'])
on conflict(id) do nothing;

create or replace function public.storage_patient_id(object_name text) returns uuid language plpgsql stable security definer set search_path=public as $$
declare parts text[];
begin parts:=storage.foldername(object_name); if array_length(parts,1)>=2 then return parts[2]::uuid; end if; return null; exception when others then return null; end $$;

create policy storage_clinical_select on storage.objects for select to authenticated using(bucket_id='clinical-documents' and (public.can_access_clinical_patient(public.storage_patient_id(name)) or exists(select 1 from public.documents d where d.storage_path=name and d.patient_id=public.current_patient_id() and d.visible_to_patient)));
create policy storage_clinical_insert on storage.objects for insert to authenticated with check(bucket_id='clinical-documents' and public.can_access_clinical_patient(public.storage_patient_id(name)));
create policy storage_clinical_update on storage.objects for update to authenticated using(bucket_id='clinical-documents' and public.can_access_clinical_patient(public.storage_patient_id(name))) with check(bucket_id='clinical-documents' and public.can_access_clinical_patient(public.storage_patient_id(name)));

-- Permisos de funciones y tablas
revoke all on function public.current_staff_id() from public, anon;
revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.current_patient_id() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_admin_or_secretary() from public, anon;
revoke all on function public.can_access_patient(uuid) from public, anon;
revoke all on function public.can_access_clinical_patient(uuid) from public, anon;
revoke all on function public.patient_update_contact(text,text) from public, anon;
revoke all on function public.patient_update_appointment_status(uuid,text) from public, anon;
revoke all on function public.storage_patient_id(text) from public, anon;
revoke all on function public.patient_username() from public, anon;
revoke all on function public.prevent_cross_username_conflict() from public, anon;
revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.version_clinical_note() from public, anon;
revoke all on function public.audit_change() from public, anon;
revoke all on function public.queue_appointment_confirmation() from public, anon;
revoke all on function public.validate_appointment_slot() from public, anon;
grant execute on function public.current_staff_id(),public.current_staff_role(),public.current_patient_id(),public.is_admin(),public.is_admin_or_secretary(),public.can_access_patient(uuid),public.can_access_clinical_patient(uuid),public.patient_update_contact(text,text),public.patient_update_appointment_status(uuid,text),public.storage_patient_id(text) to authenticated;

grant select on all tables in schema public to authenticated;
grant insert,update on public.patients,public.patient_assignments,public.appointments,public.clinical_notes,public.groups,public.group_members,public.documents,public.organization_settings,public.team_members,public.services,public.availability_blocks,public.waitlist,public.payments,public.consents,public.appointment_change_requests,public.appointment_requests to authenticated;
