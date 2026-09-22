import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { HeaderNav } from "./HeaderNav";
import { Mark, StatusPill } from "./Surface";
import { SiteHeader } from "./SiteHeader";

export { StatusPill };

export function PublicHeader() {
  return <SiteHeader />;
}

export function AppHeader({
  user,
  unread = 0,
}: {
  user: SessionUser;
  unread?: number;
}) {
  const home =
    user.typeCompte === "collaborateur"
      ? "/bureau"
      : user.typeCompte === "partenaire"
        ? "/partenaire"
        : user.typeCompte === "delegataire"
          ? "/delegue"
          : "/tableau-de-bord";
  return (
    <header className="topbar">
      <div className="shell flex min-w-0 items-center justify-between gap-3 py-3">
        <Link href={home} aria-label="Accueil" className="shrink-0">
          <Mark />
        </Link>
        <HeaderNav user={user} unread={unread} />
      </div>
    </header>
  );
}

export function PageIntro({
  kicker,
  title,
  text,
  action,
}: {
  kicker?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div className="max-w-2xl">
        {kicker ? <p className="kicker mb-1.5">{kicker}</p> : null}
        <h1 className="page-intro-title">{title}</h1>
        {text ? <p className="page-intro-text">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}
