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
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { deconnecter } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";
import { OrbitMenu, type OrbitItem } from "./OrbitMenu";

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
        {items.map((item) =>
          item.compact ? (
            <Link key={item.href} href={item.href} className="icon-btn" aria-label={item.label} title={item.label}>
              {item.icon}
            </Link>
          ) : (
            <Link key={item.href} href={item.href} className="icon-nav" title={item.label}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ),
        )}
      </div>
      <div className="header-orbit">
        <OrbitMenu items={items} label="Navigation" />
      </div>
      <div className="topbar-cluster">
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

function liensPour(user: SessionUser): (OrbitItem & { compact?: boolean })[] {
  if (user.typeCompte === "collaborateur") {
    return [
      { href: "/bureau", label: "Dossiers", icon: <FolderOpen size={20} strokeWidth={1.75} /> },
      { href: "/bureau/taches", label: "Tâches", icon: <ClipboardList size={20} strokeWidth={1.75} /> },
      { href: "/bureau/finance", label: "Finance", icon: <Wallet size={20} strokeWidth={1.75} /> },
      { href: "/bureau/equipe", label: "Équipe", icon: <Users size={20} strokeWidth={1.75} />, compact: true },
      { href: "/bureau/partenaires", label: "Partenaires", icon: <Handshake size={20} strokeWidth={1.75} />, compact: true },
      { href: "/bureau/exploitation", label: "Exploitation", icon: <LifeBuoy size={20} strokeWidth={1.75} />, compact: true },
      { href: "/bureau/audit", label: "Audit", icon: <ScrollText size={20} strokeWidth={1.75} />, compact: true },
    ];
  }
  if (user.typeCompte === "delegataire") {
    return [{ href: "/delegue", label: "Dossiers", icon: <FolderOpen size={20} strokeWidth={1.75} /> }];
  }
  if (user.typeCompte === "partenaire") {
    return [
      { href: "/partenaire/nouvelle", label: "Initier", icon: <Plus size={18} strokeWidth={2} />, compact: true },
      { href: "/partenaire/commissions", label: "Commissions", icon: <Percent size={20} strokeWidth={1.75} /> },
      { href: "/partenaire/statuts", label: "Statuts", icon: <ScrollText size={20} strokeWidth={1.75} />, compact: true },
    ];
  }
  return [
    { href: "/demandes/nouvelle", label: "Nouvelle", icon: <Plus size={18} strokeWidth={2} />, compact: true },
    { href: "/delegations", label: "Délégations", icon: <Users size={20} strokeWidth={1.75} />, compact: true },
    { href: "/vols", label: "Vols", icon: <Plane size={20} strokeWidth={1.75} />, compact: true },
  ];
}
