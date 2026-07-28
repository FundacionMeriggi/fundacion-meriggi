import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, type AppRole, type Specialty } from "@/lib/auth";
import { createActivationToken, hashActivationToken, internalAuthEmail, sendActivationEmail } from "@/lib/invitations";

const allowedRoles = new Set<AppRole>(["admin", "professional", "secretary"]);
const allowedSpecialties = new Set<Specialty>(["psychologist", "group_operator", "administrative", "workshop", "secretary"]);

export async function POST(request: Request) {
  const current = await requireAdmin();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase() || null;
    const role = String(body.role ?? "") as AppRole;
    let specialty = String(body.specialty ?? "") as Specialty;

    if (role === "secretary") specialty = "secretary";
    if (!fullName || username.length < 3 || !allowedRoles.has(role) || !allowedSpecialties.has(specialty)) {
      return NextResponse.json({ error: "Datos incompletos o inválidos." }, { status: 400 });
    }
    if (email && !email.includes("@")) {
      return NextResponse.json({ error: "El correo no es válido." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: duplicate } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (duplicate) return NextResponse.json({ error: "Ese usuario ya existe." }, { status: 409 });

    const authEmail = email || internalAuthEmail(username);
    const activationToken = createActivationToken();
    const activationTokenHash = hashActivationToken(activationToken);
    const activationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
      user_metadata: { full_name: fullName, username },
      app_metadata: { role },
    });

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "No se pudo crear el usuario." }, { status: 400 });
    }

    const profilePayload = {
      id: created.user.id,
      clinic_id: current.clinic_id,
      full_name: fullName,
      username,
      email,
      auth_email: authEmail,
      role,
      specialty,
      license_number: String(body.licenseNumber ?? "").trim() || null,
      calendar_color: String(body.calendarColor ?? "#f5bc26"),
      active: true,
      must_change_password: true,
      activation_token_hash: activationTokenHash,
      activation_expires_at: activationExpiresAt,
      invitation_sent_at: email ? new Date().toISOString() : null,
    };

    const { error: profileError } = await admin.from("profiles").insert(profilePayload);
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (role === "professional" || (role === "admin" && specialty !== "administrative")) {
      await admin.from("professionals").insert({
        clinic_id: current.clinic_id,
        profile_id: created.user.id,
        full_name: fullName,
        specialty,
        license_number: profilePayload.license_number,
        email,
        calendar_color: profilePayload.calendar_color,
        active: true,
      });
    }

    const origin = new URL(request.url).origin;
    const activationUrl = `${origin}/activar?user=${encodeURIComponent(username)}&token=${encodeURIComponent(activationToken)}`;
    const delivery = email
      ? await sendActivationEmail({ to: email, fullName, username, activationUrl })
      : { sent: false, simulated: true };

    return NextResponse.json({
      ok: true,
      userId: created.user.id,
      activationUrl,
      activationCode: email ? undefined : activationToken,
      emailSent: "sent" in delivery ? delivery.sent : false,
      simulated: "simulated" in delivery ? delivery.simulated : false,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el usuario." }, { status: 500 });
  }
}
