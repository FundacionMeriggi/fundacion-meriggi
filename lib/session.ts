import type { Patient, TeamMember } from './types';
import { getSupabase } from './supabase';

export type CurrentIdentity =
  | { kind: 'staff'; member: TeamMember }
  | { kind: 'patient'; patient: Patient };

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const staff = await supabase.from('team_members').select('*').eq('auth_user_id', user.id).eq('active', true).maybeSingle();
  if (staff.error) throw staff.error;
  if (staff.data) return { kind: 'staff', member: staff.data as TeamMember };

  const patient = await supabase.from('patients').select('*').eq('auth_user_id', user.id).eq('active', true).maybeSingle();
  if (patient.error) throw patient.error;
  if (patient.data) return { kind: 'patient', patient: patient.data as Patient };
  return null;
}
