import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({
    error: "Administración no puede definir contraseñas. Usá el reinicio de acceso para que la persona elija una nueva.",
  }, { status: 410 });
}
