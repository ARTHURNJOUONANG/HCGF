"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { VitrineWorld } from "./VitrineWorld";

export function VitrineStage({
  children,
  images,
}: {
  children: ReactNode;
  images: string[];
}) {
  const root = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || images.length === 0) {
      setPct(100);
      setReady(true);
      return;
    }
    let done = 0;
    const unique = [...new Set(images)];
    const mark = () => {
      done += 1;
      setPct(Math.round((done / unique.length) * 100));
      if (done >= unique.length) window.setTimeout(() => setReady(true), 180);
    };
    unique.forEach((src) => {
      const img = new Image();
      img.onload = mark;
      img.onerror = mark;
      img.src = src;
    });
  }, [images]);

  useEffect(() => {
    const stage = root.current;
    if (!stage || !ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chapters = [...stage.querySelectorAll<HTMLElement>(".vz-chapter")];
    setLabels(chapters.map((el, i) => el.dataset.rail ?? String(i + 1).padStart(2, "0")));

    const goTo = (id: string, behavior: ScrollBehavior = "smooth") => {
      if (!id) return;
      stage.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior, block: "start" });
    };
    const goHash = () => goTo(window.location.hash.slice(1));
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.("a[href^='#']");
      if (!link) return;
      const id = link.getAttribute("href")?.slice(1);
      if (!id) return;
      event.preventDefault();
      goTo(id);
    };
    const wrap = stage.parentElement;
    const onWheel = (event: WheelEvent) => {
      if (stage.contains(event.target as Node)) return;
      stage.scrollTop += event.deltaY;
    };
    wrap?.addEventListener("wheel", onWheel, { passive: true });
    stage.addEventListener("click", onClick);
    goHash();
    window.addEventListener("hashchange", goHash);

    let raf = 0;
    const frame = () => {
      const max = stage.scrollHeight - stage.clientHeight;
      const next = max > 0 ? stage.scrollTop / max : 0;
      progressRef.current = next;
      setScrollPct(next);
      const h = stage.clientHeight || 1;
      let current = 0;
      chapters.forEach((el, i) => {
        const top = el.getBoundingClientRect().top;
        const p = Math.max(-1, Math.min(1, top / h));
        el.style.setProperty("--vz-p", p.toFixed(3));
        el.style.setProperty("--vz-fade", Math.max(0, 1 - Math.abs(p) * 1.35).toFixed(3));
        if (top <= h * 0.42) current = i;
      });
      chapters.forEach((el, i) => el.classList.toggle("is-on", i === current));
      setActive(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };
    const onMove = (event: MouseEvent) => {
      stage.style.setProperty("--vz-mx", (event.clientX / window.innerWidth - 0.5).toFixed(3));
      stage.style.setProperty("--vz-my", (event.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    frame();
    stage.addEventListener("scroll", onScroll, { passive: true });
    if (!reduce) window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("hashchange", goHash);
      window.removeEventListener("mousemove", onMove);
      wrap?.removeEventListener("wheel", onWheel);
      stage.removeEventListener("scroll", onScroll);
      stage.removeEventListener("click", onClick);
      cancelAnimationFrame(raf);
    };
  }, [ready]);

  const jump = (index: number) => {
    root.current?.querySelectorAll<HTMLElement>(".vz-chapter")[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className={`vz-stage-wrap vz-journey${ready ? " is-ready" : ""}`}>
      <div className="vz-loader" aria-hidden={ready} aria-busy={!ready}>
        <span>Horizon Caution</span>
        <strong>{pct}%</strong>
        <i className="vz-loader-spin" />
      </div>
      <VitrineWorld mode="journey" progressRef={progressRef} />
      <div className="vz-progress" aria-hidden>
        <span style={{ transform: `scaleX(${scrollPct})` }} />
      </div>
      <nav className="vz-rail" aria-label="Parcours">
        {labels.map((label, i) => (
          <button key={label} type="button" className={i === active ? "is-on" : undefined} onClick={() => jump(i)}>
            {label}
          </button>
        ))}
      </nav>
      <p className="vz-scroll-hint" hidden={active > 0}>
        Défiler
        <span />
      </p>
      <main ref={root} className="vz-stage">
        {children}
      </main>
    </div>
  );
}

export function RevealOnScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("is-in", entry.isIntersecting));
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll(".vz-reveal").forEach((el) => io.observe(el));
    const onMove = (event: MouseEvent) => {
      root.style.setProperty("--vz-mx", (event.clientX / window.innerWidth - 0.5).toFixed(3));
      root.style.setProperty("--vz-my", (event.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}
