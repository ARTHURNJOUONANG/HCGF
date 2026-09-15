import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FolderOpen } from "lucide-react";
import { PaysListe } from "@/components/Pays";

export function StatusPill({ statut }: { statut: string }) {
  const labels: Record<string, string> = {
    brouillon: "Brouillon",
    en_traitement: "En cours",
    validee: "Validée",
    cloturee: "Clôturée",
    annulee: "Annulée",
    abandonnee: "Abandonnée",
  };
  const tone =
    statut === "validee" || statut === "cloturee"
      ? "pill-ok"
      : statut === "brouillon"
        ? "pill-hot"
        : "";
  return <span className={`pill ${tone}`}>{labels[statut] ?? statut}</span>;
}

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ambient-photo" src="/hcgf/tour-eiffel.jpg" alt="" />
      <span className="ambient-veil" />
    </div>
  );
}

export function Mark({ light = false }: { light?: boolean }) {
  return (
    <span className={light ? "brand-mark brand-mark-on-dark" : "brand-mark"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hcgf/logo.png?v=4" alt="HCGF — Horizon Caution & Garantie Financière" />
    </span>
  );
}

export function Scene({
  src,
  alt,
  kicker,
  caption,
  className,
}: {
  src: string;
  alt: string;
  kicker?: string;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={`vitrine-scene${className ? ` ${className}` : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
      {caption ? (
        <>
          <span className="vitrine-scene-veil" aria-hidden />
          <figcaption className="vitrine-scene-caption">
            {kicker ? <small>{kicker}</small> : null}
            <strong>{caption}</strong>
          </figcaption>
        </>
      ) : null}
    </figure>
  );
}

export function AuthLayout({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <aside className="auth-panel">
        <div className="auth-panel-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hcgf/etudiant.jpg" alt="" />
        </div>
        <div className="auth-panel-veil" aria-hidden />
        <div className="auth-panel-inner">
          <Link href="/" aria-label="Accueil HCGF" className="auth-panel-logo">
            <Mark />
          </Link>
          <div className="auth-panel-foot">
            <p className="auth-panel-eyebrow">Horizon Caution</p>
            <p className="auth-panel-claim">L’accompagnement des parcours d’études, de mobilité et d’installation.</p>
            <ul className="auth-panel-proofs">
              <li>AVI, assurance, logement et vol</li>
              <li>France, Allemagne, Belgique, Canada</li>
              <li>Pièces et paiements jamais mélangés</li>
            </ul>
            <div className="auth-panel-flags">
              <PaysListe light />
            </div>
          </div>
        </div>
      </aside>

      <section className="auth-stage">
        <header className="auth-stage-top">
          <Link href="/" aria-label="Accueil HCGF" className="auth-stage-logo">
            <Mark />
          </Link>
          <Link href="/" className="auth-home">
            Retour à l’accueil
          </Link>
        </header>
        <main className="auth-main">
          <p className="vitrine-eyebrow">{kicker}</p>
          <h1 className="auth-heading">{title}</h1>
          {lead ? <p className="auth-lead">{lead}</p> : null}
          {children}
        </main>
      </section>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="stat-tile">
      <p className="kicker">{label}</p>
      <p className="stat-value">{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </div>
  );
}

export function DossierTile({
  href,
  reference,
  title,
  service,
  country,
  meta,
  statut,
  pill,
  progress,
}: {
  href: string;
  reference: string;
  title: string;
  service?: string;
  country?: ReactNode;
  meta?: ReactNode;
  statut?: string;
  pill?: ReactNode;
  progress?: number;
}) {
  return (
    <Link href={href} className="dossier card lift" data-service={service ?? ""}>
      <div className="dossier-top">
        <div className="min-w-0">
          <p className="kicker">{reference}</p>
          <h2 className="dossier-title">{title}</h2>
          {country ? <p className="dossier-country">{country}</p> : null}
          {meta ? <p className="dossier-meta">{meta}</p> : null}
        </div>
        <div className="dossier-aside">
          {pill ?? (statut ? <StatusPill statut={statut} /> : null)}
          <ChevronRight size={18} className="dossier-chevron" />
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="dossier-progress">
          <div className="progress flex-1">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="dossier-pct">{progress}%</span>
        </div>
      ) : null}
    </Link>
  );
}

export function EmptyHint({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-hint">
      <span className="empty-icon">{icon ?? <FolderOpen size={26} strokeWidth={1.5} />}</span>
      <p className="empty-title">{title}</p>
      {text ? <p className="empty-text">{text}</p> : null}
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <ArrowLeft size={16} />
      {children}
    </Link>
  );
}

export function DossierHero({
  backHref,
  backLabel,
  reference,
  title,
  country,
  meta,
  aside,
}: {
  backHref: string;
  backLabel: string;
  reference: string;
  title: string;
  country?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <BackLink href={backHref}>{backLabel}</BackLink>
      <div className="dossier-hero reveal">
        <div className="min-w-0">
          <p className="kicker">{reference}</p>
          <h1 className="display dossier-hero-title">{title}</h1>
          {country ? <p className="dossier-hero-country">{country}</p> : null}
          {meta ? <p className="dossier-hero-meta">{meta}</p> : null}
        </div>
        {aside ? <div className="dossier-hero-aside">{aside}</div> : null}
      </div>
    </>
  );
}

export function SoftMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="soft-metric">
      <p className="kicker">{label}</p>
      <p className="soft-metric-value">{value}</p>
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="panel-title">{children}</h2>;
}
