import Image from 'next/image';

const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/fundacion-meriggi' : '';

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <Image src={`${base}/logo-meriggi.jpg`} alt="Fundación Meriggi" width={160} height={160} priority />
        <h1>Gestión clínica de Fundación Meriggi</h1>
        <p>Agenda, pacientes, equipo interdisciplinario, historias clínicas, grupos, talleres y portal del paciente en una única plataforma.</p>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
