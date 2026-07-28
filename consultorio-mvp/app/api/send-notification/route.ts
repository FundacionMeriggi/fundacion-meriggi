import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();
    if (!to || !subject || !html) return NextResponse.json({ sent: false, error: "Faltan datos" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      return NextResponse.json({ sent: false, simulated: true, message: "Notificación simulada: configurá RESEND_API_KEY y EMAIL_FROM." });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ sent: false, error: result }, { status: response.status });
    return NextResponse.json({ sent: true, id: result.id });
  } catch (error) {
    return NextResponse.json({ sent: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 });
  }
}
