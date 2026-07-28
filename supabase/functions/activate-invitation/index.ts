import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

const ADMIN_ID = '20000000-0000-4000-8000-000000000001';
const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_USERNAME = 'ignacio.simari';
const ADMIN_EMAIL = 'cai.simari.ignacio@gmail.com';

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function findAuthUsers(
  db: ReturnType<typeof adminClient>,
  predicate: (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => boolean,
) {
  const matches: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> = [];

  for (let page = 1; page <= 20; page += 1) {
    const listed = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (listed.error) throw listed.error;

    const users = listed.data?.users || [];
    matches.push(...users.filter(predicate));
    if (users.length < 1000) break;
  }

  return matches;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const { token, password } = await req.json();
    const rawToken = String(token || '').trim();
    const chosenPassword = String(password || '');

    if (chosenPassword.length < 10) {
      return json({ error: 'La contraseña debe tener al menos 10 caracteres.' }, 400);
    }
    if (!rawToken || rawToken.length > 500) {
      return json({ error: 'Código de activación inválido.' }, 400);
    }

    const db = adminClient();
    const tokenHash = await sha256(rawToken);
    const invitationResult = await db
      .from('invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invitationResult.error) throw invitationResult.error;

    const invitation = invitationResult.data;
    const bootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET');
    const isAdminReset = !invitation && Boolean(bootstrapSecret) && rawToken === bootstrapSecret;

    if (!invitation && !isAdminReset) {
      return json({ error: 'El enlace venció, ya fue utilizado o es inválido.' }, 400);
    }

    if (isAdminReset) {
      const usedReset = await db
        .from('audit_log')
        .select('id')
        .eq('action', 'admin_account_recreated')
        .eq('record_id', tokenHash)
        .limit(1)
        .maybeSingle();

      if (usedReset.error) throw usedReset.error;
      if (usedReset.data) {
        return json({ error: 'Este enlace de reinicio ya fue utilizado.' }, 400);
      }

      const byUsername = await db
        .from('team_members')
        .select('*')
        .eq('username', ADMIN_USERNAME)
        .limit(1)
        .maybeSingle();

      if (byUsername.error) throw byUsername.error;

      let administrator = byUsername.data;
      if (!administrator) {
        const byId = await db
          .from('team_members')
          .select('*')
          .eq('id', ADMIN_ID)
          .limit(1)
          .maybeSingle();

        if (byId.error) throw byId.error;
        administrator = byId.data;
      }

      if (!administrator) {
        const inserted = await db
          .from('team_members')
          .insert({
            id: ADMIN_ID,
            organization_id: ORGANIZATION_ID,
            full_name: 'Ignacio Simari',
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            role: 'super_admin',
            specialty: 'administrative',
            job_title: 'Administrador total',
            active: true,
            auth_user_id: null,
          })
          .select('*')
          .single();

        if (inserted.error || !inserted.data) {
          return json({ error: 'No se pudo recrear el perfil administrador.' }, 400);
        }
        administrator = inserted.data;
      }

      const normalizedAdministrator = await db
        .from('team_members')
        .update({
          full_name: 'Ignacio Simari',
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          role: 'super_admin',
          specialty: 'administrative',
          job_title: 'Administrador total',
          active: true,
        })
        .eq('id', administrator.id)
        .select('*')
        .single();

      if (normalizedAdministrator.error || !normalizedAdministrator.data) {
        return json({ error: 'No se pudo preparar el perfil administrador.' }, 400);
      }
      administrator = normalizedAdministrator.data;

      const authUsers = await findAuthUsers(
        db,
        (user) =>
          user.id === administrator.auth_user_id ||
          user.email?.toLowerCase() === ADMIN_EMAIL ||
          String(user.user_metadata?.username || '').toLowerCase() === ADMIN_USERNAME,
      );

      for (const authUser of authUsers) {
        const deleted = await db.auth.admin.deleteUser(authUser.id);
        if (deleted.error) {
          return json({ error: 'No se pudo eliminar el acceso anterior.' }, 400);
        }
      }

      const unlinked = await db
        .from('team_members')
        .update({ auth_user_id: null, active: true })
        .eq('id', administrator.id);

      if (unlinked.error) {
        return json({ error: 'No se pudo limpiar el acceso anterior.' }, 400);
      }

      const created = await db.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: chosenPassword,
        email_confirm: true,
        user_metadata: {
          username: ADMIN_USERNAME,
          target_type: 'staff',
          target_id: administrator.id,
        },
      });

      if (created.error || !created.data.user) {
        return json({ error: created.error?.message || 'No se pudo crear el acceso nuevo.' }, 400);
      }

      const linked = await db
        .from('team_members')
        .update({ auth_user_id: created.data.user.id, active: true })
        .eq('id', administrator.id);

      if (linked.error) {
        await db.auth.admin.deleteUser(created.data.user.id);
        return json({ error: 'No se pudo vincular el acceso nuevo.' }, 400);
      }

      await db.from('audit_log').insert({
        actor_user_id: created.data.user.id,
        actor_name: administrator.full_name,
        action: 'admin_account_recreated',
        table_name: 'team_members',
        record_id: tokenHash,
        metadata: { team_member_id: administrator.id },
      });

      return json({ ok: true, recreated: true, username: ADMIN_USERNAME });
    }

    const targetType = invitation.target_type as 'staff' | 'patient';
    const targetId = String(invitation.target_id);
    const table = targetType === 'staff' ? 'team_members' : 'patients';
    const target = await db.from(table).select('*').eq('id', targetId).single();

    if (target.error || !target.data || !target.data.active) {
      return json({ error: 'La cuenta no está disponible.' }, 400);
    }

    const username = String(target.data.username || '');
    const email = String(target.data.email || `${username}@accounts.meriggi.invalid`);
    let authUserId = target.data.auth_user_id as string | null;
    let createdUser = false;

    if (!authUserId) {
      const existingUsers = await findAuthUsers(
        db,
        (user) =>
          user.email?.toLowerCase() === email.toLowerCase() ||
          String(user.user_metadata?.username || '').toLowerCase() === username.toLowerCase(),
      );
      authUserId = existingUsers[0]?.id || null;
    }

    if (authUserId) {
      const updated = await db.auth.admin.updateUserById(authUserId, {
        password: chosenPassword,
        email_confirm: true,
        user_metadata: { username, target_type: targetType, target_id: targetId },
      });

      if (updated.error) {
        return json({ error: 'No se pudo actualizar la contraseña.' }, 400);
      }
    } else {
      const created = await db.auth.admin.createUser({
        email,
        password: chosenPassword,
        email_confirm: true,
        user_metadata: { username, target_type: targetType, target_id: targetId },
      });

      if (created.error || !created.data.user) {
        return json({ error: created.error?.message || 'No se pudo crear la cuenta.' }, 400);
      }

      authUserId = created.data.user.id;
      createdUser = true;
    }

    const linked = await db
      .from(table)
      .update({ auth_user_id: authUserId, active: true })
      .eq('id', targetId);

    if (linked.error) {
      if (createdUser && authUserId) await db.auth.admin.deleteUser(authUserId);
      return json({ error: 'No se pudo vincular la cuenta.' }, 400);
    }

    await db
      .from('invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    await db.from('audit_log').insert({
      actor_user_id: authUserId,
      actor_name:
        targetType === 'staff'
          ? target.data.full_name
          : `${target.data.first_name} ${target.data.last_name}`,
      action: 'account_activated',
      table_name: table,
      record_id: targetId,
    });

    return json({ ok: true, username });
  } catch (error) {
    console.error(error);
    return json({ error: 'No se pudo activar la cuenta.' }, 500);
  }
});
