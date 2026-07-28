import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (username.length < 3 || password.length < 8) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, auth_email, email, active, activated_at")
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    const authEmail = profile?.auth_email || profile?.email;
    if (!profile?.active || !profile.activated_at || !authEmail) {
      return NextResponse.json({ error: profile && !profile.activated_at ? "La cuenta todavía no fue activada." : "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (error) return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });

    await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", profile.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
