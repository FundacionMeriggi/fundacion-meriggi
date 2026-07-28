"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View = "inicio" | "agenda" | "pacientes" | "equipo" | "mensajes" | "configuracion";
type StaffRole = "Administrador clínico" | "Profesional" | "Recepción";
type AppointmentStatus = "Pendiente" | "Confirmado" | "En espera" | "Atendido" | "Ausente" | "Cancelado";
type Modality = "Presencial" | "Videollamada";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  specialty: string;
  license: string;
  color: string;
  active: boolean;
  notifyNewAppointment: boolean;
  notifyDailyAgenda: boolean;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  document: string;
  birthDate: string;
  email: string;
  phone: string;
  responsibleName: string;
  responsiblePhone: string;
  coverage: string;
  primaryProfessionalId: string;
  consent: boolean;
  notes: string;
};

type Appointment = {
  id: string;
  patientId: string;
  staffId: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  reason: string;
  modality: Modality;
  status: AppointmentStatus;
  notifyPatient: boolean;
  createdAt: string;
};

type ClinicalEntry = {
  id: string;
  patientId: string;
  staffId: string;
  date: string;
  type: "Evolución" | "Entrevista inicial" | "Seguimiento interdisciplinario";
  text: string;
  private: boolean;
};

type MessageLog = {
  id: string;
  sentAt: string;
  to: string;
  subject: string;
  kind: "Paciente" | "Staff";
  status: "Enviado" | "Simulado" | "Error";
};

type Settings = {
  foundationName: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  reminderHours: number;
  patientConfirmations: boolean;
  patientReminders: boolean;
  staffNotifications: boolean;
  dailyDigestTime: string;
};

type Store = {
  staff: Staff[];
  patients: Patient[];
  appointments: Appointment[];
  clinicalEntries: ClinicalEntry[];
  messages: MessageLog[];
  settings: Settings;
};

const todayISO = "2026-07-28";
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialStore: Store = {
  staff: [
    { id: "st-1", name: "Lic. Andrea Meriggi", email: "direccion@fundacionmeriggi.org", role: "Administrador clínico", specialty: "Psicología clínica", license: "MP 48.210", color: "#f5bc26", active: true, notifyNewAppointment: true, notifyDailyAgenda: true },
    { id: "st-2", name: "Lic. Martina López", email: "martina@fundacionmeriggi.org", role: "Profesional", specialty: "Psicología infantojuvenil", license: "MP 53.944", color: "#d99600", active: true, notifyNewAppointment: true, notifyDailyAgenda: true },
    { id: "st-3", name: "Dr. Tomás Rinaldi", email: "tomas@fundacionmeriggi.org", role: "Profesional", specialty: "Psiquiatría", license: "MP 41.088", color: "#7b5b00", active: true, notifyNewAppointment: true, notifyDailyAgenda: true },
    { id: "st-4", name: "Sofía Méndez", email: "recepcion@fundacionmeriggi.org", role: "Recepción", specialty: "Admisión y turnos", license: "", color: "#767676", active: true, notifyNewAppointment: false, notifyDailyAgenda: true },
  ],
  patients: [
    { id: "pa-1", firstName: "Malena", lastName: "Suárez", document: "41.223.119", birthDate: "2000-05-12", email: "malena.suarez@example.com", phone: "+54 9 11 5500-1101", responsibleName: "", responsiblePhone: "", coverage: "Particular", primaryProfessionalId: "st-1", consent: true, notes: "Prefiere contacto por correo electrónico." },
    { id: "pa-2", firstName: "Julián", lastName: "Paredes", document: "35.881.420", birthDate: "1990-09-08", email: "julian.paredes@example.com", phone: "+54 9 11 5500-1102", responsibleName: "", responsiblePhone: "", coverage: "OSDE 210", primaryProfessionalId: "st-3", consent: true, notes: "Seguimiento interdisciplinario." },
    { id: "pa-3", firstName: "Emilia", lastName: "Acosta", document: "49.104.880", birthDate: "2010-03-19", email: "familia.acosta@example.com", phone: "+54 9 11 5500-1103", responsibleName: "Paula Acosta", responsiblePhone: "+54 9 11 5511-2200", coverage: "Swiss Medical", primaryProfessionalId: "st-2", consent: true, notes: "Paciente menor de edad. Contactar a la persona responsable." },
    { id: "pa-4", firstName: "Bruno", lastName: "Fernández", document: "39.444.120", birthDate: "1995-12-01", email: "bruno.fernandez@example.com", phone: "+54 9 11 5500-1104", responsibleName: "", responsiblePhone: "", coverage: "Galeno", primaryProfessionalId: "st-1", consent: false, notes: "Consentimiento digital pendiente." },
  ],
  appointments: [
    { id: "ap-1", patientId: "pa-1", staffId: "st-1", date: todayISO, time: "09:00", duration: 50, service: "Psicoterapia individual", reason: "Sesión de seguimiento", modality: "Presencial", status: "Confirmado", notifyPatient: true, createdAt: "2026-07-26T12:00:00-03:00" },
    { id: "ap-2", patientId: "pa-3", staffId: "st-2", date: todayISO, time: "10:00", duration: 50, service: "Psicología infantojuvenil", reason: "Entrevista de seguimiento", modality: "Presencial", status: "Pendiente", notifyPatient: true, createdAt: "2026-07-25T14:00:00-03:00" },
    { id: "ap-3", patientId: "pa-2", staffId: "st-3", date: todayISO, time: "11:30", duration: 40, service: "Consulta psiquiátrica", reason: "Control de tratamiento", modality: "Videollamada", status: "En espera", notifyPatient: true, createdAt: "2026-07-23T15:00:00-03:00" },
    { id: "ap-4", patientId: "pa-4", staffId: "st-1", date: todayISO, time: "14:00", duration: 50, service: "Admisión", reason: "Primera entrevista", modality: "Presencial", status: "Pendiente", notifyPatient: false, createdAt: "2026-07-27T11:00:00-03:00" },
    { id: "ap-5", patientId: "pa-1", staffId: "st-1", date: "2026-07-30", time: "09:00", duration: 50, service: "Psicoterapia individual", reason: "Sesión de seguimiento", modality: "Presencial", status: "Confirmado", notifyPatient: true, createdAt: "2026-07-26T12:00:00-03:00" },
  ],
  clinicalEntries: [
    { id: "ce-1", patientId: "pa-1", staffId: "st-1", date: "2026-07-21", type: "Evolución", text: "Se trabajaron recursos para la regulación emocional y organización de rutinas. Continúa seguimiento semanal.", private: true },
    { id: "ce-2", patientId: "pa-2", staffId: "st-3", date: "2026-07-18", type: "Seguimiento interdisciplinario", text: "Se revisó evolución general y coordinación con el espacio de psicoterapia. Próximo control en cuatro semanas.", private: true },
    { id: "ce-3", patientId: "pa-3", staffId: "st-2", date: "2026-07-15", type: "Entrevista inicial", text: "Entrevista con persona responsable. Se acordaron objetivos iniciales y frecuencia de encuentros.", private: true },
  ],
  messages: [],
  settings: {
    foundationName: "Fundación Meriggi",
    legalName: "Asociación Civil Meriggi — Asistencia en Salud Mental y Adicciones",
    phone: "+54 11 5555-3400",
    email: "contacto@fundacionmeriggi.org",
    address: "Buenos Aires, Argentina",
    website: "www.fundacionmeriggi.org",
    reminderHours: 24,
    patientConfirmations: true,
    patientReminders: true,
    staffNotifications: true,
    dailyDigestTime: "18:00",
  },
};

