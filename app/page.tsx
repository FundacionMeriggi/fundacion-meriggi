'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appPath, getSupabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      router.replace(appPath(data.session ? '/panel/' : '/login/'));
    });
  }, [router]);
  return <div className="loading"><div><div className="spinner" />Abriendo Fundación Meriggi…</div></div>;
}
