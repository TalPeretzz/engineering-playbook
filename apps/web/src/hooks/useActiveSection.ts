"use client";

import { useState, useEffect, useRef } from "react";

export function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const intersectingRef = useRef<Set<string>>(new Set());
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        }
        // Pick the first id in document order that is currently intersecting
        const first = idsRef.current.find((id) => intersectingRef.current.has(id));
        if (first) setActiveId(first);
      },
      // Section top enters the top 30% of the viewport
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
    // ids.join is a stable key derived from content (static data) — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  return activeId;
}
