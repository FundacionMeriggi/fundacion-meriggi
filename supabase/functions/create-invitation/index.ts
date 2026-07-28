import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, authenticatedUser } from '../_shared/supabase.ts';

function token() {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]||char));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function sendEmail(to:string,name:string,url:string){
  const key=Deno.env.get('RESEND_API_KEY'); const from=Deno.env.get('MAIL_FROM');
  if(!key||!from)return false;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:'Activá tu cuenta de Fundación Meriggi',html:`<p>Hola ${escapeHtml(name)},</p><p>Fundación Meriggi creó tu acceso al sistema. Abrí el siguiente enlace y elegí tu contraseña personal:</p><p><a href="${escapeHtml(url)}">Activar mi cuenta</a></p><p>El enlace vence en 72 horas y se puede utilizar una sola vez.</p>`})});
  return r.ok;
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Método no permitido'},405);
  const user=await authenticatedUser(req); if(!user)return json({error:'No autorizado'},401);
  const db=adminClient();
  const actor=await db.from('team_members').select('id,role,full_name').eq('auth_user_id',user.id).eq('active',true).maybeSingle();
  if(!actor.data||!['super_admin','admin_professional'].includes(actor.data.role))return json({error:'Permisos insuficientes'},403);
  try{
    const {target_type,target_id}=await req.json();
    if(!['staff','patient'].includes(target_type))return json({error:'Destino inválido'},400);
    const table=target_type==='staff'?'team_members':'patients';
    const target=await db.from(table).select('*').eq('id',target_id).single();
    if(target.error||!target.data)return json({error:'Cuenta no encontrada'},404);
    const raw=token(); const hash=await sha256(raw); const expires=new Date(Date.now()+72*60*60*1000).toISOString();
    await db.from('invitations').delete().eq('target_type',target_type).eq('target_id',target_id).is('used_at',null);
    const inserted=await db.from('invitations').insert({target_type,target_id,token_hash:hash,expires_at:expires,created_by:user.id});
    if(inserted.error)return json({error:inserted.error.message},400);
    const appUrl=(Deno.env.get('APP_URL')||'').replace(/\/$/,'');
    const activationUrl=`${appUrl}/activar/?token=${encodeURIComponent(raw)}`;
    const name=target_type==='staff'?target.data.full_name:`${target.data.first_name} ${target.data.last_name}`;
    const sent=target.data.email?await sendEmail(target.data.email,name,activationUrl):false;
    await db.from('audit_log').insert({actor_user_id:user.id,actor_name:actor.data.full_name,action:'invitation_created',table_name:table,record_id:target_id,metadata:{sent,expires_at:expires}});
    return json({activation_url:activationUrl,username:target.data.username,sent,expires_at:expires});
  }catch(e){console.error(e);return json({error:'No se pudo crear la invitación'},500)}
});
