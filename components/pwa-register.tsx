'use client';
import { useEffect } from 'react';
import { assetPath } from '@/lib/supabase';
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(assetPath('/sw.js')).catch(() => undefined);
  }, []);
  return null;
}
