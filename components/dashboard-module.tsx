'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, UserRound, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSupabase } from '@/lib/supabase';
import type { CurrentIdentity } from '@/lib/session';
import type { Appointment } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { Empty, PageHead } from './ui';

export function DashboardModule({ identity, navigate }: { identity: CurrentIdentity; navigate: (view: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ patients: 0, today: 0, pending: 0, team: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);

      const appointmentQuery = supabase.from('appointments')
        .select('*, patient:patients(first_name,last_name), staff:team_members(full_name)')
        .gte('starts_at', new Date().toISOString())
        .lte('starts_at', nextWeek.toISOString())
        .order('starts_at', { ascending: true })
        .limit(8);

      const [appts, today, pending] = await Promise.all([
        appointmentQuery,
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).in('status', ['pending','confirmed']),
      ]);

      let patientsCount = 1;
      let teamCount = 0;
      if (identity.kind === 'staff') {
        const [patients, team] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('active', true),
          supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('active', true),
        ]);
        patientsCount = patients.count || 0;
        teamCount = team.count || 0;
      }

      setAppointments((appts.data || []) as unknown as Appointment[]);
      setCounts({ patients: patientsCount, today: today.count || 0, pending: pending.count || 0, team: teamCount });
      setLoading(false);
    }
    load();
  }, [identity]);

  const isPatient = identity.kind === 'patient';
  const name = identity.kind === 'staff' ? identity.member.full_name : `${identity.patient.first_name} ${identity.patient.last_name}`;

  return <section className="page">
    <PageHead eyebrow="Panel principal" title={`Hola, ${name.split(' ')[0]}`} description={isPatient ? 'Consultá tus próximos turnos y la información compartida por Fundación Meriggi.' : 'Resumen operativo de la institución y próximos compromisos.'} />
    <div className="grid stats">
      <article className="card stat"><span>{isPatient ? 'Mi ficha' : 'Pacientes activos'}</span><strong>{counts.patients}</strong><small>{isPatient ? 'Cuenta vinculada' : 'Con acceso según permisos'}</small></article>
      <article className="card stat"><span>Turnos de hoy</span><strong>{counts.today}</strong><small>Visibles para tu usuario</small></article>
      <article className="card stat"><span>Por confirmar</span><strong>{counts.pending}</strong><small>Turnos pendientes o confirmados</small></article>
      <article className="card stat"><span>{isPatient ? 'Próximos 7 días' : 'Integrantes del equipo'}</span><strong>{isPatient ? appointments.length : counts.team}</strong><small>{isPatient ? 'Agenda próxima' : 'Cuentas activas y pendientes'}</small></article>
    </div>
    <div className="grid two">
      <article className="card">
        <div className="card-head"><div><span className="eyebrow">Agenda</span><h2>Próximos turnos</h2></div><button className="btn small" onClick={() => navigate('agenda')}>Abrir agenda</button></div>
        {loading ? <div className="loading"><div><div className="spinner" />Cargando…</div></div> : appointments.length === 0 ? <Empty title="Sin turnos próximos" text="Los nuevos turnos aparecerán aquí." /> : <div className="quick-list">
          {appointments.map((a) => <div className="quick-item" key={a.id}><div className="quick-icon"><CalendarDays size={18}/></div><div style={{flex:1}}><strong>{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : 'Turno'}</strong><small>{format(new Date(a.starts_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })} · {a.staff?.full_name || ''}</small></div><span className={`pill ${a.status === 'confirmed' ? 'ok' : a.status === 'cancelled' ? 'bad' : ''}`}>{STATUS_LABELS[a.status]}</span></div>)}
        </div>}
      </article>
      <article className="card">
        <div className="card-head"><div><span className="eyebrow">Accesos rápidos</span><h2>Gestión cotidiana</h2></div></div>
        <div className="quick-list">
          <button className="quick-item" onClick={() => navigate('agenda')}><div className="quick-icon"><CalendarDays size={18}/></div><div><strong>Agenda y turnos</strong><small>Crear, confirmar, reprogramar y registrar asistencia.</small></div></button>
          {!isPatient && <button className="quick-item" onClick={() => navigate('pacientes')}><div className="quick-icon"><UserRound size={18}/></div><div><strong>Pacientes</strong><small>Ficha longitudinal, asignaciones y documentación.</small></div></button>}
          {!isPatient && <button className="quick-item" onClick={() => navigate('grupos')}><div className="quick-icon"><Users size={18}/></div><div><strong>Grupos y talleres</strong><small>Coordinación, participantes y sesiones recurrentes.</small></div></button>}
          <button className="quick-item" onClick={() => navigate(isPatient ? 'portal' : 'agenda')}><div className="quick-icon"><ClipboardList size={18}/></div><div><strong>{isPatient ? 'Mi portal' : 'Seguimiento'}</strong><small>{isPatient ? 'Turnos, documentos y datos personales.' : 'Actividad pendiente y próximos encuentros.'}</small></div></button>
        </div>
      </article>
    </div>
  </section>;
}
