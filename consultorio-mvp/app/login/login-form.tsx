"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });

    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <span className="eyebrow">Acceso privado</span>
      <h1>Ingresar</h1>
      <p>Cada integrante utiliza su usuario y la contraseña que eligió al activar su cuenta.</p>
      <label>Usuario<input name="username" autoComplete="username" minLength={3} required /></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button primary full" disabled={loading}>{loading ? "Ingresando…" : "Ingresar"}</button><p className="login-help">¿Es tu primer ingreso? Abrí el enlace de activación que te envió Fundación Meriggi.</p>
    </form>
  );
}
