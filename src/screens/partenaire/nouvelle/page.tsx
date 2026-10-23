import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { InitierDossierForm } from "@/components/Lot5";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCount } from "@/lib/shell";
export default async function PartenaireNouvellePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte !== "partenaire") redirect("/tableau-de-bord");
  const unread = await unreadCount(session);

  const [pays, services, offres] = await Promise.all([
    prisma.pays.findMany({ where: { actif: true }, orderBy: { libelle: "asc" } }),
    prisma.service.findMany({ where: { actif: true } }),
    prisma.offreService.findMany({
      where: { actif: true },
      include: { pays: true, service: true },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell max-w-3xl py-6 sm:py-8">
        <PageIntro
          kicker="Apport"
          title="Initier un dossier"
          text="Le candidat reçoit une notification pour compléter son dossier. Vous ne voyez ensuite qu’un statut limité."
        />
        <InitierDossierForm
          pays={pays}
          services={services}
          offres={offres.map((o) => ({
            pays: o.codePays,
            service: o.codeService,
            texte: o.texteExplicatif,
            paysLibelle: o.pays.libelle,
            serviceLibelle: o.service.libelle,
          }))}
        />
      </main>
    </div>
  );
}
