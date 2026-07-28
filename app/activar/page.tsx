'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthFrame } from '@/components/auth-frame';
import { appPath, hasSupabaseConfig } from '@/lib/supabase';

export default function ActivatePage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setToken(query.get('token') || '');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    if (password.length < 10) return setError('La contraseña debe tener al menos 10 caracteres.');
    if (password !== repeat) return setError('Las contraseñas no coinciden.');
    if (!hasSupabaseConfig()) return setError('La conexión segura todavía no está configurada.');
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/activate-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo activar la cuenta.');
      setMessage(
        data.recreated
          ? `Cuenta recreada correctamente. Tu usuario es ${data.username}. Ya podés ingresar.`
          : `Cuenta activada. Tu usuario es ${data.username}. Ya podés ingresar.`,
      );
      setPassword(''); setRepeat('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo activar la cuenta.');
    } finally { setLoading(false); }
  }

  return (
    <AuthFrame>
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Primera activación</span>
        <h2>Elegí tu contraseña</h2>
        <p>Ingresá el código recibido o abrí directamente el enlace de invitación.</p>
        <label>Código de activación
          <input value={token} onChange={(e) => setToken(e.target.value.trim())} autoComplete="one-time-code" required />
        </label>
        <label>Nueva contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} required />
        </label>
        <label>Repetir contraseña
          <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" minLength={10} required />
        </label>
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        <button className="btn primary full" disabled={loading}>{loading ? 'Activando…' : 'Activar cuenta'}</button>
        <div className="auth-links"><Link href={appPath('/login/')}>Volver al ingreso</Link></div>
      </form>
    </AuthFrame>
  );
}
