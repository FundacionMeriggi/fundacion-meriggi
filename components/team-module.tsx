'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Copy, Link2, Plus, ShieldCheck } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import type { CurrentIdentity } from '@/lib/session';
import type { Specialty, StaffRole, TeamMember } from '@/lib/types';
import { ROLE_LABELS, SPECIALTY_LABELS } from '@/lib/types';
import { Empty, Modal, PageHead } from './ui';

export function TeamModule({ identity, notify }: { identity: CurrentIdentity; notify: (text: string) => void }) {
  if (identity.kind !== 'staff') return null;
  const isAdmin = ['super_admin','admin_professional'].includes(identity.member.role);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [links, setLinks] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState<null|{full_name:string;username:string;email:string;role:StaffRole;specialty:Specialty;license_number:string;job_title:string}>(null);

  async function load() {
    const result = await getSupabase().from('team_members').select('*').order('full_name');
    setTeam((result.data || []) as TeamMember[]); setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function createMember(event: FormEvent) {
    event.preventDefault();
    if (!newMember) return;
    const payload = { id:crypto.randomUUID(), full_name:newMember.full_name.trim(), username:newMember.username.trim().toLowerCase(), email:newMember.email.trim() || null, role:newMember.role, specialty:newMember.specialty, license_number:newMember.license_number.trim() || null, job_title:newMember.job_title.trim() || null, active:true };
    const result = await getSupabase().from('team_members').insert(payload);
    if (result.error) return notify(result.error.message);
    setNewMember(null); notify('Integrante creado. Ya podés generar su invitación.'); load();
  }

  async function invite(member: TeamMember) {
    const supabase = getSupabase();
    const {data:{session}} = await supabase.auth.getSession();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-invitation`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token || ''}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''},body:JSON.stringify({target_type:'staff',target_id:member.id})
    });
    const data=await response.json();
    if(!response.ok)return notify(data.error||'No se pudo generar la invitación.');
    setLinks((old)=>({...old,[member.id]:data.activation_url})); notify(`Invitación generada para ${member.full_name}.`);
  }

  async function toggle(member: TeamMember) {
    const result=await getSupabase().from('team_members').update({active:!member.active}).eq('id',member.id);
    if(result.error)notify(result.error.message);else{notify('Estado actualizado.');load()}
  }

  if(!isAdmin)return <section className="page"><PageHead eyebrow="Seguridad" title="Equipo" description="La gestión de cuentas está restringida a administradores."/><div className="notice">No tenés permisos para administrar usuarios.</div></section>;

  return <section className="page">
    <PageHead eyebrow="Usuarios y permisos" title="Equipo" description="Cuentas reales, roles diferenciados e invitaciones de activación de un solo uso." actions={<button className="btn primary" onClick={()=>setNewMember({full_name:'',username:'',email:'',role:'professional',specialty:'psychology',license_number:'',job_title:''})}><Plus size={16}/> Nuevo integrante</button>}/>
    <div className="notice secure" style={{marginBottom:15}}><ShieldCheck size={17} style={{verticalAlign:'middle',marginRight:7}}/><b>Cada integrante elige su contraseña.</b> El administrador genera un enlace individual que vence y no puede volver a utilizarse.</div>
    <article className="card table-wrap">{loading?<div className="loading"><div><div className="spinner"/>Cargando equipo…</div></div>:team.length===0?<Empty title="Sin integrantes" text="No hay cuentas configuradas."/>:<table><thead><tr><th>Integrante</th><th>Usuario</th><th>Rol</th><th>Especialidad</th><th>Matrícula / función</th><th>Cuenta</th><th>Acciones</th></tr></thead><tbody>{team.map((m)=><tr key={m.id}><td><strong>{m.full_name}</strong><small>{m.email||'Sin correo: activación manual'}</small></td><td><code>{m.username}</code></td><td>{ROLE_LABELS[m.role]}</td><td>{SPECIALTY_LABELS[m.specialty]}</td><td>{m.license_number||'—'}<small>{m.job_title||''}</small></td><td><span className={`pill ${m.auth_user_id?'ok':''}`}>{m.auth_user_id?'Activa':'Pendiente'}</span>{!m.active&&<span className="pill bad" style={{marginLeft:5}}>Bloqueada</span>}</td><td><div className="actions"><button className="btn small" onClick={()=>invite(m)}><Link2 size={14}/>{m.auth_user_id?'Restablecer':'Invitar'}</button><button className={`btn small ${m.active?'danger':''}`} disabled={m.id===identity.member.id || (m.role==='super_admin' && identity.member.role!=='super_admin')} onClick={()=>toggle(m)}>{m.active?'Bloquear':'Activar'}</button></div>{links[m.id]&&<div style={{marginTop:8}}><input className="input" readOnly value={links[m.id]}/><button className="btn small" onClick={()=>{navigator.clipboard.writeText(links[m.id]);notify('Enlace copiado.')}}><Copy size={14}/> Copiar</button></div>}</td></tr>)}</tbody></table>}</article>
    {newMember&&<Modal title="Nuevo integrante" onClose={()=>setNewMember(null)}><form onSubmit={createMember}><div className="form-grid"><label className="field full">Nombre y apellido<input className="input" value={newMember.full_name} onChange={e=>setNewMember({...newMember,full_name:e.target.value})} required/></label><label className="field">Usuario<input className="input" pattern="[A-Za-z0-9._-]+" value={newMember.username} onChange={e=>setNewMember({...newMember,username:e.target.value})} placeholder="nombre.apellido" required/></label><label className="field">Correo<input className="input" type="email" value={newMember.email} onChange={e=>setNewMember({...newMember,email:e.target.value})}/></label><label className="field">Rol<select className="select" value={newMember.role} onChange={e=>setNewMember({...newMember,role:e.target.value as StaffRole})}><option value="professional">Profesional</option><option value="secretary">Secretaría</option><option value="admin_professional">Administradora / profesional</option></select></label><label className="field">Especialidad<select className="select" value={newMember.specialty} onChange={e=>setNewMember({...newMember,specialty:e.target.value as Specialty})}><option value="psychology">Psicología</option><option value="group_operator">Operador/a de grupo</option><option value="administrative">Administrativo</option><option value="workshop">Taller</option></select></label><label className="field">Matrícula<input className="input" value={newMember.license_number} onChange={e=>setNewMember({...newMember,license_number:e.target.value})}/></label><label className="field">Función<input className="input" value={newMember.job_title} onChange={e=>setNewMember({...newMember,job_title:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="btn" onClick={()=>setNewMember(null)}>Cancelar</button><button className="btn primary">Crear integrante</button></div></form></Modal>}
  </section>;
}
