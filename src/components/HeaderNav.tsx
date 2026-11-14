import Link from "next/link";
import {
  Bell,
  ClipboardList,
  FolderOpen,
  Handshake,
  LifeBuoy,
  LogOut,
  Percent,
  Plane,
  Plus,
  ScrollText,
  ShieldAlert,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { deconnecter } from "@/lib/action-binds";
import type { SessionUser } from "@/lib/auth";
import { OrbitMenu, type OrbitItem } from "./OrbitMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { LiensEntete } from "./NavActive";

export function HeaderNav({ user, unread = 0 }: { user: SessionUser; unread?: number }) {
  const initial = (user.prenom?.[0] ?? user.email[0] ?? "A").toUpperCase();
  const items = [
    ...liensPour(user),
    {
      href: "/compte",
      label: "Compte",
      icon: <UserRound size={20} strokeWidth={1.75} />,
      compact: true,
    },
  ];

  return (
    <div className="topbar-actions">
      <div className="header-linear">
        <LiensEntete items={items} />
      </div>
      <div className="header-orbit">
        <OrbitMenu items={items} label="Navigation" />
      </div>
      <div className="topbar-cluster">
        <ThemeSwitcher />
        <Link href="/notifications" className="icon-btn" aria-label="Notifications" title="Notifications">
          <Bell size={18} strokeWidth={1.75} />
          {unread > 0 ? <span className="badge">{unread > 9 ? "9+" : unread}</span> : null}
        </Link>
        <span className="topbar-avatar" title={`${user.prenom} ${user.nom}`}>
          {initial}
        </span>
        <form action={deconnecter}>
          <button type="submit" className="icon-btn" aria-label="Déconnexion" title="Déconnexion">
            <LogOut size={17} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Onglets de la barre mobile (candidat). */
export function ongletsMobileCandidat(unread: number) {
  return [
    { href: "/tableau-de-bord", label: "Dossiers", icon: <FolderOpen size={21} strokeWidth={1.75} /> },
    { href: "/demandes/nouvelle", label: "Nouvelle", icon: <Plus size={21} strokeWidth={2} /> },
    { href: "/vols", label: "Vols", icon: <Plane size={21} strokeWidth={1.75} /> },
    { href: "/notifications", label: "Alertes", icon: <Bell size={21} strokeWidth={1.75} />, badge: unread },
    { href: "/compte", label: "Compte", icon: <UserRound size={21} strokeWidth={1.75} /> },
  ];
}

function liensPour(user: SessionUser): (OrbitItem & { compact?: boolean })[] {
  if (user.typeCompte === "collaborateur") {
    return [
      { href: "/bureau", label: "Dossiers", icon: <FolderOpen size={20} strokeWidth={1.75} /> },
      { href: "/bureau/taches", label: "Tâches", icon: <ClipboardList size={20} strokeWidth={1.75} /> },
      { href: "/bureau/finance", label: "Finance", icon: <Wallet size={20} strokeWidth={1.75} /> },
      { href: "/bureau/fraude", label: "Fraude", icon: <ShieldAlert size={20} strokeWidth={1.75} /> },
      { href: "/bureau/equipe", label: "Équipe", icon: <Users size={20} strokeWidth={1.75} /> },
      { href: "/bureau/partenaires", label: "Partenaires", icon: <Handshake size={20} strokeWidth={1.75} /> },
      { href: "/bureau/exploitation", label: "Exploitation", icon: <LifeBuoy size={20} strokeWidth={1.75} /> },
      { href: "/bureau/audit", label: "Audit", icon: <ScrollText size={20} strokeWidth={1.75} /> },
    ];
  }
  if (user.typeCompte === "delegataire") {
    return [{ href: "/delegue", label: "Dossiers", icon: <FolderOpen size={20} strokeWidth={1.75} /> }];
  }
  if (user.typeCompte === "partenaire") {
    return [
      { href: "/partenaire", label: "Apports", icon: <FolderOpen size={20} strokeWidth={1.75} /> },
      { href: "/partenaire/nouvelle", label: "Initier", icon: <Plus size={20} strokeWidth={2} /> },
      { href: "/partenaire/commissions", label: "Commissions", icon: <Percent size={20} strokeWidth={1.75} /> },
      { href: "/partenaire/statuts", label: "Statuts", icon: <ScrollText size={20} strokeWidth={1.75} /> },
    ];
  }
  return [
    { href: "/tableau-de-bord", label: "Dossiers", icon: <FolderOpen size={20} strokeWidth={1.75} /> },
    { href: "/demandes/nouvelle", label: "Nouvelle", icon: <Plus size={20} strokeWidth={2} /> },
    { href: "/vols", label: "Vols", icon: <Plane size={20} strokeWidth={1.75} /> },
    { href: "/delegations", label: "Délégations", icon: <Users size={20} strokeWidth={1.75} /> },
  ];
}
