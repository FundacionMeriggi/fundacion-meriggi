'use client';
import { useEffect } from 'react';
import { assetPath } from '@/lib/supabase';
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshed = false;
    const refreshAfterUpdate = () => {
      if (hadController && !refreshed) {
        refreshed = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', refreshAfterUpdate);
    navigator.serviceWorker
      .register(assetPath('/sw.js'))
      .then((registration) => registration.update())
      .catch(() => undefined);

    return () => navigator.serviceWorker.removeEventListener('controllerchange', refreshAfterUpdate);
  }, []);
  return null;
}
