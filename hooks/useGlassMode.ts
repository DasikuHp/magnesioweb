'use client';
import { useSyncExternalStore } from 'react';
import { glassModeStore } from '@/lib/glassModeStore';

// useSyncExternalStore es el hook de React para leer un estado que vive fuera de
// React (aquí, glassModeStore) y volver a pintar cuando cambia.
export function useGlassMode() {
  const active = useSyncExternalStore(glassModeStore.subscribe, glassModeStore.get, () => false);
  const toggle = () => glassModeStore.set(!glassModeStore.get());
  return { active, toggle };
}
