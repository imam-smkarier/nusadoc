"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autosave draft ke localStorage (debounce 500ms).
 * Draft hanya hidup di builder — dokumen terbit bersifat final.
 */
export function useDocDraft<T>(key: string, initial: T) {
  const [doc, setDoc] = useState<T>(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const initialRef = useRef(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { doc: T; savedAt: number };
        if (parsed?.doc) {
          setDoc(parsed.doc);
          setSavedAt(parsed.savedAt ?? null);
        }
      }
    } catch {
      /* draft korup — mulai baru */
    }
    setRestored(true);
  }, [key]);

  useEffect(() => {
    if (!restored) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ doc, savedAt: Date.now() }));
        setSavedAt(Date.now());
      } catch {
        /* kuota penuh */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [doc, restored, key]);

  const clear = useCallback(() => {
    window.localStorage.removeItem(key);
    setDoc(initialRef.current);
    setSavedAt(null);
  }, [key]);

  return { doc, setDoc, savedAt, restored, clear };
}
