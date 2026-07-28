import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentProfile } from "@/lib/auth";

export default async function LoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  if (configured && await getCurrentProfile()) redirect("/");

  return (
    <main className="login-page">
      <section className="login-intro">
        <Image src="/logo-meriggi.jpeg" alt="Fundación Meriggi" width={150} height={150} priority />
        <span className="eyebrow">Asociación Civil</span>
        <h1>Fundación Meriggi</h1>
        <p>Gestión de agenda, pacientes, profesionales, secretaría y talleres.</p>
      </section>
      <section className="login-panel"><LoginForm /></section>
    </main>
  );
}
