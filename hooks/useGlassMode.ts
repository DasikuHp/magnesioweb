'use client';
import { useState, useEffect } from 'react';
import { glassModeStore } from '@/lib/glassModeStore';

export function useGlassMode() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(glassModeStore.get());
    return glassModeStore.subscribe(setActive);
  }, []);
  const toggle = () => glassModeStore.set(!glassModeStore.get());
  return { active, toggle };
}
