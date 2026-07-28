import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

async function resolveFromTable(db: ReturnType<typeof adminClient>, table: 'team_members' | 'patients', value: string) {
  let result = await db.from(table).select('username,email,active,auth_user_id').eq('username', value).maybeSingle();
  if (!result.data && value.includes('@')) {
    result = await db.from(table).select('username,email,active,auth_user_id').eq('email', value).maybeSingle();
  }
  return result.data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    const { identifier } = await req.json();
    const value = String(identifier || '').trim().toLowerCase();
    if (!value || value.length > 180 || !/^[a-z0-9áéíóúüñ._+@-]+$/i.test(value)) return json({ error: 'Credenciales inválidas' }, 400);
    const db = adminClient();
    const staff = await resolveFromTable(db, 'team_members', value);
    if (staff?.active && staff.auth_user_id) return json({ email: staff.email || `${staff.username}@accounts.meriggi.invalid` });
    const patient = await resolveFromTable(db, 'patients', value);
    if (patient?.active && patient.auth_user_id) return json({ email: patient.email || `${patient.username}@accounts.meriggi.invalid` });
    // Respuesta indistinguible para evitar enumeración directa de usuarios.
    return json({ email: 'cuenta-inexistente@accounts.meriggi.invalid' });
  } catch {
    return json({ error: 'No se pudo procesar el ingreso' }, 400);
  }
});
