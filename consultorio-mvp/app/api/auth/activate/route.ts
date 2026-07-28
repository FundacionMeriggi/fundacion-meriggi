import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashActivationToken } from "@/lib/invitations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (username.length < 3 || token.length < 16 || password.length < 8) {
      return NextResponse.json({ error: "Datos de activación inválidos." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, auth_email, email, active, activation_token_hash, activation_expires_at")
      .eq("username", username)
      .maybeSingle();

    if (!profile?.active || !profile.activation_token_hash || !profile.activation_expires_at) {
      return NextResponse.json({ error: "La invitación no existe o ya fue utilizada." }, { status: 400 });
    }
    if (new Date(profile.activation_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "La invitación venció. Solicitá una nueva al administrador." }, { status: 400 });
    }
    if (hashActivationToken(token) !== profile.activation_token_hash) {
      return NextResponse.json({ error: "El código de activación es incorrecto." }, { status: 400 });
    }

    const authEmail = profile.auth_email || profile.email;
    if (!authEmail) return NextResponse.json({ error: "La cuenta no tiene acceso configurado." }, { status: 400 });

    const { error: passwordError } = await admin.auth.admin.updateUserById(profile.id, { password });
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 400 });

    await admin.from("profiles").update({
      activation_token_hash: null,
      activation_expires_at: null,
      activated_at: new Date().toISOString(),
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id);

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (signInError) return NextResponse.json({ ok: true, signedIn: false });
    return NextResponse.json({ ok: true, signedIn: true });
  } catch {
    return NextResponse.json({ error: "No se pudo activar la cuenta." }, { status: 500 });
  }
}
