"use client";

import { useEffect, useState } from "react";

type ToastDetail = { message: string; tone?: "ok" | "hot" };

export function pushToast(message: string, tone: "ok" | "hot" = "ok") {
  window.dispatchEvent(new CustomEvent<ToastDetail>("avi-toast", { detail: { message, tone } }));
}

export function ToastHost() {
  const [item, setItem] = useState<ToastDetail | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onToast(event: Event) {
      clearTimeout(timer);
      setItem((event as CustomEvent<ToastDetail>).detail);
      timer = setTimeout(() => setItem(null), 3200);
    }
    window.addEventListener("avi-toast", onToast);
    return () => {
      window.removeEventListener("avi-toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  return (
    <p className={`toast${item.tone === "hot" ? " is-hot" : ""}`} role="status">
      {item.message}
    </p>
  );
}
