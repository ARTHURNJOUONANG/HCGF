import Link from "next/link";
import {
  CreditCard,
  FileText,
  Home,
  MessageCircle,
  Paperclip,
  Plane,
  Shield,
} from "lucide-react";
import { OrbitMenu } from "./OrbitMenu";

const ICONS = {
  formulaire: FileText,
  assurance: Shield,
  vol: Plane,
  logement: Home,
  documents: Paperclip,
  paiement: CreditCard,
  messages: MessageCircle,
} as const;

type TabKey = keyof typeof ICONS;

export function DossierTabs({
  demandeId,
  onglet,
  tabs,
}: {
  demandeId: string;
  onglet: string;
  tabs: { key: string; label: string }[];
}) {
  const items = tabs.map((tab) => {
    const Icon = ICONS[tab.key as TabKey] ?? FileText;
    return {
      href: `/demandes/${demandeId}?onglet=${tab.key}`,
      label: tab.label,
      icon: <Icon size={18} />,
      active: onglet === tab.key,
    };
  });
  const courant = tabs.find((tab) => tab.key === onglet) ?? tabs[0];
  const CurrentIcon = ICONS[courant.key as TabKey] ?? FileText;

  return (
    <>
      <nav className="tabs-row mt-8" aria-label="Onglets du dossier">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={`tab ${item.active ? "tab-on" : ""}`}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 flex items-center justify-between gap-3 md:hidden">
        <p className="text-[15px] font-medium tracking-tight text-[var(--blue-deep)]">{courant.label}</p>
        <OrbitMenu
          items={items}
          label="Onglets du dossier"
          menuId="orbit-dossier"
          current={<CurrentIcon size={18} />}
        />
      </div>
    </>
  );
}
