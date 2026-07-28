import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Faltan las variables de Supabase.');
  if (!client) client = createBrowserClient(url, key);
  return client;
}

export function appPath(path: string) {
  return path;
}

export function assetPath(path: string) {
  const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages' ? '/fundacion-meriggi' : '';
  return `${base}${path}`;
}

export function appUrl(path = '') {
  const root = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${root.replace(/\/$/, '')}${path}`;
}
