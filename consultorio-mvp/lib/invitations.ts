import { createHash, randomBytes } from "node:crypto";

export function createActivationToken() {
  return randomBytes(24).toString("base64url");
}

export function hashActivationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function internalAuthEmail(username: string) {
  const domain = process.env.AUTH_ALIAS_DOMAIN || "access.fundacionmeriggi.org";
  return `${username.replace(/[^a-z0-9._-]/gi, "").toLowerCase()}@${domain}`;
}

export async function sendActivationEmail(input: {
  to: string;
  fullName: string;
  username: string;
  activationUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, simulated: true } as const;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Activá tu acceso — Fundación Meriggi",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#292824">
          <div style="border-top:10px solid #f5bc26;padding:28px;border:1px solid #e8e2d5;border-top-width:10px;border-radius:16px">
            <h1 style="margin:0 0 14px">Fundación Meriggi</h1>
            <p>Hola ${escapeHtml(input.fullName)},</p>
            <p>Tu acceso al sistema de gestión fue creado. Tocá el botón para elegir tu propia contraseña.</p>
            <p style="margin:28px 0"><a href="${input.activationUrl}" style="background:#f5bc26;color:#292824;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px">Activar mi cuenta</a></p>
            <p><strong>Usuario:</strong> ${escapeHtml(input.username)}</p>
            <p style="font-size:13px;color:#716d64">El enlace vence en 48 horas. Fundación Meriggi no puede ver la contraseña que elijas.</p>
          </div>
        </div>`,
    }),
  });

  if (!response.ok) return { sent: false, simulated: false, error: await response.text() } as const;
  return { sent: true, simulated: false } as const;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] ?? char);
}
