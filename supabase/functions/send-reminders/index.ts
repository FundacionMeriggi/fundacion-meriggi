import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/supabase.ts';

type Pending = { id:string; recipient_email:string; subject:string; body:string };
function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]||char));
}


async function deliver(db: ReturnType<typeof adminClient>, item: Pending) {
  const key=Deno.env.get('RESEND_API_KEY'); const mailFrom=Deno.env.get('MAIL_FROM');
  if(!key||!mailFrom) return 'skipped';
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:mailFrom,to:item.recipient_email,subject:item.subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(item.body).replaceAll('\n','<br>')}</p><hr><small>Fundación Meriggi</small></div>`})});
  const provider=await r.json().catch(()=>({}));
  if(r.ok){await db.from('communications').update({status:'sent',sent_at:new Date().toISOString(),provider_id:provider.id||null,error_message:null}).eq('id',item.id);return 'sent'}
  await db.from('communications').update({status:'failed',error_message:provider.message||'Error de proveedor'}).eq('id',item.id);return 'failed';
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Método no permitido'},405);
  if(req.headers.get('x-reminder-secret')!==Deno.env.get('REMINDER_WEBHOOK_SECRET'))return json({error:'No autorizado'},401);
  const db=adminClient(); let sent=0,skipped=0,failed=0;

  const pending=await db.from('communications').select('id,recipient_email,subject,body').eq('status','pending').order('created_at').limit(100);
  for(const item of (pending.data||[]) as Pending[]){const result=await deliver(db,item);if(result==='sent')sent++;else if(result==='failed')failed++;else skipped++}

  const settings=await db.from('organization_settings').select('reminder_hours').single();
  const hours=settings.data?.reminder_hours||24;
  const from=new Date(Date.now()+(hours-.2)*3600000).toISOString(); const to=new Date(Date.now()+(hours+.2)*3600000).toISOString();
  const appts=await db.from('appointments').select('id,starts_at,service_name,patient:patients(id,first_name,last_name,email),staff:team_members(full_name)').gte('starts_at',from).lte('starts_at',to).in('status',['pending','confirmed']);
  for(const a of appts.data||[]){
    const patient:any=a.patient; const staff:any=a.staff; if(!patient?.email){skipped++;continue}
    const body=`Recordatorio de turno para ${patient.first_name} ${patient.last_name}. Fecha: ${new Date(a.starts_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}. Profesional: ${staff?.full_name||'Fundación Meriggi'}. Servicio: ${a.service_name}.`;
    const inserted=await db.from('communications').insert({patient_id:patient.id,appointment_id:a.id,recipient_email:patient.email,recipient_name:`${patient.first_name} ${patient.last_name}`,subject:'Recordatorio de turno — Fundación Meriggi',body,kind:'appointment_reminder',status:'pending'}).select('id,recipient_email,subject,body').maybeSingle();
    if(inserted.error){skipped++;continue}
    const result=await deliver(db,inserted.data as Pending);if(result==='sent')sent++;else if(result==='failed')failed++;else skipped++;
  }
  return json({ok:true,sent,skipped,failed});
});
