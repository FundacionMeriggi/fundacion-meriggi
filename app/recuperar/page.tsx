'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthFrame } from '@/components/auth-frame';
import { appPath, appUrl, getSupabase, hasSupabaseConfig } from '@/lib/supabase';

export default function RecoverPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [recoverySession, setRecoverySession] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setError('La conexión segura todavía no está configurada.');
      return;
    }
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => setRecoverySession(Boolean(data.session)));
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || session) setRecoverySession(true);
      });
      return () => data.subscription.unsubscribe();
    } catch {
      setError('No pudimos iniciar la recuperación de acceso.');
      return;
    }
  }, []);

  async function requestReset(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try {
      if (!hasSupabaseConfig()) throw new Error('missing_config');
      const result = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: appUrl('/recuperar/') });
      if (result.error) throw result.error;
      setMessage('Si el correo está registrado, recibirás un enlace para restablecer la contraseña.');
    } catch {
      setError('No se pudo procesar la solicitud.');
    } finally { setLoading(false); }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (password.length < 10) return setError('La contraseña debe tener al menos 10 caracteres.');
    if (password !== repeat) return setError('Las contraseñas no coinciden.');
    if (!hasSupabaseConfig()) return setError('La conexión segura todavía no está configurada.');
    setLoading(true);
    try {
      const result = await getSupabase().auth.updateUser({ password });
      if (result.error) setError('No se pudo actualizar la contraseña. Solicitá un enlace nuevo.');
      else { setMessage('Contraseña actualizada. Ya podés volver al ingreso.'); setPassword(''); setRepeat(''); }
    } catch {
      setError('No se pudo actualizar la contraseña. Solicitá un enlace nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      {recoverySession ? <form className="auth-card" onSubmit={updatePassword}>
        <span className="eyebrow">Nueva contraseña</span><h2>Restablecer acceso</h2><p>Elegí una contraseña personal de al menos 10 caracteres.</p>
        <label>Nueva contraseña<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="new-password" minLength={10} required/></label>
        <label>Repetir contraseña<input type="password" value={repeat} onChange={(e)=>setRepeat(e.target.value)} autoComplete="new-password" minLength={10} required/></label>
        {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}
        <button className="btn primary full" disabled={loading}>{loading?'Guardando…':'Guardar contraseña'}</button>
        <div className="auth-links"><Link href={appPath('/login/')}>Volver al ingreso</Link></div>
      </form> : <form className="auth-card" onSubmit={requestReset}>
        <span className="eyebrow">Recuperación</span><h2>Restablecer contraseña</h2><p>Las cuentas sin correo deben solicitar al administrador un nuevo enlace de activación.</p>
        <label>Correo electrónico<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required/></label>
        {error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}
        <button className="btn primary full" disabled={loading}>{loading?'Enviando…':'Enviar enlace'}</button>
        <div className="auth-links"><Link href={appPath('/login/')}>Volver al ingreso</Link></div>
      </form>}
    </AuthFrame>
  );
}
