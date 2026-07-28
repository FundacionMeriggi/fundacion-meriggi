import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { createActivationToken, hashActivationToken, sendActivationEmail } from "@/lib/invitations";
import { randomBytes } from "node:crypto";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await requireAdmin();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, clinic_id, full_name, username, email")
    .eq("id", id)
    .eq("clinic_id", current.clinic_id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const token = createActivationToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await admin.auth.admin.updateUserById(id, { password: randomBytes(32).toString("base64url") });
  const { error } = await admin.from("profiles").update({
    activation_token_hash: hashActivationToken(token),
    activation_expires_at: expiresAt,
    activated_at: null,
    must_change_password: true,
    invitation_sent_at: target.email ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const origin = new URL(request.url).origin;
  const activationUrl = `${origin}/activar?user=${encodeURIComponent(target.username)}&token=${encodeURIComponent(token)}`;
  if (target.email) await sendActivationEmail({ to: target.email, fullName: target.full_name, username: target.username, activationUrl });

  return NextResponse.json({ ok: true, activationUrl, activationCode: target.email ? undefined : token });
}
