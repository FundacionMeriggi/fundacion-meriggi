'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, Pencil, XCircle } from 'lucide-react';
import { addWeeks, format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSupabase } from '@/lib/supabase';
import type { CurrentIdentity } from '@/lib/session';
import type { Appointment, AppointmentStatus, Patient, TeamMember } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { Empty, Modal, PageHead } from './ui';

type FormState = {
  id?: string;
  patient_id: string;
  staff_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  service_name: string;
  modality: 'in_person' | 'video';
  status: AppointmentStatus;
  administrative_note: string;
  recurrence: 'none' | 'weekly';
  occurrences: number;
  allow_overlap: boolean;
};

const blank = (): FormState => ({ patient_id: '', staff_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', duration_minutes: 50, service_name: 'Psicología', modality: 'in_person', status: 'pending', administrative_note: '', recurrence: 'none', occurrences: 4, allow_overlap: false });

export function AgendaModule({ identity, notify }: { identity: CurrentIdentity; notify: (text: string) => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [modal, setModal] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientRules, setPatientRules] = useState({canCancel:true,canReschedule:true});
  const [requestAppointment, setRequestAppointment] = useState<Appointment|null>(null);
  const [requestText, setRequestText] = useState('');
  const isPatient = identity.kind === 'patient';
  const canManage = identity.kind === 'staff';
  const professionalOnly = identity.kind === 'staff' && identity.member.role === 'professional';

  async function load() {
    setLoading(true);
    const supabase = getSupabase();
    const from = startOfDay(new Date(`${date}T12:00:00`)).toISOString();
    const to = endOfDay(new Date(`${date}T12:00:00`)).toISOString();
    const [appts, pats, members] = await Promise.all([
      supabase.from('appointments').select('*, patient:patients(first_name,last_name), staff:team_members(full_name)').gte('starts_at', from).lte('starts_at', to).order('starts_at'),
      canManage ? supabase.from('patients').select('*').eq('active', true).order('last_name') : Promise.resolve({ data: [] }),
      canManage ? (professionalOnly ? Promise.resolve({ data: [identity.kind === 'staff' ? identity.member : null].filter(Boolean) }) : supabase.from('team_members').select('*').eq('active', true).neq('role', 'secretary').order('full_name')) : Promise.resolve({ data: [] }),
    ]);
    setAppointments((appts.data || []) as unknown as Appointment[]);
    setPatients((pats.data || []) as Patient[]);
    setTeam((members.data || []) as TeamMember[]);
    if (isPatient) { const cfg = await supabase.from('organization_settings').select('patient_can_cancel,patient_can_reschedule').single(); if (cfg.data) setPatientRules({canCancel:cfg.data.patient_can_cancel,canReschedule:cfg.data.patient_can_reschedule}); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [date]);

  function edit(a: Appointment) {
    const d = new Date(a.starts_at);
    setModal({ id: a.id, patient_id: a.patient_id, staff_id: a.staff_id, date: format(d,'yyyy-MM-dd'), time: format(d,'HH:mm'), duration_minutes: a.duration_minutes, service_name: a.service_name, modality: a.modality, status: a.status, administrative_note: a.administrative_note || '', recurrence: 'none', occurrences: 1, allow_overlap: a.allow_overlap || false });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!modal) return;
    const supabase = getSupabase();
    const startsAt = new Date(`${modal.date}T${modal.time}:00`).toISOString();
    const payload = {
      patient_id: modal.patient_id,
      staff_id: modal.staff_id,
      service_name: modal.service_name,
      starts_at: startsAt,
      duration_minutes: modal.duration_minutes,
      modality: modal.modality,
      status: modal.status,
      administrative_note: modal.administrative_note || null,
      recurrence_rule: modal.recurrence === 'weekly' ? `FREQ=WEEKLY;COUNT=${modal.occurrences}` : null,
      allow_overlap: modal.allow_overlap,
    };

    if (modal.id) {
      const result = await supabase.from('appointments').update(payload).eq('id', modal.id);
      if (result.error) return notify(result.error.message);
      notify('Turno actualizado.');
    } else if (modal.recurrence === 'weekly') {
      const rows = Array.from({ length: modal.occurrences }, (_, i) => ({ ...payload, starts_at: addWeeks(new Date(startsAt), i).toISOString() }));
      const result = await supabase.from('appointments').insert(rows);
      if (result.error) return notify(result.error.message);
      notify(`${rows.length} turnos recurrentes creados.`);
    } else {
      const result = await supabase.from('appointments').insert(payload);
      if (result.error) return notify(result.error.message);
      notify('Turno creado.');
    }
    setModal(null); load();
  }

  async function patientStatus(id: string, status: 'confirmed' | 'cancelled') {
    const result = await getSupabase().rpc('patient_update_appointment_status', { appointment_id: id, new_status: status });
    if (result.error) notify(result.error.message); else { notify(status === 'confirmed' ? 'Turno confirmado.' : 'Turno cancelado.'); load(); }
  }

  async function requestChange(event: FormEvent) {
    event.preventDefault();
    if (!requestAppointment || identity.kind !== 'patient') return;
    const result = await getSupabase().from('appointment_change_requests').insert({patient_id:identity.patient.id,appointment_id:requestAppointment.id,request_type:'reschedule',preferred_text:requestText.trim()||null});
    if (result.error) return notify(result.error.message);
    setRequestAppointment(null); setRequestText(''); notify('Solicitud enviada a Secretaría.');
  }

  const titleDate = useMemo(() => format(new Date(`${date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es }), [date]);

  return <section className="page">
    <PageHead eyebrow="Agenda clínica" title="Turnos" description={isPatient ? 'Consultá, confirmá o cancelá tus turnos.' : 'Agenda diaria, turnos recurrentes, estados y modalidades.'} actions={canManage ? <button className="btn primary" onClick={() => setModal({...blank(), staff_id: professionalOnly && identity.kind === 'staff' ? identity.member.id : ''})}><CalendarPlus size={17}/> Nuevo turno</button> : undefined} />
    <div className="toolbar"><label className="field">Fecha<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><div style={{marginLeft:'auto'}}><span className="eyebrow">Día seleccionado</span><h3 style={{margin:'4px 0',textTransform:'capitalize'}}>{titleDate}</h3></div></div>
    <article className="card table-wrap">
      {loading ? <div className="loading"><div><div className="spinner" />Cargando agenda…</div></div> : appointments.length === 0 ? <Empty title="No hay turnos este día" text={canManage ? 'Podés crear un turno nuevo o cambiar la fecha.' : 'No tenés turnos registrados para esta fecha.'} /> : <table><thead><tr><th>Hora</th><th>Paciente</th><th>Profesional</th><th>Servicio</th><th>Modalidad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{appointments.map((a) => <tr key={a.id}><td><strong>{format(new Date(a.starts_at),'HH:mm')}</strong><small>{a.duration_minutes} min</small></td><td><strong>{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Paciente'}</strong></td><td>{a.staff?.full_name || 'Profesional'}</td><td>{a.service_name}</td><td>{a.modality === 'video' ? 'Videollamada' : 'Presencial'}</td><td><span className={`pill ${a.status === 'confirmed' || a.status === 'attended' ? 'ok' : a.status === 'cancelled' || a.status === 'absent' ? 'bad' : ''}`}>{STATUS_LABELS[a.status]}</span></td><td>{canManage ? <button className="btn small" onClick={() => edit(a)}><Pencil size={14}/> Editar</button> : <div className="actions">{a.status === 'pending' && <button className="btn small" onClick={() => patientStatus(a.id,'confirmed')}><Check size={14}/> Confirmar</button>}{patientRules.canReschedule && !['cancelled','attended'].includes(a.status) && <button className="btn small" onClick={() => setRequestAppointment(a)}><Pencil size={14}/> Solicitar cambio</button>}{patientRules.canCancel && !['cancelled','attended'].includes(a.status) && <button className="btn small danger" onClick={() => patientStatus(a.id,'cancelled')}><XCircle size={14}/> Cancelar</button>}</div>}</td></tr>)}</tbody></table>}
    </article>
    {requestAppointment && <Modal title="Solicitar reprogramación" onClose={()=>setRequestAppointment(null)}><form onSubmit={requestChange}><p>Indicá días u horarios posibles. Secretaría revisará la solicitud y confirmará el cambio.</p><label className="field">Preferencias<textarea className="textarea" value={requestText} onChange={e=>setRequestText(e.target.value)} placeholder="Ej.: martes después de las 16 o jueves por la mañana" required/></label><div className="modal-actions"><button type="button" className="btn" onClick={()=>setRequestAppointment(null)}>Cancelar</button><button className="btn primary">Enviar solicitud</button></div></form></Modal>}
    {modal && <Modal title={modal.id ? 'Modificar turno' : 'Nuevo turno'} onClose={() => setModal(null)}><form onSubmit={save}><div className="form-grid"><label className="field">Paciente<select className="select" value={modal.patient_id} onChange={(e) => setModal({...modal,patient_id:e.target.value})} required><option value="">Seleccionar…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}</select></label><label className="field">Profesional<select className="select" value={modal.staff_id} onChange={(e) => setModal({...modal,staff_id:e.target.value})} required disabled={professionalOnly}><option value="">Seleccionar…</option>{team.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><label className="field">Fecha<input className="input" type="date" value={modal.date} onChange={(e) => setModal({...modal,date:e.target.value})} required /></label><label className="field">Hora<input className="input" type="time" value={modal.time} onChange={(e) => setModal({...modal,time:e.target.value})} required /></label><label className="field">Duración<input className="input" type="number" min={10} step={5} value={modal.duration_minutes} onChange={(e) => setModal({...modal,duration_minutes:+e.target.value})} /></label><label className="field">Modalidad<select className="select" value={modal.modality} onChange={(e) => setModal({...modal,modality:e.target.value as 'in_person'|'video'})}><option value="in_person">Presencial</option><option value="video">Videollamada</option></select></label><label className="field">Servicio<select className="select" value={modal.service_name} onChange={(e) => setModal({...modal,service_name:e.target.value})}><option>Psicología</option><option>Operador de grupo</option><option>Taller</option><option>Admisión</option><option>Orientación familiar</option><option>Grupo de parejas</option><option>Seguimiento interdisciplinario</option></select></label><label className="field">Estado<select className="select" value={modal.status} onChange={(e) => setModal({...modal,status:e.target.value as AppointmentStatus})}>{Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>{!modal.id && <><label className="field">Repetición<select className="select" value={modal.recurrence} onChange={(e) => setModal({...modal,recurrence:e.target.value as 'none'|'weekly'})}><option value="none">Único</option><option value="weekly">Semanal</option></select></label>{modal.recurrence === 'weekly' && <label className="field">Cantidad de encuentros<input className="input" type="number" min={2} max={104} value={modal.occurrences} onChange={(e) => setModal({...modal,occurrences:+e.target.value})} /></label>}</>}<label className="field full"><input type="checkbox" checked={modal.allow_overlap} onChange={(e)=>setModal({...modal,allow_overlap:e.target.checked})}/> Permitir superposición / sobreturno</label><label className="field full">Nota administrativa<textarea className="textarea" value={modal.administrative_note} onChange={(e) => setModal({...modal,administrative_note:e.target.value})} /></label></div><div className="modal-actions"><button className="btn" type="button" onClick={() => setModal(null)}>Cancelar</button><button className="btn primary" type="submit">Guardar turno</button></div></form></Modal>}
  </section>;
}
