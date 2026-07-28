'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthFrame } from '@/components/auth-frame';
import { appPath, getSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace(appPath('/panel/'));
    });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabase();
      const normalized = identifier.trim().toLowerCase();
      let email = normalized;

      // El correo puede autenticarse directamente, sin depender de la función
      // de resolución de nombres de usuario.
      if (!normalized.includes('@')) {
        try {
          const functionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-login`;
          const response = await fetch(functionsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
            },
            body: JSON.stringify({ identifier: normalized }),
          });

          const resolved = await response.json();
          if (!response.ok || !resolved.email) {
            throw new Error('No se pudo resolver el usuario.');
          }
          email = resolved.email;
        } catch {
          throw new Error('Ingresá con tu correo electrónico para acceder.');
        }
      }

      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw new Error('Correo o contraseña incorrectos.');
      router.replace(appPath('/panel/'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Acceso seguro</span>
        <h2>Ingresar</h2>
        <p>Usá tu correo electrónico y tu contraseña personal.</p>
        <label>Correo electrónico
          <input
            type="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary full" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        <div className="auth-links">
          <Link href={appPath('/activar/')}>Activar cuenta</Link>
          <Link href={appPath('/recuperar/')}>Olvidé mi contraseña</Link>
        </div>
      </form>
    </AuthFrame>
  );
}
