import Image from "next/image";
import { Suspense } from "react";
import { ActivationForm } from "./activation-form";

export default function ActivatePage() {
  return (
    <main className="login-page">
      <section className="login-intro">
        <Image src="/logo-meriggi.jpeg" alt="Fundación Meriggi" width={150} height={150} priority />
        <span className="eyebrow">Asociación Civil</span>
        <h1>Fundación Meriggi</h1>
        <p>Activación segura del acceso al sistema de gestión.</p>
      </section>
      <section className="login-panel"><Suspense fallback={<div className="login-card">Cargando…</div>}><ActivationForm /></Suspense></section>
    </main>
  );
}
