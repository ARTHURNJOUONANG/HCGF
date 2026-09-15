"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

export type OrbitItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function OrbitMenu({
  items,
  label = "Menu",
  current,
}: {
  items: OrbitItem[];
  label?: string;
  current?: ReactNode;
  menuId?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const count = Math.max(items.length, 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={open ? "orbit is-open" : "orbit"}>
      <button
        type="button"
        className="orbit-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        {current ?? (
          <span className="orbit-bars" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
      <div id={dialogId} className="orbit-layer" role="dialog" aria-label={label}>
        <button type="button" className="orbit-backdrop" aria-label="Fermer" onClick={() => setOpen(false)} />
        <div className="orbit-disk">
          <span className="orbit-halo" />
          {items.map((item, i) => {
            const angle = ((360 / count) * i - 90) * (Math.PI / 180);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="orbit-item"
                data-on={item.active ? "true" : "false"}
                style={{
                  ["--x" as string]: `${Math.cos(angle) * 108}px`,
                  ["--y" as string]: `${Math.sin(angle) * 108}px`,
                  ["--delay" as string]: `${40 + i * 55}ms`,
                }}
                onClick={() => setOpen(false)}
              >
                <span className="orbit-bubble">{item.icon}</span>
                <span className="orbit-caption">{item.label}</span>
              </Link>
            );
          })}
          <button type="button" className="orbit-core" aria-label="Fermer" onClick={() => setOpen(false)}>
            <span className="orbit-bars is-close" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
