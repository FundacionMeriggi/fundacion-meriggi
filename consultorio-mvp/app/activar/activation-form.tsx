"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ActivationForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const username = search.get("user") ?? "";
  const token = search.get("token") ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const repeat = String(form.get("repeat") ?? "");
    if (password !== repeat) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, token, password }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "No se pudo activar la cuenta.");
      return;
    }

    setDone(true);
    window.setTimeout(() => {
      router.replace(result.signedIn ? "/" : "/login");
      router.refresh();
    }, 1200);
  }

  if (!username || !token) {
    return <div className="login-card"><span className="eyebrow">Fundación Meriggi</span><h1>Enlace inválido</h1><p>Solicitá una nueva invitación al administrador.</p></div>;
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <span className="eyebrow">Primera activación</span>
      <h1>Elegí tu contraseña</h1>
      <p>Usuario: <strong>{username}</strong>. La contraseña es personal y no puede ser vista por administración.</p>
      <label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label>Repetir contraseña<input name="repeat" type="password" autoComplete="new-password" minLength={8} required /></label>
      {error && <p className="form-error">{error}</p>}
      {done && <p className="success-box">Cuenta activada. Ingresando…</p>}
      <button className="button primary full" disabled={loading || done}>{loading ? "Activando…" : "Activar cuenta"}</button>
    </form>
  );
}
