import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  try {
    const { token, password } = await req.json();
    const rawToken = String(token || '').trim();
    const chosenPassword = String(password || '');
    if (chosenPassword.length < 10) return json({ error: 'La contraseña debe tener al menos 10 caracteres.' }, 400);
    if (!rawToken || rawToken.length > 500) return json({ error: 'Código de activación inválido.' }, 400);

    const db = adminClient();
    const tokenHash = await sha256(rawToken);
    let invitation = (await db.from('invitations').select('*').eq('token_hash', tokenHash).is('used_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()).data;
    let targetType: 'staff' | 'patient';
    let targetId: string;
    let isBootstrap = false;

    if (!invitation) {
      const bootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET');
      if (!bootstrapSecret || rawToken !== bootstrapSecret) return json({ error: 'El enlace venció, ya fue utilizado o es inválido.' }, 400);
      const ignacio = await db.from('team_members').select('*').eq('username', 'ignacio.simari').maybeSingle();
      if (!ignacio.data) return json({ error: 'No se encontró la cuenta administradora inicial.' }, 400);
      targetType = 'staff';
      targetId = ignacio.data.id;
      isBootstrap = true;
    } else {
      targetType = invitation.target_type;
      targetId = invitation.target_id;
    }

    const table = targetType === 'staff' ? 'team_members' : 'patients';
    const target = await db.from(table).select('*').eq('id', targetId).single();
    if (target.error || !target.data) return json({ error: 'La cuenta no está disponible.' }, 400);
    if (!target.data.active) {
      if (!isBootstrap) return json({ error: 'La cuenta no está disponible.' }, 400);
      const reactivated = await db.from(table).update({ active: true }).eq('id', targetId);
      if (reactivated.error) return json({ error: 'No se pudo reactivar la cuenta administradora.' }, 400);
    }
    const username = target.data.username;
    const email = target.data.email || `${username}@accounts.meriggi.invalid`;
    let authUserId = target.data.auth_user_id as string | null;

    if (authUserId) {
      const updated = await db.auth.admin.updateUserById(authUserId, { password: chosenPassword, email_confirm: true, user_metadata: { username, target_type: targetType, target_id: targetId } });
      if (updated.error) return json({ error: 'No se pudo actualizar la contraseña.' }, 400);
    } else {
      const created = await db.auth.admin.createUser({ email, password: chosenPassword, email_confirm: true, user_metadata: { username, target_type: targetType, target_id: targetId } });
      if (created.error || !created.data.user) return json({ error: created.error?.message || 'No se pudo crear la cuenta.' }, 400);
      authUserId = created.data.user.id;
      const linked = await db.from(table).update({ auth_user_id: authUserId }).eq('id', targetId);
      if (linked.error) {
        await db.auth.admin.deleteUser(authUserId);
        return json({ error: 'No se pudo vincular la cuenta.' }, 400);
      }
    }

    if (invitation) await db.from('invitations').update({ used_at: new Date().toISOString() }).eq('id', invitation.id);
    await db.from('audit_log').insert({ actor_user_id: authUserId, actor_name: targetType === 'staff' ? target.data.full_name : `${target.data.first_name} ${target.data.last_name}`, action: 'account_activated', table_name: table, record_id: targetId });
    return json({ ok: true, username });
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo activar la cuenta.' }, 500);
  }
});
