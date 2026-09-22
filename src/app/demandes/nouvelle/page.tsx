import { redirect } from "next/navigation";
import { AppHeader, PageIntro } from "@/components/Chrome";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NouvelleDemandeForm } from "./ui";

export default async function NouvelleDemandePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.typeCompte === "partenaire") redirect("/partenaire/nouvelle");
  if (session.typeCompte === "collaborateur") redirect("/bureau");
  if (session.typeCompte === "delegataire") redirect("/delegue");

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
      <AppHeader user={session} />
      <main className="shell max-w-3xl py-6 sm:py-8">
        <PageIntro
          kicker="Nouvelle demande"
          title="Quel service ouvrez-vous ?"
          text="Le pays détermine ensuite le formulaire, les pièces et les règles. Rien n’est figé dans le code."
        />
        <NouvelleDemandeForm
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
