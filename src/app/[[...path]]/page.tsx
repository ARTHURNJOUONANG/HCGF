import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import HomePage from "@/screens/home";
import ContactPage from "@/screens/contact/page";
import ServicesPage from "@/screens/services/page";
import CgvPage from "@/screens/cgv/page";
import ConnexionPage from "@/screens/connexion/page";
import InscriptionPage from "@/screens/inscription/page";
import MotDePassePage from "@/screens/mot-de-passe/page";
import NouveauMotDePassePage from "@/screens/mot-de-passe/[token]/page";
import TableauDeBordPage from "@/screens/tableau-de-bord/page";
import NotificationsPage from "@/screens/notifications/page";
import ComptePage from "@/screens/compte/page";
import VolsPage from "@/screens/vols/page";
import DelegueHomePage from "@/screens/delegue/page";
import DelegationsPage from "@/screens/delegations/page";
import NouvelleDemandePage from "@/screens/demandes/nouvelle/page";
import DemandePage from "@/screens/demandes/[id]/page";
import BureauPage from "@/screens/bureau/page";
import AuditPage from "@/screens/bureau/audit/page";
import TachesPage from "@/screens/bureau/taches/page";
import BureauEquipePage from "@/screens/bureau/equipe/page";
import ExploitationPage from "@/screens/bureau/exploitation/page";
import BureauPartenairesPage from "@/screens/bureau/partenaires/page";
import BureauFraudePage from "@/screens/bureau/fraude/page";
import BureauFinancePage from "@/screens/bureau/finance/page";
import BureauDemandePage from "@/screens/bureau/demandes/[id]/page";
import PartenaireHomePage from "@/screens/partenaire/page";
import PartenaireCommissionsPage from "@/screens/partenaire/commissions/page";
import PartenaireNouvellePage from "@/screens/partenaire/nouvelle/page";
import PartenaireStatutsPage from "@/screens/partenaire/statuts/page";
import PartenaireDemandePage from "@/screens/partenaire/demandes/[id]/page";
import VerifierPage from "@/screens/verifier/[token]/page";

function asParams<T extends Record<string, string>>(value: T) {
  return Promise.resolve(value);
}

export default async function CatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ role?: string; onglet?: string; pay?: string; filtre?: string }>;
}) {
  const { path = [] } = await params;
  const sp = searchParams;
  const a = path[0];
  const b = path[1];
  const c = path[2];

  if (path.length === 0) return HomePage();
  if (path.length === 1 && a === "contact") return ContactPage();
  if (path.length === 1 && a === "services") return ServicesPage();
  if (path.length === 1 && a === "cgv") return CgvPage();
  if (path.length === 1 && a === "connexion") return ConnexionPage({ searchParams: sp });
  if (path.length === 1 && a === "inscription") return InscriptionPage({ searchParams: sp });
  if (path.length === 1 && a === "mot-de-passe") return MotDePassePage();
  if (path.length === 2 && a === "mot-de-passe" && b) return NouveauMotDePassePage({ params: asParams({ token: b }) });
  if (path.length === 1 && a === "tableau-de-bord") return TableauDeBordPage();
  if (path.length === 1 && a === "notifications") return NotificationsPage();
  if (path.length === 1 && a === "compte") return ComptePage();
  if (path.length === 1 && a === "vols") return VolsPage();
  if (path.length === 1 && a === "delegue") return DelegueHomePage();
  if (path.length === 1 && a === "delegations") return DelegationsPage();
  if (path.length === 2 && a === "demandes" && b === "nouvelle") return NouvelleDemandePage();
  if (path.length === 2 && a === "demandes" && b) {
    return DemandePage({ params: asParams({ id: b }), searchParams: sp });
  }
  if (path.length === 1 && a === "bureau") return BureauPage();
  if (path.length === 2 && a === "bureau" && b === "audit") return AuditPage();
  if (path.length === 2 && a === "bureau" && b === "taches") return TachesPage();
  if (path.length === 2 && a === "bureau" && b === "equipe") return BureauEquipePage();
  if (path.length === 2 && a === "bureau" && b === "exploitation") return ExploitationPage();
  if (path.length === 2 && a === "bureau" && b === "partenaires") return BureauPartenairesPage();
  if (path.length === 2 && a === "bureau" && b === "fraude") return BureauFraudePage({ searchParams: sp });
  if (path.length === 2 && a === "bureau" && b === "finance") return BureauFinancePage();
  if (path.length === 3 && a === "bureau" && b === "demandes" && c) {
    return BureauDemandePage({ params: asParams({ id: c }) });
  }
  if (path.length === 1 && a === "partenaire") return PartenaireHomePage();
  if (path.length === 2 && a === "partenaire" && b === "commissions") return PartenaireCommissionsPage();
  if (path.length === 2 && a === "partenaire" && b === "nouvelle") return PartenaireNouvellePage();
  if (path.length === 2 && a === "partenaire" && b === "statuts") return PartenaireStatutsPage();
  if (path.length === 3 && a === "partenaire" && b === "demandes" && c) {
    return PartenaireDemandePage({ params: asParams({ id: c }) });
  }
  if (path.length === 2 && a === "verifier" && b) return VerifierPage({ params: asParams({ token: b }) });

  notFound();
}
