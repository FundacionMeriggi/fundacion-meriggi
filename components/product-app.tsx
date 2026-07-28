'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, CalendarDays, Home, LogOut, Mail, Settings, UserRound, Users, UsersRound } from 'lucide-react';
import { getCurrentIdentity, type CurrentIdentity } from '@/lib/session';
import { appPath, getSupabase } from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/types';
import { AgendaModule } from './agenda-module';
import { CommunicationsModule } from './communications-module';
import { DashboardModule } from './dashboard-module';
import { GroupsModule } from './groups-module';
import { OperationsModule } from './operations-module';
import { PatientPortalModule } from './patient-portal-module';
import { PatientsModule } from './patients-module';
import { SettingsModule } from './settings-module';
import { TeamModule } from './team-module';
import { Loader, Toast } from './ui';

type View = 'inicio'|'agenda'|'pacientes'|'grupos'|'operaciones'|'comunicaciones'|'equipo'|'portal'|'configuracion';

export function ProductApp() {
  const router = useRouter();
  const [identity, setIdentity] = useState<CurrentIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('inicio');
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace(appPath('/login/')); return; }
      const found = await getCurrentIdentity();
      if (!found) {
        await supabase.auth.signOut();
        router.replace(appPath('/login/'));
        return;
      }
      setIdentity(found);
      setView(found.kind === 'patient' ? 'portal' : 'inicio');
      setLoading(false);
    }
    load();
    const { data: listener } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace(appPath('/login/'));
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  function notify(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(''), 3600);
  }

  async function logout() {
    await getSupabase().auth.signOut();
    router.replace(appPath('/login/'));
  }

  const nav = useMemo(() => {
    if (!identity) return [];
    if (identity.kind === 'patient') return [
      { id:'portal' as View, label:'Mi portal', icon:UserRound },
      { id:'agenda' as View, label:'Mis turnos', icon:CalendarDays },
    ];
    const base = [
      { id:'inicio' as View, label:'Inicio', icon:Home },
      { id:'agenda' as View, label:'Agenda', icon:CalendarDays },
      { id:'pacientes' as View, label:'Pacientes', icon:UserRound },
      { id:'grupos' as View, label:'Grupos y talleres', icon:UsersRound },
      { id:'operaciones' as View, label:'Operaciones', icon:BriefcaseBusiness },
    ];
    if (['super_admin','admin_professional','secretary'].includes(identity.member.role)) {
      base.push({ id:'comunicaciones' as View, label:'Comunicaciones', icon:Mail });
    }
    if (['super_admin','admin_professional'].includes(identity.member.role)) {
      base.push({ id:'equipo' as View, label:'Equipo y usuarios', icon:Users });
      base.push({ id:'configuracion' as View, label:'Configuración', icon:Settings });
    }
    return base;
  }, [identity]);

  if (loading || !identity) return <Loader />;
  const displayName = identity.kind === 'staff' ? identity.member.full_name : `${identity.patient.first_name} ${identity.patient.last_name}`;
  const role = identity.kind === 'staff' ? ROLE_LABELS[identity.member.role] : 'Paciente';
  const initials = displayName.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Image src={appPath("/logo-meriggi.jpg")} alt="Fundación Meriggi" width={52} height={52}/><div><strong>Fundación Meriggi</strong><small>Gestión clínica</small></div></div>
      <nav className="nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon/><span>{item.label}</span></button>})}</nav>
      <div className="user-box"><div className="user-avatar">{initials}</div><div><strong>{displayName}</strong><small>{role}</small></div><button className="icon-btn" onClick={logout} title="Cerrar sesión"><LogOut size={17}/></button></div>
    </aside>
    <main className="content">
      <div className="mobile-bar"><Image src={appPath("/logo-meriggi.jpg")} alt="Fundación Meriggi" width={40} height={40}/><strong>Meriggi</strong><select value={view} onChange={e=>setView(e.target.value as View)}>{nav.map(n=><option value={n.id} key={n.id}>{n.label}</option>)}</select><button className="icon-btn" onClick={logout}><LogOut size={16}/></button></div>
      {view==='inicio' && <DashboardModule identity={identity} navigate={(v)=>setView(v as View)}/>} 
      {view==='agenda' && <AgendaModule identity={identity} notify={notify}/>} 
      {view==='pacientes' && <PatientsModule identity={identity} notify={notify}/>} 
      {view==='grupos' && <GroupsModule identity={identity} notify={notify}/>} 
      {view==='operaciones' && <OperationsModule identity={identity} notify={notify}/>} 
      {view==='comunicaciones' && <CommunicationsModule identity={identity} notify={notify}/>} 
      {view==='equipo' && <TeamModule identity={identity} notify={notify}/>} 
      {view==='portal' && <PatientPortalModule identity={identity} notify={notify}/>} 
      {view==='configuracion' && <SettingsModule identity={identity} notify={notify}/>} 
    </main>
    {toast && <Toast text={toast}/>} 
  </div>;
}
