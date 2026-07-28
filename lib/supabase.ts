import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Faltan las variables de Supabase.');
  if (!client) client = createBrowserClient(url, key);
  return client;
}

export function appPath(path: string) {
  const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/fundacion-meriggi' : '';
  return `${base}${path}`;
}

export function appUrl(path = '') {
  const root = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${root.replace(/\/$/, '')}${path}`;
}
