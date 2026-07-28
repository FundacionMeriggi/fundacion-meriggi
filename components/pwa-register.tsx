'use client';
import { useEffect } from 'react';
import { appPath } from '@/lib/supabase';
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(appPath('/sw.js')).catch(() => undefined);
  }, []);
  return null;
}
