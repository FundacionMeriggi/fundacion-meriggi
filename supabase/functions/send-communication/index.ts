import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';


function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]||char));
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Método no permitido'},405);
  const user=await authenticatedUser(req);if(!user)return json({error:'No autorizado'},401);
  const db=adminClient();
  const actor=await db.from('team_members').select('id,role,full_name').eq('auth_user_id',user.id).eq('active',true).maybeSingle();
  if(!actor.data||!['super_admin','admin_professional','secretary'].includes(actor.data.role))return json({error:'Permisos insuficientes'},403);
  try{
    const {recipient_email,recipient_name,subject,body}=await req.json();
    if(!recipient_email||!subject||!body)return json({error:'Faltan datos obligatorios'},400);
    const created=await db.from('communications').insert({recipient_email,recipient_name:recipient_name||null,subject,body,kind:'manual',status:'pending',created_by:user.id}).select().single();
    if(created.error)return json({error:created.error.message},400);
    const key=Deno.env.get('RESEND_API_KEY');const from=Deno.env.get('MAIL_FROM');
    if(!key||!from)return json({sent:false,id:created.data.id});
    const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:recipient_email,subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${escapeHtml(String(body)).replaceAll('\n','<br>')}</p><hr><small>Fundación Meriggi</small></div>`})});
    const provider=await result.json().catch(()=>({}));
    await db.from('communications').update(result.ok?{status:'sent',sent_at:new Date().toISOString(),provider_id:provider.id||null}:{status:'failed',error_message:provider.message||'Error de proveedor'}).eq('id',created.data.id);
    return json({sent:result.ok,id:created.data.id});
  }catch(e){console.error(e);return json({error:'No se pudo enviar el mensaje'},500)}
});
