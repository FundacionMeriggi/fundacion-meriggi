import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardCheck,
  HeartHandshake,
  LockKeyhole,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { appPath, assetPath } from '@/lib/supabase';

const roleCards = [
  {
    icon: UserRound,
    eyebrow: 'Pacientes',
    title: 'Tu tratamiento, más cerca',
    text: 'Consultá turnos, pedí cambios, actualizá tus datos y accedé únicamente a los documentos que el equipo comparte con vos.',
    items: ['Agenda personal', 'Solicitudes y confirmaciones', 'Documentos compartidos'],
  },
  {
    icon: Stethoscope,
    eyebrow: 'Profesionales',
    title: 'Continuidad clínica',
    text: 'Una vista ordenada de cada proceso, con historia longitudinal, agenda, equipo tratante y registros protegidos por permisos.',
    items: ['Historia clínica cronológica', 'Pacientes asignados', 'Grupos y talleres'],
  },
  {
    icon: UsersRound,
    eyebrow: 'Coordinación',
    title: 'La institución en una sola vista',
    text: 'Agenda, admisiones, lista de espera, comunicaciones y tareas administrativas conectadas, sin mezclar accesos ni responsabilidades.',
    items: ['Roles diferenciados', 'Gestión operativa', 'Auditoría de cambios'],
  },
];

const capabilities = [
  { icon: CalendarCheck2, title: 'Agenda coordinada', text: 'Turnos, recurrencias, modalidades, estados y solicitudes de reprogramación.' },
  { icon: ClipboardCheck, title: 'Seguimiento longitudinal', text: 'Información administrativa y clínica separada según el rol de cada persona.' },
  { icon: MessagesSquare, title: 'Comunicación ordenada', text: 'Confirmaciones, recordatorios e historial de comunicaciones desde el mismo entorno.' },
  { icon: ShieldCheck, title: 'Acceso responsable', text: 'Cada paciente y cada integrante del equipo ve solamente lo que necesita para su tarea.' },
];

export default function HomePage() {
  return (
    <main className="public-site">
      <header className="site-header">
        <Link className="site-brand" href={appPath('/')} aria-label="Fundación Meriggi, inicio">
          <Image src={assetPath('/logo-meriggi.jpg')} alt="" width={48} height={48} priority />
          <span>
            <strong>Fundación Meriggi</strong>
            <small>Salud mental y acompañamiento</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#acompanamiento">Nuestro enfoque</a>
          <a href="#plataforma">La plataforma</a>
          <a href="#accesos">Accesos</a>
        </nav>
        <Link className="btn dark site-login" href={appPath('/login/')}>
          Ingresar <ArrowRight size={16} />
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker"><Sparkles size={15} /> Atención, equipo y continuidad</span>
          <h1>Salud mental con una red que acompaña.</h1>
          <p>
            Fundación Meriggi conecta a pacientes, profesionales y coordinación en un entorno
            cuidado para sostener cada tratamiento con más claridad y cercanía.
          </p>
          <div className="hero-actions">
            <Link className="btn primary hero-primary" href={appPath('/login/')}>
              Ingresar a mi espacio <ArrowRight size={17} />
            </Link>
            <a className="btn hero-secondary" href="#acompanamiento">Conocer la propuesta</a>
          </div>
          <div className="hero-trust" aria-label="Características principales">
            <span><HeartHandshake size={17} /> Acompañamiento integral</span>
            <span><LockKeyhole size={17} /> Información protegida</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Vista general de la plataforma">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <article className="hero-panel">
            <div className="hero-panel-head">
              <div className="hero-mini-brand">
                <Image src={assetPath('/logo-meriggi.jpg')} alt="" width={42} height={42} />
                <div><strong>Mi espacio</strong><small>Fundación Meriggi</small></div>
              </div>
              <span className="status-dot">Conexión segura</span>
            </div>
            <div className="hero-next">
              <span className="eyebrow">Próximo encuentro</span>
              <strong>Seguimiento individual</strong>
              <small>Tu agenda y el equipo tratante, siempre disponibles.</small>
              <div className="appointment-preview">
                <CalendarCheck2 size={20} />
                <div><b>Turnos organizados</b><span>Confirmá o solicitá un cambio</span></div>
              </div>
            </div>
            <div className="hero-panel-grid">
              <div><UserRound size={19} /><strong>Mi ficha</strong><small>Datos actualizados</small></div>
              <div><ClipboardCheck size={19} /><strong>Documentos</strong><small>Acceso compartido</small></div>
            </div>
          </article>
          <div className="floating-note note-one"><ShieldCheck size={17} /><span><b>Acceso por roles</b><small>Información precisa para cada persona</small></span></div>
          <div className="floating-note note-two"><UsersRound size={17} /><span><b>Equipo conectado</b><small>Más continuidad en cada proceso</small></span></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Principios de la Fundación">
        <span>Atención profesional</span>
        <i />
        <span>Trabajo interdisciplinario</span>
        <i />
        <span>Privacidad por diseño</span>
        <i />
        <span>Seguimiento continuo</span>
      </section>

      <section className="site-section approach" id="acompanamiento">
        <div className="section-heading">
          <span className="eyebrow">Un enfoque humano, una gestión clara</span>
          <h2>Cada persona encuentra su propio espacio.</h2>
          <p>
            La atención clínica, la coordinación cotidiana y el portal de pacientes conviven
            en una misma plataforma, pero permanecen correctamente separados.
          </p>
        </div>
        <div className="role-grid">
          {roleCards.map(({ icon: Icon, eyebrow, title, text, items }) => (
            <article className="role-card" key={title}>
              <div className="role-icon"><Icon size={23} /></div>
              <span className="eyebrow">{eyebrow}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <ul>{items.map((item) => <li key={item}><span />{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section platform-section" id="plataforma">
        <div className="platform-intro">
          <span className="eyebrow">Una plataforma pensada para Meriggi</span>
          <h2>Menos fragmentación. Más tiempo para acompañar.</h2>
          <p>
            La información importante deja de estar repartida entre agendas, mensajes y
            archivos aislados. Cada tarea queda dentro de un circuito claro y auditable.
          </p>
          <div className="secure-callout">
            <LockKeyhole size={20} />
            <div><strong>Privacidad en cada nivel</strong><span>Los permisos distinguen información clínica, administrativa y personal.</span></div>
          </div>
        </div>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-section access-section" id="accesos">
        <div>
          <span className="eyebrow">Acceso personal y seguro</span>
          <h2>Tu información empieza en tu cuenta.</h2>
          <p>
            Ingresá con el usuario o correo que recibiste. Si es tu primera vez, activá la
            cuenta con el código enviado por la Fundación.
          </p>
        </div>
        <div className="access-actions">
          <Link className="btn primary" href={appPath('/login/')}>Ingresar a la plataforma <ArrowRight size={17} /></Link>
          <Link className="btn" href={appPath('/activar/')}>Activar mi cuenta</Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-brand">
          <Image src={assetPath('/logo-meriggi.jpg')} alt="" width={44} height={44} />
          <span><strong>Fundación Meriggi</strong><small>Asistencia en Salud Mental y Adicciones</small></span>
        </div>
        <p>Un entorno digital para acompañar con continuidad, cuidado y responsabilidad.</p>
        <div><Link href={appPath('/login/')}>Ingreso</Link><Link href={appPath('/recuperar/')}>Recuperar acceso</Link></div>
      </footer>
    </main>
  );
}
