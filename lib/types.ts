export type StaffRole = 'super_admin' | 'admin_professional' | 'secretary' | 'professional';
export type Specialty = 'psychology' | 'group_operator' | 'administrative' | 'workshop';
export type AppRole = StaffRole | 'patient';

export type TeamMember = {
  id: string;
  organization_id: string;
  auth_user_id: string | null;
  full_name: string;
  username: string;
  email: string | null;
  role: StaffRole;
  specialty: Specialty;
  license_number: string | null;
  job_title: string | null;
  active: boolean;
  created_at: string;
};

export type Patient = {
  id: string;
  organization_id: string;
  auth_user_id: string | null;
  username: string | null;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  coverage: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  administrative_notes: string | null;
  active: boolean;
  created_at: string;
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'waiting' | 'attended' | 'absent' | 'cancelled';
export type Appointment = {
  id: string;
  organization_id: string;
  patient_id: string;
  staff_id: string;
  service_name: string;
  starts_at: string;
  duration_minutes: number;
  modality: 'in_person' | 'video';
  status: AppointmentStatus;
  administrative_note: string | null;
  recurrence_rule: string | null;
  allow_overlap: boolean;
  patient?: Pick<Patient, 'first_name' | 'last_name'> | null;
  staff?: Pick<TeamMember, 'full_name'> | null;
};

export type ClinicalNote = {
  id: string;
  patient_id: string;
  author_id: string;
  note_date: string;
  note_type: string;
  visibility: 'team' | 'private';
  content: string;
  created_at: string;
  author?: Pick<TeamMember, 'full_name'> | null;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Administrador total',
  admin_professional: 'Administradora / profesional',
  secretary: 'Secretaría',
  professional: 'Profesional',
  patient: 'Paciente',
};

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  psychology: 'Psicología',
  group_operator: 'Operador/a de grupo',
  administrative: 'Administrativo',
  workshop: 'Taller',
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  waiting: 'En espera',
  attended: 'Atendido',
  absent: 'Ausente',
  cancelled: 'Cancelado',
};
