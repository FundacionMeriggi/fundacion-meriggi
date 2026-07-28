'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, FilePlus2, Link2, Pencil, Search, Upload, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { getSupabase } from '@/lib/supabase';
import type { CurrentIdentity } from '@/lib/session';
import type { ClinicalNote, Patient, TeamMember } from '@/lib/types';
import { Empty, Modal, PageHead } from './ui';

type PatientDocument={id:string;title:string;category:string;storage_path:string;visible_to_patient:boolean;created_at:string};
type NewPatient = Pick<Patient, 'first_name'|'last_name'|'dni'|'birth_date'|'email'|'phone'|'coverage'|'responsible_name'|'responsible_phone'|'administrative_notes'>;
const blank: NewPatient = { first_name:'', last_name:'', dni:'', birth_date:'', email:'', phone:'', coverage:'', responsible_name:'', responsible_phone:'', administrative_notes:'' };

export function PatientsModule({ identity, notify }: { identity: CurrentIdentity; notify: (text: string) => void }) {
  if (identity.kind !== 'staff') return null;
  const member = identity.member;
  const canAdmin = ['super_admin','admin_professional','secretary'].includes(member.role);
  const canClinical = member.role !== 'secretary';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [query, setQuery] = useState('');
  const [newPatient, setNewPatient] = useState<NewPatient | null>(null);
  const [editingPatient, setEditingPatient] = useState<NewPatient | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [newNote, setNewNote] = useState({ note_type:'Evolución', visibility:'team' as 'team'|'private', content:'' });
  const [assignments, setAssignments] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState<{title:string;category:string;visible:boolean;file:File|null}>({title:'',category:'Documento',visible:false,file:null});
  const [loading, setLoading] = useState(true);

  async function loadPatients() {
    setLoading(true);
    const result = await getSupabase().from('patients').select('*').eq('active',true).order('last_name');
    setPatients((result.data || []) as Patient[]);
    if (!selected && result.data?.[0]) setSelected(result.data[0] as Patient);
    setLoading(false);
  }

  async function loadPatientData(patient: Patient | null) {
    if (!patient) return;
    const supabase = getSupabase();
    const [notesResult, assignmentsResult, teamResult, documentsResult] = await Promise.all([
      canClinical ? supabase.from('clinical_notes').select('*, author:team_members(full_name)').eq('patient_id',patient.id).order('note_date',{ascending:false}).order('created_at',{ascending:false}) : Promise.resolve({data:[]}),
      supabase.from('patient_assignments').select('staff:team_members(*)').eq('patient_id',patient.id).eq('active',true),
      canAdmin ? supabase.from('team_members').select('*').eq('active',true).neq('role','secretary').order('full_name') : Promise.resolve({data:[]}),
      canClinical ? supabase.from('documents').select('*').eq('patient_id',patient.id).order('created_at',{ascending:false}) : Promise.resolve({data:[]}),
    ]);
    setNotes((notesResult.data || []) as unknown as ClinicalNote[]);
    setAssignments((assignmentsResult.data || []).map((r:any)=>r.staff).filter(Boolean));
    setTeam((teamResult.data || []) as TeamMember[]);
    setDocuments((documentsResult.data || []) as PatientDocument[]);
    setInviteLink(''); setInviteUsername('');
  }

  useEffect(() => { loadPatients(); }, []);
  useEffect(() => { loadPatientData(selected); }, [selected?.id]);

  const filtered = useMemo(() => patients.filter((p) => `${p.first_name} ${p.last_name} ${p.dni || ''}`.toLowerCase().includes(query.toLowerCase())), [patients, query]);

  async function createPatient(event: FormEvent) {
    event.preventDefault();
    if (!newPatient) return;
    const result = await getSupabase().from('patients').insert({ ...newPatient, birth_date:newPatient.birth_date || null, email:newPatient.email || null, dni:newPatient.dni || null, phone:newPatient.phone || null, coverage:newPatient.coverage || null, responsible_name:newPatient.responsible_name || null, responsible_phone:newPatient.responsible_phone || null, administrative_notes:newPatient.administrative_notes || null }).select().single();
    if (result.error) return notify(result.error.message);
    setNewPatient(null); notify('Paciente creado.'); await loadPatients(); setSelected(result.data as Patient);
  }

  async function updatePatient(event: FormEvent) {
    event.preventDefault();
    if (!selected || !editingPatient) return;
    const payload = { ...editingPatient, birth_date:editingPatient.birth_date || null, email:editingPatient.email || null, dni:editingPatient.dni || null, phone:editingPatient.phone || null, coverage:editingPatient.coverage || null, responsible_name:editingPatient.responsible_name || null, responsible_phone:editingPatient.responsible_phone || null, administrative_notes:editingPatient.administrative_notes || null };
    const result = await getSupabase().from('patients').update(payload).eq('id', selected.id).select().single();
    if (result.error) return notify(result.error.message);
    const updated = result.data as Patient;
    setEditingPatient(null); setSelected(updated); notify('Ficha actualizada.'); await loadPatients();
  }

  async function addNote(event: FormEvent) {
    event.preventDefault();
    if (!selected || !newNote.content.trim()) return;
    const result = await getSupabase().from('clinical_notes').insert({ patient_id:selected.id, author_id:member.id, note_type:newNote.note_type, visibility:newNote.visibility, content:newNote.content.trim(), note_date:format(new Date(),'yyyy-MM-dd') });
    if (result.error) return notify(result.error.message);
    setNewNote({note_type:'Evolución',visibility:'team',content:''}); notify('Evolución registrada.'); loadPatientData(selected);
  }

  async function toggleAssignment(staffId: string, active: boolean) {
    if (!selected) return;
    const supabase = getSupabase();
    if (active) {
      const result = await supabase.from('patient_assignments').upsert({patient_id:selected.id,staff_id:staffId,active:true},{onConflict:'patient_id,staff_id'});
      if (result.error) return notify(result.error.message);
    } else {
      const result = await supabase.from('patient_assignments').update({active:false}).eq('patient_id',selected.id).eq('staff_id',staffId);
      if (result.error) return notify(result.error.message);
    }
    notify('Asignación actualizada.'); loadPatientData(selected);
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!selected || !docForm.file) return;
    if (docForm.file.size > 20 * 1024 * 1024) return notify('El archivo supera el límite de 20 MB.');
    const safe = docForm.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-');
    const path = `${selected.organization_id}/${selected.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = getSupabase();
    const uploaded = await supabase.storage.from('clinical-documents').upload(path, docForm.file, { upsert:false });
    if (uploaded.error) return notify(uploaded.error.message);
    const row = await supabase.from('documents').insert({patient_id:selected.id,uploaded_by:member.id,title:docForm.title||docForm.file.name,category:docForm.category,storage_path:path,visible_to_patient:docForm.visible});
    if (row.error) { await supabase.storage.from('clinical-documents').remove([path]); return notify(row.error.message); }
    setDocModal(false); setDocForm({title:'',category:'Documento',visible:false,file:null}); notify('Documento subido.'); loadPatientData(selected);
  }

  async function openDocument(doc: PatientDocument) {
    const result = await getSupabase().storage.from('clinical-documents').createSignedUrl(doc.storage_path, 120);
    if (result.error) return notify(result.error.message);
    window.open(result.data.signedUrl,'_blank','noopener,noreferrer');
  }

  async function createInvitation() {
    if (!selected) return;
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-invitation`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token || ''}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''},
      body:JSON.stringify({ target_type:'patient', target_id:selected.id }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || 'No se pudo crear la invitación.');
    setInviteLink(data.activation_url); setInviteUsername(data.username || selected.username || ''); notify('Invitación de paciente generada.');
  }

  return <section className="page">
    <PageHead eyebrow="Registro longitudinal" title="Pacientes" description="Fichas administrativas, profesionales asignados, turnos e historia clínica acumulada durante todo el tratamiento." actions={canAdmin ? <button className="btn primary" onClick={()=>setNewPatient({...blank})}><UserPlus size={17}/> Nuevo paciente</button> : undefined}/>
    <div className="grid two" style={{gridTemplateColumns:'330px minmax(0,1fr)'}}>
      <aside className="card" style={{padding:12,maxHeight:720,overflow:'auto'}}>
        <label className="field" style={{margin:0,position:'relative'}}><Search size={16} style={{position:'absolute',left:12,top:18}}/><input className="input" style={{paddingLeft:36,marginTop:0}} placeholder="Buscar por nombre o DNI" value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
        <div className="quick-list" style={{marginTop:9}}>{loading ? <div className="loading"><div><div className="spinner"/>Cargando…</div></div> : filtered.length === 0 ? <Empty title="Sin pacientes" text="Todavía no hay registros disponibles."/> : filtered.map((p)=><button key={p.id} className="quick-item" style={{background:selected?.id===p.id?'var(--yellow-soft)':'white'}} onClick={()=>setSelected(p)}><div className="user-avatar">{p.first_name[0]}{p.last_name[0]}</div><div><strong>{p.last_name}, {p.first_name}</strong><small>{p.dni || 'Sin DNI'} · {p.coverage || 'Sin cobertura'}</small></div></button>)}</div>
      </aside>
      <div>{!selected ? <article className="card"><Empty title="Seleccioná un paciente" text="Abrí una ficha para consultar su información."/></article> : <>
        <article className="card"><div className="profile-hero"><div className="profile-avatar">{selected.first_name[0]}{selected.last_name[0]}</div><div><span className="eyebrow">Ficha de paciente</span><h2>{selected.first_name} {selected.last_name}</h2><p>{selected.dni || 'DNI pendiente'} · {selected.coverage || 'Cobertura pendiente'}</p></div><div className="actions" style={{marginLeft:'auto'}}>{canAdmin && <><button className="btn" onClick={()=>setEditingPatient({first_name:selected.first_name,last_name:selected.last_name,dni:selected.dni||'',birth_date:selected.birth_date||'',email:selected.email||'',phone:selected.phone||'',coverage:selected.coverage||'',responsible_name:selected.responsible_name||'',responsible_phone:selected.responsible_phone||'',administrative_notes:selected.administrative_notes||''})}><Pencil size={16}/> Editar ficha</button><button className="btn" onClick={createInvitation}><Link2 size={16}/> Acceso de paciente</button></>}</div></div>
          <div className="grid three" style={{marginTop:16}}><div className="notice secure"><b>Contacto</b><br/>{selected.email || 'Sin correo'}<br/>{selected.phone || 'Sin teléfono'}</div><div className="notice secure"><b>Nacimiento</b><br/>{selected.birth_date || 'Sin registrar'}<br/>Responsable: {selected.responsible_name || 'No corresponde'}</div><div className="notice secure"><b>Profesionales asignados</b><br/>{assignments.length ? assignments.map(a=>a.full_name).join(', ') : 'Sin asignaciones'}</div></div>
          {inviteLink && <div className="notice" style={{marginTop:14}}><b>Usuario: <code>{inviteUsername}</code></b><br/>Enlace de activación del paciente<br/><input className="input" readOnly value={inviteLink}/><button className="btn small" onClick={()=>navigator.clipboard.writeText(inviteLink)}>Copiar enlace</button></div>}
        </article>
        {canAdmin && <article className="card" style={{marginTop:14}}><div className="card-head"><div><span className="eyebrow">Equipo tratante</span><h3>Asignaciones</h3></div></div><div className="grid three">{team.map((s)=>{const checked=assignments.some(a=>a.id===s.id);return <label className="quick-item" key={s.id}><input type="checkbox" checked={checked} onChange={(e)=>toggleAssignment(s.id,e.target.checked)}/><div><strong>{s.full_name}</strong><small>{s.job_title || s.specialty}</small></div></label>})}</div></article>}
        {canClinical && <article className="card" style={{marginTop:14}}><div className="card-head"><div><span className="eyebrow">Archivos privados</span><h3>Documentación</h3></div><button className="btn primary" onClick={()=>setDocModal(true)}><Upload size={16}/> Subir archivo</button></div>{documents.length===0?<Empty title="Sin documentos" text="Informes, consentimientos y archivos clínicos aparecerán aquí."/>:<div className="quick-list">{documents.map(d=><button className="quick-item" key={d.id} onClick={()=>openDocument(d)}><div className="quick-icon"><Download size={16}/></div><div><strong>{d.title}</strong><small>{d.category} · {d.visible_to_patient?'Visible para el paciente':'Solo equipo autorizado'} · {new Date(d.created_at).toLocaleDateString('es-AR')}</small></div></button>)}</div>}</article>}
        {canClinical ? <div className="grid two" style={{marginTop:14}}><article className="card"><div className="card-head"><div><span className="eyebrow">Historia clínica</span><h3>Evoluciones</h3></div></div>{notes.length===0?<Empty title="Sin evoluciones" text="Las notas clínicas se registrarán de forma cronológica y auditable."/>:<div className="timeline">{notes.map(n=><div className="timeline-item" key={n.id}><span className="eyebrow">{n.note_type} · {n.note_date} · {n.visibility==='private'?'Privada':'Compartida con equipo tratante'}</span><p>{n.content}</p><small>{n.author?.full_name || 'Profesional'} · {new Date(n.created_at).toLocaleString('es-AR')}</small></div>)}</div>}</article><article className="card"><div className="card-head"><div><span className="eyebrow">Registro profesional</span><h3>Nueva evolución</h3></div></div><form onSubmit={addNote}><label className="field">Tipo<select className="select" value={newNote.note_type} onChange={(e)=>setNewNote({...newNote,note_type:e.target.value})}><option>Evolución</option><option>Admisión</option><option>Entrevista familiar</option><option>Seguimiento interdisciplinario</option><option>Registro de taller</option><option>Registro de grupo</option></select></label><label className="field">Visibilidad<select className="select" value={newNote.visibility} onChange={(e)=>setNewNote({...newNote,visibility:e.target.value as 'team'|'private'})}><option value="team">Equipo tratante</option><option value="private">Solo autor y administradores</option></select></label><label className="field">Contenido<textarea className="textarea" value={newNote.content} onChange={(e)=>setNewNote({...newNote,content:e.target.value})} required/></label><div className="notice" style={{marginTop:12}}>Las evoluciones no se eliminan. Toda corrección queda registrada en el historial de auditoría.</div><button className="btn primary full"><FilePlus2 size={16}/> Guardar evolución</button></form></article></div> : <div className="notice secure" style={{marginTop:14}}><b>Información clínica restringida.</b> El perfil de Secretaría puede gestionar datos administrativos y turnos, pero no puede leer evoluciones clínicas.</div>}
      </>}</div>
    </div>
    {docModal && <Modal title="Subir documento" onClose={()=>setDocModal(false)}><form onSubmit={uploadDocument}><div className="form-grid"><label className="field full">Archivo<input className="input" type="file" accept="application/pdf,image/jpeg,image/png,text/plain" onChange={e=>setDocForm({...docForm,file:e.target.files?.[0]||null})} required/></label><label className="field">Título<input className="input" value={docForm.title} onChange={e=>setDocForm({...docForm,title:e.target.value})} placeholder="Se usa el nombre del archivo si queda vacío"/></label><label className="field">Categoría<select className="select" value={docForm.category} onChange={e=>setDocForm({...docForm,category:e.target.value})}><option>Documento</option><option>Consentimiento</option><option>Informe</option><option>Derivación</option><option>Comprobante</option><option>Estudio</option></select></label><label className="field full"><input type="checkbox" checked={docForm.visible} onChange={e=>setDocForm({...docForm,visible:e.target.checked})}/> Compartir este archivo con el paciente en su portal</label></div><div className="modal-actions"><button type="button" className="btn" onClick={()=>setDocModal(false)}>Cancelar</button><button className="btn primary">Subir archivo</button></div></form></Modal>}
    {editingPatient && selected && <Modal title="Editar paciente" onClose={()=>setEditingPatient(null)}><form onSubmit={updatePatient}><div className="form-grid"><label className="field">Nombre<input className="input" value={editingPatient.first_name} onChange={(e)=>setEditingPatient({...editingPatient,first_name:e.target.value})} required/></label><label className="field">Apellido<input className="input" value={editingPatient.last_name} onChange={(e)=>setEditingPatient({...editingPatient,last_name:e.target.value})} required/></label><label className="field">DNI<input className="input" value={editingPatient.dni || ''} onChange={(e)=>setEditingPatient({...editingPatient,dni:e.target.value})}/></label><label className="field">Fecha de nacimiento<input className="input" type="date" value={editingPatient.birth_date || ''} onChange={(e)=>setEditingPatient({...editingPatient,birth_date:e.target.value})}/></label><label className="field">Correo<input className="input" type="email" value={editingPatient.email || ''} onChange={(e)=>setEditingPatient({...editingPatient,email:e.target.value})}/></label><label className="field">Teléfono<input className="input" value={editingPatient.phone || ''} onChange={(e)=>setEditingPatient({...editingPatient,phone:e.target.value})}/></label><label className="field">Cobertura<input className="input" value={editingPatient.coverage || ''} onChange={(e)=>setEditingPatient({...editingPatient,coverage:e.target.value})}/></label><label className="field">Responsable<input className="input" value={editingPatient.responsible_name || ''} onChange={(e)=>setEditingPatient({...editingPatient,responsible_name:e.target.value})}/></label><label className="field">Teléfono responsable<input className="input" value={editingPatient.responsible_phone || ''} onChange={(e)=>setEditingPatient({...editingPatient,responsible_phone:e.target.value})}/></label><label className="field full">Observaciones administrativas<textarea className="textarea" value={editingPatient.administrative_notes || ''} onChange={(e)=>setEditingPatient({...editingPatient,administrative_notes:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="btn" onClick={()=>setEditingPatient(null)}>Cancelar</button><button className="btn primary">Guardar cambios</button></div></form></Modal>}
    {newPatient && <Modal title="Nuevo paciente" onClose={()=>setNewPatient(null)}><form onSubmit={createPatient}><div className="form-grid"><label className="field">Nombre<input className="input" value={newPatient.first_name} onChange={(e)=>setNewPatient({...newPatient,first_name:e.target.value})} required/></label><label className="field">Apellido<input className="input" value={newPatient.last_name} onChange={(e)=>setNewPatient({...newPatient,last_name:e.target.value})} required/></label><label className="field">DNI<input className="input" value={newPatient.dni || ''} onChange={(e)=>setNewPatient({...newPatient,dni:e.target.value})}/></label><label className="field">Fecha de nacimiento<input className="input" type="date" value={newPatient.birth_date || ''} onChange={(e)=>setNewPatient({...newPatient,birth_date:e.target.value})}/></label><label className="field">Correo<input className="input" type="email" value={newPatient.email || ''} onChange={(e)=>setNewPatient({...newPatient,email:e.target.value})}/></label><label className="field">Teléfono<input className="input" value={newPatient.phone || ''} onChange={(e)=>setNewPatient({...newPatient,phone:e.target.value})}/></label><label className="field">Cobertura<input className="input" value={newPatient.coverage || ''} onChange={(e)=>setNewPatient({...newPatient,coverage:e.target.value})}/></label><label className="field">Responsable<input className="input" value={newPatient.responsible_name || ''} onChange={(e)=>setNewPatient({...newPatient,responsible_name:e.target.value})}/></label><label className="field">Teléfono responsable<input className="input" value={newPatient.responsible_phone || ''} onChange={(e)=>setNewPatient({...newPatient,responsible_phone:e.target.value})}/></label><label className="field full">Observaciones administrativas<textarea className="textarea" value={newPatient.administrative_notes || ''} onChange={(e)=>setNewPatient({...newPatient,administrative_notes:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="btn" onClick={()=>setNewPatient(null)}>Cancelar</button><button className="btn primary">Crear paciente</button></div></form></Modal>}
  </section>;
}
