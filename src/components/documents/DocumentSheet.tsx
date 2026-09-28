"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const A4_WIDTH_PX = 794; // 210mm @96dpi

/**
 * Pembungkus preview dokumen: kanvas A4 di-scale agar muat lebar kontainer.
 * Saat print, scaling dimatikan (lihat rule .preview-scale di globals.css).
 */
export function DocPreview({
  children,
  className,
  maxScale = 1,
}: {
  children: React.ReactNode;
  className?: string;
  maxScale?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const s = Math.min(maxScale, (outer.clientWidth - 4) / A4_WIDTH_PX);
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div
      ref={outerRef}
      className={cn("overflow-hidden", className)}
      style={{ height: height ? `${height}px` : undefined }}
    >
      <div
        ref={innerRef}
        className="preview-scale"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "210mm" }}
      >
        {children}
      </div>
    </div>
  );
}

/** Kanvas A4 — semua jenis dokumen memakai ini. */
export function DocumentSheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("doc-sheet px-[13mm] pb-[8mm] pt-[11mm]", className)}>{children}</div>;
}
