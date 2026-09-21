import { notFound, redirect } from "next/navigation";
import { AppHeader, StatusPill } from "@/components/Chrome";
import { DossierHero } from "@/components/Surface";
import { Thread } from "@/components/DossierDesk";
import { BureauAudit, BureauFinance, BureauPieces, BureauSignature, BureauTaches } from "@/components/BureauDesk";
import { MessageBox, CloturerDossierForm, LeverAlerteForm } from "@/components/Lot2";
import { unreadCount } from "@/lib/shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaysNom } from "@/components/Pays";
import { PrioriteForm } from "@/components/Lot68";
import { assurerEspaceFinancier } from "@/lib/lot3";
import { assurerEcheanceSla } from "@/lib/lot8";
import { euros } from "@/lib/finance";
import { estAdministrateur } from "@/lib/espaces";

export default async function BureauDemandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.typeCompte !== "collaborateur") redirect("/connexion");
  const { id } = await params;

  const demande = await prisma.demande.findUnique({
    where: { id },
    include: {
      utilisateur: { include: { profil: true } },
      offre: { include: { pays: true, service: true, pieces: true } },
      documents: { include: { piece: true }, orderBy: { createdAt: "desc" } },
      taches: { orderBy: { createdAt: "desc" } },
      conversation: {
        include: {
          messages: {
            include: { auteur: { include: { profil: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      audits: { orderBy: { createdAt: "desc" }, take: 8, include: { acteur: true } },
      partenaire: true,
      commission: true,
      alertesFraude: { where: { statut: { not: "levee" } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!demande) notFound();

  const finance = await assurerEspaceFinancier(demande.id);
  await assurerEcheanceSla(demande.id);
  const peutSigner = estAdministrateur(session.role);
  const unread = await unreadCount(session);
  const transmis = demande.documents.filter((d) => d.type === "transmis");
  const dejaSigne = demande.documents.some((d) => d.type === "genere" && d.statut === "signe");

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-10 sm:py-14">
        <DossierHero
          backHref="/bureau"
          backLabel="File"
          reference={demande.reference}
          title={demande.offre.service.libelle}
          country={<PaysNom code={demande.offre.codePays} libelle={demande.offre.pays.libelle} size="lg" />}
          meta={
            <>
              {demande.utilisateur.profil?.prenom} {demande.utilisateur.profil?.nom}
              {demande.partenaire ? ` · Apporté par ${demande.partenaire.nom}` : ""}
              {demande.commission ? ` · Commission ${euros(demande.commission.montantCalcule)}` : ""}
            </>
          }
          aside={
            <>
              <StatusPill statut={demande.statut} />
              <PrioriteForm demandeId={demande.id} valeur={demande.priorite} />
            </>
          }
        />

        <div className="workspace">
          <div className="reveal min-w-0 bureau-main">
            <Thread
              selfId={session.id}
              kicker="Bureau"
              title="Conversation"
              badge="Fil du dossier"
              emptyTitle="Répondre au candidat"
              emptyText="Le fil est le même que celui du candidat. Chaque message reste attaché à ce dossier."
              messages={(demande.conversation?.messages ?? []).map((m) => ({
                id: m.id,
                contenu: m.contenu,
                createdAt: m.createdAt,
                idAuteur: m.idAuteur,
                auteurNom: m.auteur.profil?.prenom ?? m.auteur.email,
              }))}
              composer={<MessageBox demandeId={demande.id} placeholder="Répondre au candidat…" />}
            />
            <BureauPieces
              pieces={demande.offre.pieces.map((piece) => ({
                id: piece.id,
                libelle: piece.libelle,
                obligatoire: piece.obligatoire,
                docs: transmis
                  .filter((d) => d.idPieceRequise === piece.id)
                  .map((d) => ({ id: d.id, nom: d.nom, statut: d.statut })),
              }))}
            />
          </div>

          <aside className="workspace-rail">
            {finance ? (
              <BureauFinance
                attendu={finance.montantAttendu}
                recu={finance.montantRecu}
                statutFonds={finance.statutFonds}
                operations={finance.operations}
                remboursements={finance.demande.remboursements}
                pieces={finance.demande.piecesComptables}
              />
            ) : null}
            <BureauSignature
              demandeId={demande.id}
              autorise={peutSigner}
              dejaSigne={dejaSigne}
              controleRenforce={demande.controleRenforce}
            />
            {demande.alertesFraude.length > 0 ? (
              <section className="rail-card card">
                <p className="kicker">Fraude</p>
                <h2 className="rail-title">Alertes ouvertes</h2>
                <ul className="mt-3 space-y-3">
                  {demande.alertesFraude.map((alerte) => (
                    <li key={alerte.id}>
                      <p className="text-sm">{alerte.detail}</p>
                      <div className="mt-2">
                        <LeverAlerteForm alerteId={alerte.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {demande.statut === "validee" || demande.statut === "abandonnee" ? (
              <CloturerDossierForm demandeId={demande.id} />
            ) : null}
            <BureauTaches
              demandeId={demande.id}
              taches={demande.taches.map((t) => ({
                id: t.id,
                action: t.action,
                priorite: t.priorite,
                statut: t.statut,
              }))}
            />
            <BureauAudit audits={demande.audits} />
          </aside>
        </div>
      </main>
    </div>
  );
}
