import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "professional" | "secretary";
export type Specialty = "psychologist" | "group_operator" | "administrative" | "workshop" | "secretary";

export type CurrentProfile = {
  id: string;
  clinic_id: string;
  full_name: string;
  username: string;
  email: string | null;
  role: AppRole;
  specialty: Specialty;
  active: boolean;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, clinic_id, full_name, username, email, role, specialty, active")
    .eq("id", userId)
    .eq("active", true)
    .single();

  if (error || !data) return null;
  return data as CurrentProfile;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return null;
  return profile;
}