const viewLabels: Record<View, string> = {
  inicio: "Inicio",
  agenda: "Agenda",
  pacientes: "Pacientes",
  equipo: "Staff",
  mensajes: "Comunicaciones",
  configuracion: "Administración",
};

const navIcons: Record<View, string> = { inicio: "⌂", agenda: "▦", pacientes: "◯", equipo: "♧", mensajes: "✉", configuracion: "⚙" };

const formatDate = (date: string) => new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
const fullName = (patient?: Patient) => patient ? `${patient.firstName} ${patient.lastName}` : "Paciente";

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${wide ? "wide" : ""}`}><div className="modal-head"><div><span className="eyebrow">Fundación Meriggi</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button></div>{children}</div></div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><div>○</div><strong>{title}</strong><p>{text}</p></div>;
}

export function MeriggiApp() {
  const [store, setStore] = useState<Store>(initialStore);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<null | "appointment" | "patient" | "staff" | "message" | "clinical" | "import">(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [agendaStaff, setAgendaStaff] = useState("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [appointmentDraft, setAppointmentDraft] = useState<Appointment | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ to: string; subject: string; body: string; kind: "Paciente" | "Staff" } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("fundacion-meriggi-store-v2");
      if (saved) setStore(JSON.parse(saved));
    } catch { /* usar datos iniciales */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("fundacion-meriggi-store-v2", JSON.stringify(store));
  }, [store, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeStaff = useMemo(() => store.staff.filter((member) => member.active), [store.staff]);
  const dayAppointments = useMemo(() => store.appointments.filter((appointment) => appointment.date === selectedDate && (agendaStaff === "all" || appointment.staffId === agendaStaff)).sort((a, b) => a.time.localeCompare(b.time)), [store.appointments, selectedDate, agendaStaff]);
  const todayAppointments = useMemo(() => store.appointments.filter((appointment) => appointment.date === todayISO).sort((a, b) => a.time.localeCompare(b.time)), [store.appointments]);
  const selectedPatient = store.patients.find((patient) => patient.id === selectedPatientId);

  const getPatient = (patientId: string) => store.patients.find((patient) => patient.id === patientId);
  const getStaff = (staffId: string) => store.staff.find((member) => member.id === staffId);
  const notify = (message: string) => setToast(message);

  async function sendEmail(payload: { to: string; subject: string; html: string; kind: "Paciente" | "Staff" }) {
    let status: MessageLog["status"] = "Simulado";
    try {
      const response = await fetch("/api/send-notification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      status = result.sent ? "Enviado" : result.simulated ? "Simulado" : "Error";
    } catch {
      status = "Simulado";
    }
    setStore((current) => ({ ...current, messages: [{ id: id("msg"), sentAt: new Date().toISOString(), to: payload.to, subject: payload.subject, kind: payload.kind, status }, ...current.messages] }));
    notify(status === "Enviado" ? "Correo enviado correctamente." : "Notificación guardada en modo demo. Para envío real, configurá Resend.");
  }

  function openNewAppointment() {
    setAppointmentDraft({ id: id("ap"), patientId: store.patients[0]?.id ?? "", staffId: activeStaff.find((member) => member.role !== "Recepción")?.id ?? "", date: selectedDate, time: "09:00", duration: 50, service: "Psicoterapia individual", reason: "", modality: "Presencial", status: "Pendiente", notifyPatient: true, createdAt: new Date().toISOString() });
    setModal("appointment");
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!appointmentDraft) return;
    const exists = store.appointments.some((appointment) => appointment.id === appointmentDraft.id);
    setStore((current) => ({ ...current, appointments: exists ? current.appointments.map((appointment) => appointment.id === appointmentDraft.id ? appointmentDraft : appointment) : [...current.appointments, appointmentDraft] }));
    setModal(null);
    const patient = getPatient(appointmentDraft.patientId);
    const member = getStaff(appointmentDraft.staffId);
    if (!exists && store.settings.staffNotifications && member?.notifyNewAppointment && member.email) {
      await sendEmail({ to: member.email, subject: `Nuevo turno — ${fullName(patient)}`, kind: "Staff", html: emailTemplate("Nuevo turno asignado", `<p>Se agendó un turno para <strong>${fullName(patient)}</strong>.</p><p><strong>Fecha:</strong> ${formatDate(appointmentDraft.date)} a las ${appointmentDraft.time}<br><strong>Servicio:</strong> ${appointmentDraft.service}<br><strong>Modalidad:</strong> ${appointmentDraft.modality}</p>`) });
    }
    if (!exists && appointmentDraft.notifyPatient && store.settings.patientConfirmations && patient?.email) {
      await sendEmail({ to: patient.email, subject: "Confirmación de turno — Fundación Meriggi", kind: "Paciente", html: emailTemplate("Tu turno fue registrado", `<p>Hola ${patient.firstName}, tu turno en Fundación Meriggi quedó registrado.</p><p><strong>Fecha:</strong> ${formatDate(appointmentDraft.date)} a las ${appointmentDraft.time}<br><strong>Profesional:</strong> ${member?.name}<br><strong>Modalidad:</strong> ${appointmentDraft.modality}</p><p>Ante cualquier cambio, comunicate con la institución.</p>`) });
    }
    notify(exists ? "Turno actualizado." : "Turno creado y notificaciones procesadas.");
  }

  function deleteAppointment(appointmentId: string) {
    if (!window.confirm("¿Cancelar este turno? Quedará registrado como cancelado.")) return;
    setStore((current) => ({ ...current, appointments: current.appointments.map((appointment) => appointment.id === appointmentId ? { ...appointment, status: "Cancelado" } : appointment) }));
    notify("Turno cancelado.");
  }

  async function remindAppointment(appointment: Appointment) {
    const patient = getPatient(appointment.patientId);
    const member = getStaff(appointment.staffId);
    if (!patient?.email) return notify("El paciente no tiene correo cargado.");
    await sendEmail({ to: patient.email, subject: "Recordatorio de turno — Fundación Meriggi", kind: "Paciente", html: emailTemplate("Recordatorio de turno", `<p>Hola ${patient.firstName}, te recordamos tu próximo turno.</p><p><strong>Fecha:</strong> ${formatDate(appointment.date)} a las ${appointment.time}<br><strong>Profesional:</strong> ${member?.name}<br><strong>Modalidad:</strong> ${appointment.modality}</p><p>Si no podés asistir, por favor avisá con anticipación.</p>`) });
  }

  async function sendDailyAgenda(member: Staff) {
    const list = store.appointments.filter((appointment) => appointment.staffId === member.id && appointment.date >= todayISO && appointment.status !== "Cancelado").sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 8);
    if (!member.email) return notify("El integrante no tiene correo cargado.");
    const rows = list.map((appointment) => `<li><strong>${formatDate(appointment.date)} ${appointment.time}</strong> — ${fullName(getPatient(appointment.patientId))} · ${appointment.service}</li>`).join("");
    await sendEmail({ to: member.email, subject: "Próximos pacientes — Fundación Meriggi", kind: "Staff", html: emailTemplate("Próximos pacientes", rows ? `<ul>${rows}</ul>` : "<p>No hay turnos próximos registrados.</p>") });
  }

  function savePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPatient: Patient = {
      id: id("pa"), firstName: String(form.get("firstName")), lastName: String(form.get("lastName")), document: String(form.get("document")), birthDate: String(form.get("birthDate")), email: String(form.get("email")), phone: String(form.get("phone")), responsibleName: String(form.get("responsibleName")), responsiblePhone: String(form.get("responsiblePhone")), coverage: String(form.get("coverage")), primaryProfessionalId: String(form.get("primaryProfessionalId")), consent: form.get("consent") === "on", notes: String(form.get("notes")),
    };
    setStore((current) => ({ ...current, patients: [...current.patients, newPatient] }));
    setModal(null); setSelectedPatientId(newPatient.id); setView("pacientes"); notify("Paciente agregado.");
  }

  function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const member: Staff = { id: id("st"), name: String(form.get("name")), email: String(form.get("email")), role: String(form.get("role")) as StaffRole, specialty: String(form.get("specialty")), license: String(form.get("license")), color: String(form.get("color")), active: true, notifyNewAppointment: form.get("notifyNewAppointment") === "on", notifyDailyAgenda: form.get("notifyDailyAgenda") === "on" };
    setStore((current) => ({ ...current, staff: [...current.staff, member] }));
    setModal(null); notify("Integrante del staff agregado.");
  }

  function saveClinicalEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) return;
    const form = new FormData(event.currentTarget);
    const entry: ClinicalEntry = { id: id("ce"), patientId: selectedPatient.id, staffId: String(form.get("staffId")), date: String(form.get("date")), type: String(form.get("type")) as ClinicalEntry["type"], text: String(form.get("text")), private: true };
    setStore((current) => ({ ...current, clinicalEntries: [entry, ...current.clinicalEntries] }));
    setModal(null); notify("Evolución clínica registrada.");
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStore((current) => ({ ...current, settings: { foundationName: String(form.get("foundationName")), legalName: String(form.get("legalName")), phone: String(form.get("phone")), email: String(form.get("email")), address: String(form.get("address")), website: String(form.get("website")), reminderHours: Number(form.get("reminderHours")), patientConfirmations: form.get("patientConfirmations") === "on", patientReminders: form.get("patientReminders") === "on", staffNotifications: form.get("staffNotifications") === "on", dailyDigestTime: String(form.get("dailyDigestTime")) } }));
    notify("Configuración guardada.");
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `fundacion-meriggi-respaldo-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    URL.revokeObjectURL(url);
    notify("Respaldo exportado.");
  }

  function importBackup(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { setStore(JSON.parse(String(reader.result))); notify("Respaldo importado."); }
      catch { notify("El archivo no es un respaldo válido."); }
    };
    reader.readAsText(file);
  }

  function resetDemo() {
    if (!window.confirm("¿Restaurar todos los datos de ejemplo?")) return;
    setStore(initialStore); notify("Datos de ejemplo restaurados.");
  }

  function emailTemplate(title: string, content: string) {
    return `<div style="font-family:Arial,sans-serif;background:#f7f5ef;padding:28px;color:#282828"><div style="max-width:620px;margin:auto;background:white;border-radius:18px;overflow:hidden;border:1px solid #ebe5d5"><div style="background:#f5bc26;padding:18px 26px"><strong style="font-size:20px">Fundación Meriggi</strong></div><div style="padding:28px"><h1 style="font-size:24px;margin:0 0 18px">${title}</h1>${content}<p style="margin-top:28px;color:#6c685e;font-size:13px">Asistencia en Salud Mental y Adicciones · ${store.settings.phone}</p></div></div></div>`;
  }

  const filteredPatients = store.patients.filter((patient) => `${patient.firstName} ${patient.lastName} ${patient.document} ${patient.email}`.toLowerCase().includes(patientSearch.toLowerCase()));
  const pendingToday = todayAppointments.filter((appointment) => !["Atendido", "Cancelado"].includes(appointment.status)).length;
  const unconfirmed = store.appointments.filter((appointment) => appointment.date >= todayISO && appointment.status === "Pendiente").length;

  if (!hydrated) return <div className="loading-screen"><img src="/logo-meriggi.jpeg" alt="Fundación Meriggi" /><p>Cargando gestión institucional…</p></div>;

  return <div className="meriggi-app">
    <aside className="sidebar">
      <button className="brand" onClick={() => setView("inicio")}><img src="/logo-meriggi.jpeg" alt="Logo Fundación Meriggi" /><span><strong>Fundación Meriggi</strong><small>Gestión de salud mental</small></span></button>
      <nav>{(Object.keys(viewLabels) as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}><i>{navIcons[item]}</i><span>{viewLabels[item]}</span></button>)}</nav>
      <div className="sidebar-admin"><span className="avatar">AM</span><div><strong>Lic. Andrea Meriggi</strong><small>Administradora clínica</small></div></div>
    </aside>

    <main className="main">
      <div className="mobile-brand"><img src="/logo-meriggi.jpeg" alt="" /><strong>Fundación Meriggi</strong><select value={view} onChange={(event) => setView(event.target.value as View)}>{(Object.keys(viewLabels) as View[]).map((item) => <option key={item} value={item}>{viewLabels[item]}</option>)}</select></div>

      {view === "inicio" && <section className="page">
        <header className="page-header"><div><span className="eyebrow">Martes 28 de julio</span><h1>Panel institucional</h1><p>Actividad clínica, turnos y comunicaciones de Fundación Meriggi.</p></div><div className="header-actions"><button className="button secondary" onClick={() => setModal("patient")}>+ Paciente</button><button className="button primary" onClick={openNewAppointment}>+ Nuevo turno</button></div></header>
        <div className="stats"><article><span>Turnos de hoy</span><strong>{todayAppointments.length}</strong><small>{pendingToday} por atender</small></article><article><span>Pacientes activos</span><strong>{store.patients.length}</strong><small>{store.patients.filter((p) => p.consent).length} con consentimiento</small></article><article><span>Staff activo</span><strong>{activeStaff.length}</strong><small>{activeStaff.filter((s) => s.role === "Profesional" || s.role === "Administrador clínico").length} perfiles clínicos</small></article><article><span>Sin confirmar</span><strong>{unconfirmed}</strong><small>Próximos turnos</small></article></div>
        <div className="dashboard-grid"><article className="card span-2"><div className="card-head"><div><span className="eyebrow">Agenda</span><h2>Próximos pacientes</h2></div><button className="link-button" onClick={() => setView("agenda")}>Abrir agenda</button></div><div className="appointment-list">{todayAppointments.map((appointment) => { const patient = getPatient(appointment.patientId); const member = getStaff(appointment.staffId); return <div className="appointment-row" key={appointment.id}><time>{appointment.time}</time><span className="staff-dot" style={{ background: member?.color }} /><div><strong>{fullName(patient)}</strong><span>{appointment.service} · {appointment.modality}</span><small>{member?.name}</small></div><span className={`status ${appointment.status.toLowerCase().replace(" ", "-")}`}>{appointment.status}</span></div>; })}</div></article><article className="card"><div className="card-head"><div><span className="eyebrow">Control</span><h2>Accesos rápidos</h2></div></div><div className="quick-list"><button onClick={openNewAppointment}><b>01</b><span><strong>Agendar consulta</strong><small>Asignar paciente y profesional</small></span></button><button onClick={() => { setView("pacientes"); setSelectedPatientId(store.patients[0]?.id ?? null); }}><b>02</b><span><strong>Abrir historia clínica</strong><small>Ver ficha y evoluciones</small></span></button><button onClick={() => setView("mensajes")}><b>03</b><span><strong>Comunicaciones</strong><small>Recordatorios y correos enviados</small></span></button></div></article></div>
        <div className="foundation-strip"><img src="/logo-meriggi.jpeg" alt="" /><div><strong>Asistencia en Salud Mental y Adicciones</strong><p>Herramienta interna con acceso diferenciado para administración, recepción y profesionales.</p></div><span>Fundación Meriggi</span></div>
      </section>}

      {view === "agenda" && <section className="page"><header className="page-header"><div><span className="eyebrow">Agenda clínica</span><h1>Turnos</h1><p>Creá, modificá, notificá o cancelá turnos desde un solo lugar.</p></div><button className="button primary" onClick={openNewAppointment}>+ Nuevo turno</button></header><div className="toolbar"><label>Fecha<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>Profesional<select value={agendaStaff} onChange={(event) => setAgendaStaff(event.target.value)}><option value="all">Todo el staff</option>{activeStaff.filter((member) => member.role !== "Recepción").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="toolbar-summary"><strong>{dayAppointments.length}</strong><span>turnos el {formatDate(selectedDate)}</span></div></div><div className="card table-card">{dayAppointments.length ? <table><thead><tr><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Servicio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{dayAppointments.map((appointment) => { const patient = getPatient(appointment.patientId); const member = getStaff(appointment.staffId); return <tr key={appointment.id}><td><strong>{appointment.time}</strong><small>{appointment.duration} min</small></td><td><button className="table-person" onClick={() => { setSelectedPatientId(patient?.id ?? null); setView("pacientes"); }}><strong>{fullName(patient)}</strong><small>{patient?.phone}</small></button></td><td><span className="professional-cell"><i style={{ background: member?.color }} />{member?.name}</span></td><td>{appointment.service}<small>{appointment.modality}</small></td><td><select className="status-select" value={appointment.status} onChange={(event) => setStore((current) => ({ ...current, appointments: current.appointments.map((item) => item.id === appointment.id ? { ...item, status: event.target.value as AppointmentStatus } : item) }))}>{["Pendiente", "Confirmado", "En espera", "Atendido", "Ausente", "Cancelado"].map((status) => <option key={status}>{status}</option>)}</select></td><td><div className="row-actions"><button title="Enviar recordatorio" onClick={() => remindAppointment(appointment)}>✉</button><button title="Editar" onClick={() => { setAppointmentDraft(appointment); setModal("appointment"); }}>✎</button><button title="Cancelar" onClick={() => deleteAppointment(appointment.id)}>×</button></div></td></tr>; })}</tbody></table> : <Empty title="Sin turnos" text="No hay turnos registrados para esta fecha y profesional." />}</div></section>}

      {view === "pacientes" && <section className="page"><header className="page-header"><div><span className="eyebrow">Pacientes</span><h1>Fichas e historia clínica</h1><p>Información de contacto, responsables, consentimiento y seguimiento clínico.</p></div><button className="button primary" onClick={() => setModal("patient")}>+ Nuevo paciente</button></header><div className="patients-layout"><aside className="patient-list"><input className="search" placeholder="Buscar por nombre, DNI o correo" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} />{filteredPatients.map((patient) => <button key={patient.id} className={selectedPatientId === patient.id ? "active" : ""} onClick={() => setSelectedPatientId(patient.id)}><span>{patient.firstName[0]}{patient.lastName[0]}</span><div><strong>{fullName(patient)}</strong><small>{patient.document} · {patient.coverage}</small></div></button>)}</aside><div className="patient-detail">{selectedPatient ? <><div className="patient-hero"><div className="patient-avatar">{selectedPatient.firstName[0]}{selectedPatient.lastName[0]}</div><div><span className="eyebrow">Ficha del paciente</span><h2>{fullName(selectedPatient)}</h2><p>{selectedPatient.coverage} · Profesional referente: {getStaff(selectedPatient.primaryProfessionalId)?.name ?? "Sin asignar"}</p></div><div className="patient-actions"><button className="button secondary" onClick={() => { setMessageTarget({ to: selectedPatient.email, subject: "Mensaje de Fundación Meriggi", body: `Hola ${selectedPatient.firstName},`, kind: "Paciente" }); setModal("message"); }}>Enviar correo</button><button className="button primary" onClick={() => setModal("clinical")}>+ Evolución</button></div></div><div className="patient-info-grid"><article><small>DNI</small><strong>{selectedPatient.document}</strong></article><article><small>Fecha de nacimiento</small><strong>{selectedPatient.birthDate || "Sin informar"}</strong></article><article><small>Correo</small><strong>{selectedPatient.email || "Sin informar"}</strong></article><article><small>Teléfono</small><strong>{selectedPatient.phone || "Sin informar"}</strong></article><article><small>Persona responsable</small><strong>{selectedPatient.responsibleName || "No corresponde"}</strong></article><article><small>Consentimiento</small><strong className={selectedPatient.consent ? "positive" : "negative"}>{selectedPatient.consent ? "Registrado" : "Pendiente"}</strong></article></div><div className="detail-grid"><article className="card"><div className="card-head"><div><span className="eyebrow">Historia clínica</span><h2>Evoluciones</h2></div><span className="confidential">Acceso clínico</span></div>{store.clinicalEntries.filter((entry) => entry.patientId === selectedPatient.id).length ? store.clinicalEntries.filter((entry) => entry.patientId === selectedPatient.id).map((entry) => <div className="clinical-entry" key={entry.id}><div><strong>{entry.type}</strong><small>{entry.date} · {getStaff(entry.staffId)?.name}</small></div><p>{entry.text}</p><span>Documento confidencial</span></div>) : <Empty title="Sin evoluciones" text="Todavía no hay registros clínicos para este paciente." />}</article><article className="card"><div className="card-head"><div><span className="eyebrow">Información administrativa</span><h2>Contacto y notas</h2></div></div><dl className="definition-list"><div><dt>Responsable</dt><dd>{selectedPatient.responsibleName || "No corresponde"}</dd></div><div><dt>Teléfono responsable</dt><dd>{selectedPatient.responsiblePhone || "—"}</dd></div><div><dt>Observaciones</dt><dd>{selectedPatient.notes || "Sin observaciones."}</dd></div></dl><button className="button secondary full" onClick={() => { setAppointmentDraft({ id: id("ap"), patientId: selectedPatient.id, staffId: selectedPatient.primaryProfessionalId || activeStaff[0]?.id, date: selectedDate, time: "09:00", duration: 50, service: "Psicoterapia individual", reason: "", modality: "Presencial", status: "Pendiente", notifyPatient: true, createdAt: new Date().toISOString() }); setModal("appointment"); }}>Agendar turno</button></article></div></> : <Empty title="Seleccioná un paciente" text="Elegí una ficha de la lista para consultar datos y evoluciones." />}</div></div></section>}

      {view === "equipo" && <section className="page"><header className="page-header"><div><span className="eyebrow">Staff</span><h1>Equipo y accesos</h1><p>El administrador puede incorporar usuarios, asignar roles y decidir qué correos recibe cada integrante.</p></div><button className="button primary" onClick={() => setModal("staff")}>+ Agregar al staff</button></header><div className="staff-grid">{store.staff.map((member) => { const next = store.appointments.filter((appointment) => appointment.staffId === member.id && appointment.date >= todayISO && appointment.status !== "Cancelado").length; return <article className={`staff-card ${!member.active ? "inactive" : ""}`} key={member.id}><div className="staff-top"><span className="large-avatar" style={{ background: member.color }}>{member.name.split(" ").slice(-2).map((part) => part[0]).join("")}</span><div><h3>{member.name}</h3><p>{member.specialty}</p><small>{member.email}</small></div><label className="switch"><input type="checkbox" checked={member.active} onChange={(event) => setStore((current) => ({ ...current, staff: current.staff.map((item) => item.id === member.id ? { ...item, active: event.target.checked } : item) }))} /><span /></label></div><div className="staff-meta"><span>{member.role}</span><span>{member.license || "Sin matrícula"}</span><span>{next} próximos turnos</span></div><div className="notification-options"><label><input type="checkbox" checked={member.notifyNewAppointment} onChange={(event) => setStore((current) => ({ ...current, staff: current.staff.map((item) => item.id === member.id ? { ...item, notifyNewAppointment: event.target.checked } : item) }))} /> Correo al asignar turno</label><label><input type="checkbox" checked={member.notifyDailyAgenda} onChange={(event) => setStore((current) => ({ ...current, staff: current.staff.map((item) => item.id === member.id ? { ...item, notifyDailyAgenda: event.target.checked } : item) }))} /> Resumen de próximos pacientes</label></div><button className="button secondary full" onClick={() => sendDailyAgenda(member)}>Enviar próximos pacientes por correo</button></article>; })}</div><div className="security-note"><strong>Permisos recomendados</strong><p><b>Administración clínica:</b> controla configuración, staff, pacientes, agenda y documentación clínica. <b>Profesionales:</b> acceden a su agenda y a información clínica autorizada. <b>Recepción:</b> gestiona datos administrativos y turnos, sin abrir evoluciones clínicas.</p></div></section>}

      {view === "mensajes" && <section className="page"><header className="page-header"><div><span className="eyebrow">Comunicaciones</span><h1>Correos y recordatorios</h1><p>Confirmaciones para pacientes y avisos de agenda para el staff.</p></div><button className="button primary" onClick={() => { setMessageTarget({ to: "", subject: "Mensaje de Fundación Meriggi", body: "", kind: "Paciente" }); setModal("message"); }}>+ Nuevo correo</button></header><div className="comm-grid"><article className="card"><div className="card-head"><div><span className="eyebrow">Automatizaciones</span><h2>Reglas activas</h2></div></div><div className="automation-list"><label><div><strong>Confirmación al crear turno</strong><small>Envía al correo del paciente los datos del turno.</small></div><input type="checkbox" checked={store.settings.patientConfirmations} onChange={(event) => setStore((current) => ({ ...current, settings: { ...current.settings, patientConfirmations: event.target.checked } }))} /></label><label><div><strong>Recordatorio para pacientes</strong><small>Programado {store.settings.reminderHours} horas antes.</small></div><input type="checkbox" checked={store.settings.patientReminders} onChange={(event) => setStore((current) => ({ ...current, settings: { ...current.settings, patientReminders: event.target.checked } }))} /></label><label><div><strong>Aviso al staff</strong><small>Notifica cuando se asigna o modifica un turno.</small></div><input type="checkbox" checked={store.settings.staffNotifications} onChange={(event) => setStore((current) => ({ ...current, settings: { ...current.settings, staffNotifications: event.target.checked } }))} /></label></div></article><article className="card branded-card"><img src="/logo-meriggi.jpeg" alt="" /><div><span className="eyebrow">Identidad institucional</span><h2>Mensajes con marca Meriggi</h2><p>Los correos incluyen el nombre de la fundación, sus colores y datos de contacto.</p></div></article></div><div className="card table-card message-table"><div className="card-head padded"><div><span className="eyebrow">Historial</span><h2>Últimos envíos</h2></div></div>{store.messages.length ? <table><thead><tr><th>Fecha</th><th>Destinatario</th><th>Asunto</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>{store.messages.map((message) => <tr key={message.id}><td>{new Date(message.sentAt).toLocaleString("es-AR")}</td><td>{message.to}</td><td>{message.subject}</td><td>{message.kind}</td><td><span className={`send-status ${message.status.toLowerCase()}`}>{message.status}</span></td></tr>)}</tbody></table> : <Empty title="Todavía no hay envíos" text="Al crear un turno o enviar una agenda, los movimientos aparecerán acá." />}</div></section>}

      {view === "configuracion" && <section className="page"><header className="page-header"><div><span className="eyebrow">Control de la aplicación</span><h1>Administración</h1><p>Modificá la identidad, las comunicaciones y los datos operativos de Fundación Meriggi.</p></div></header><form className="settings-grid" onSubmit={saveSettings}><article className="card settings-card"><div className="card-head"><div><span className="eyebrow">Institución</span><h2>Datos generales</h2></div></div><div className="form-grid"><label>Nombre visible<input name="foundationName" defaultValue={store.settings.foundationName} required /></label><label>Razón institucional<input name="legalName" defaultValue={store.settings.legalName} /></label><label>Correo general<input name="email" type="email" defaultValue={store.settings.email} /></label><label>Teléfono<input name="phone" defaultValue={store.settings.phone} /></label><label>Dirección<input name="address" defaultValue={store.settings.address} /></label><label>Sitio web<input name="website" defaultValue={store.settings.website} /></label></div></article><article className="card settings-card"><div className="card-head"><div><span className="eyebrow">Notificaciones</span><h2>Reglas predeterminadas</h2></div></div><div className="form-grid"><label>Recordar con anticipación<input name="reminderHours" type="number" min="1" defaultValue={store.settings.reminderHours} /><small>Horas antes del turno</small></label><label>Horario del resumen diario<input name="dailyDigestTime" type="time" defaultValue={store.settings.dailyDigestTime} /></label></div><div className="check-stack"><label><input name="patientConfirmations" type="checkbox" defaultChecked={store.settings.patientConfirmations} /> Enviar confirmación al paciente</label><label><input name="patientReminders" type="checkbox" defaultChecked={store.settings.patientReminders} /> Enviar recordatorios automáticos</label><label><input name="staffNotifications" type="checkbox" defaultChecked={store.settings.staffNotifications} /> Notificar al staff por correo</label></div></article><div className="settings-actions"><button className="button primary" type="submit">Guardar configuración</button></div></form><div className="admin-tools"><article className="card"><span className="eyebrow">Respaldo</span><h2>Control de datos</h2><p>Exportá una copia completa o restaurá un respaldo anterior. En producción, esto se complementa con copias automáticas de la base de datos.</p><div className="button-row"><button className="button secondary" onClick={exportBackup}>Exportar JSON</button><button className="button secondary" onClick={() => importRef.current?.click()}>Importar respaldo</button><input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => importBackup(event.target.files?.[0])} /><button className="button danger" onClick={resetDemo}>Restaurar demo</button></div></article><article className="card logo-card"><img src="/logo-meriggi.jpeg" alt="Logo Fundación Meriggi" /><div><strong>Paleta institucional aplicada</strong><p>Amarillo Meriggi, blanco cálido, negro y grises neutros.</p></div></article></div></section>}
    </main>

    {modal === "appointment" && appointmentDraft && <Modal title={store.appointments.some((appointment) => appointment.id === appointmentDraft.id) ? "Modificar turno" : "Nuevo turno"} onClose={() => setModal(null)} wide><form className="modal-form" onSubmit={saveAppointment}><div className="form-grid"><label>Paciente<select value={appointmentDraft.patientId} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, patientId: event.target.value })} required>{store.patients.map((patient) => <option key={patient.id} value={patient.id}>{fullName(patient)}</option>)}</select></label><label>Profesional<select value={appointmentDraft.staffId} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, staffId: event.target.value })} required>{activeStaff.filter((member) => member.role !== "Recepción").map((member) => <option key={member.id} value={member.id}>{member.name} — {member.specialty}</option>)}</select></label><label>Fecha<input type="date" value={appointmentDraft.date} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, date: event.target.value })} required /></label><label>Hora<input type="time" value={appointmentDraft.time} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, time: event.target.value })} required /></label><label>Duración<input type="number" min="10" step="5" value={appointmentDraft.duration} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, duration: Number(event.target.value) })} /></label><label>Modalidad<select value={appointmentDraft.modality} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, modality: event.target.value as Modality })}><option>Presencial</option><option>Videollamada</option></select></label><label>Servicio<select value={appointmentDraft.service} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, service: event.target.value })}><option>Psicoterapia individual</option><option>Psicología infantojuvenil</option><option>Consulta psiquiátrica</option><option>Admisión</option><option>Orientación familiar</option><option>Seguimiento interdisciplinario</option></select></label><label>Estado<select value={appointmentDraft.status} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, status: event.target.value as AppointmentStatus })}>{["Pendiente", "Confirmado", "En espera", "Atendido", "Ausente", "Cancelado"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="full-field">Motivo / nota administrativa<textarea value={appointmentDraft.reason} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, reason: event.target.value })} placeholder="Información breve, sin detalles clínicos sensibles" /></label></div><label className="checkbox-line"><input type="checkbox" checked={appointmentDraft.notifyPatient} onChange={(event) => setAppointmentDraft({ ...appointmentDraft, notifyPatient: event.target.checked })} /> Enviar confirmación al correo del paciente al guardar</label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" type="submit">Guardar turno</button></div></form></Modal>}

    {modal === "patient" && <Modal title="Nuevo paciente" onClose={() => setModal(null)} wide><form className="modal-form" onSubmit={savePatient}><div className="form-grid"><label>Nombre<input name="firstName" required /></label><label>Apellido<input name="lastName" required /></label><label>DNI<input name="document" /></label><label>Fecha de nacimiento<input name="birthDate" type="date" /></label><label>Correo<input name="email" type="email" /></label><label>Teléfono<input name="phone" /></label><label>Cobertura<input name="coverage" placeholder="Particular / obra social" /></label><label>Profesional referente<select name="primaryProfessionalId"><option value="">Sin asignar</option>{activeStaff.filter((member) => member.role !== "Recepción").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Persona responsable<input name="responsibleName" /></label><label>Teléfono responsable<input name="responsiblePhone" /></label><label className="full-field">Observaciones administrativas<textarea name="notes" /></label></div><label className="checkbox-line"><input name="consent" type="checkbox" /> Consentimiento informado registrado</label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button primary">Guardar paciente</button></div></form></Modal>}

    {modal === "staff" && <Modal title="Agregar integrante" onClose={() => setModal(null)} wide><form className="modal-form" onSubmit={saveStaff}><div className="form-grid"><label>Nombre completo<input name="name" required /></label><label>Correo institucional<input name="email" type="email" required /></label><label>Rol<select name="role"><option>Profesional</option><option>Recepción</option><option>Administrador clínico</option></select></label><label>Especialidad / función<input name="specialty" required /></label><label>Matrícula<input name="license" /></label><label>Color de agenda<input name="color" type="color" defaultValue="#f5bc26" /></label></div><div className="check-stack"><label><input name="notifyNewAppointment" type="checkbox" defaultChecked /> Recibir correo al asignarle un turno</label><label><input name="notifyDailyAgenda" type="checkbox" defaultChecked /> Recibir resumen de próximos pacientes</label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button primary">Agregar al staff</button></div></form></Modal>}

    {modal === "clinical" && selectedPatient && <Modal title={`Nueva evolución — ${fullName(selectedPatient)}`} onClose={() => setModal(null)} wide><form className="modal-form" onSubmit={saveClinicalEntry}><div className="form-grid"><label>Profesional<select name="staffId">{activeStaff.filter((member) => member.role !== "Recepción").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Fecha<input name="date" type="date" defaultValue={todayISO} /></label><label>Tipo<select name="type"><option>Evolución</option><option>Entrevista inicial</option><option>Seguimiento interdisciplinario</option></select></label><label className="full-field">Registro clínico<textarea name="text" required rows={7} placeholder="Redactar la evolución clínica…" /></label></div><div className="privacy-box">Este contenido es confidencial y no debe ser visible para perfiles de recepción.</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button primary">Guardar evolución</button></div></form></Modal>}

    {modal === "message" && messageTarget && <Modal title="Enviar correo" onClose={() => setModal(null)} wide><form className="modal-form" onSubmit={async (event) => { event.preventDefault(); await sendEmail({ to: messageTarget.to, subject: messageTarget.subject, kind: messageTarget.kind, html: emailTemplate(messageTarget.subject, `<p>${messageTarget.body.replace(/\n/g, "<br>")}</p>`) }); setModal(null); }}><div className="form-grid"><label>Destinatario<input type="email" value={messageTarget.to} onChange={(event) => setMessageTarget({ ...messageTarget, to: event.target.value })} required /></label><label>Tipo<select value={messageTarget.kind} onChange={(event) => setMessageTarget({ ...messageTarget, kind: event.target.value as "Paciente" | "Staff" })}><option>Paciente</option><option>Staff</option></select></label><label className="full-field">Asunto<input value={messageTarget.subject} onChange={(event) => setMessageTarget({ ...messageTarget, subject: event.target.value })} required /></label><label className="full-field">Mensaje<textarea rows={8} value={messageTarget.body} onChange={(event) => setMessageTarget({ ...messageTarget, body: event.target.value })} required /></label></div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="button primary">Enviar correo</button></div></form></Modal>}

    {toast && <div className="toast">{toast}</div>}
  </div>;
}
