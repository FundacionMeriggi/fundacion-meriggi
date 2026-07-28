import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const current = await requireAdmin();
  if (!current) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  for (const key of ["full_name", "username", "email", "role", "specialty", "license_number", "calendar_color", "active"]) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .eq("clinic_id", current.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (typeof body.email === "string") {
    await admin.auth.admin.updateUserById(id, { email: body.email, email_confirm: true });
  }

  return NextResponse.json({ ok: true });
}
