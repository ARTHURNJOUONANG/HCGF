import { notFound, redirect } from "next/navigation";
import {
  CreditCard,
  Download,
  FileText,
  Home,
  MessageCircle,
  Paperclip,
  Plane,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { AppHeader, StatusPill } from "@/components/Chrome";
import { DossierHero } from "@/components/Surface";
import { ChecklistRail, SupportRail, Thread } from "@/components/DossierDesk";
import { ConsultationSeule, PaiementBoard, PiecesBoard } from "@/components/DossierMetier";
import { MessageBox } from "@/components/Lot2";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reponsesVersMap } from "@/lib/metier";
import { unreadCount } from "@/lib/shell";
import { PaysNom } from "@/components/Pays";
import { ibanPlateforme } from "@/lib/coordonnees";
import { assurerEspaceFinancier } from "@/lib/lot3";
import { etatMoyensPaiement } from "@/lib/moyens-paiement";
import { AssurancePanel, BanniereCroisee, LogementPanel, VolPanel } from "@/components/PanelsMetier";
import { DossierTabs } from "@/components/DossierTabs";
import { aLeDroit, droitsSurDemande } from "@/lib/delegation";
import { FormulaireDynamique } from "./ui";

const etapeLabel: Record<string, string> = {
  formulaire: "Formulaire",
  documents: "Documents",
  paiement: "Paiement",
  validation: "Validation",
  tarification: "Tarif",
  attestation: "Attestation",
  matching: "Matching",
  signature: "Signature",
  recherche: "Recherche",
  passager: "Passager",
  hold: "Hold",
  justificatif: "Justificatif",
};

export default async function DemandePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; pay?: string }>;
}) {
  const session = await getSession();
  if (!session || session.typeCompte === "collaborateur") redirect("/connexion");
  if (session.typeCompte === "partenaire") redirect("/partenaire");
  const { id } = await params;
  const { onglet = "formulaire", pay } = await searchParams;
  const droits = await droitsSurDemande(session.id, session.typeCompte, id);
  if (!aLeDroit(droits, "consulter")) redirect(session.typeCompte === "delegataire" ? "/delegue" : "/tableau-de-bord");

  const demande = await prisma.demande.findFirst({
    where: { id },
    include: {
      offre: {
        include: {
          pays: true,
          service: true,
          formulaire: { include: { champs: { orderBy: { ordre: "asc" } } } },
          pieces: { orderBy: { ordreFusion: "asc" } },
        },
      },
      reponses: { include: { champ: true } },
      checklist: { orderBy: { ordre: "asc" } },
      documents: { include: { piece: true }, orderBy: { createdAt: "desc" } },
      conversation: {
        include: {
          messages: { include: { auteur: { include: { profil: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
      jetons: { where: { statut: "valide" }, orderBy: { createdAt: "desc" }, take: 1 },
      partenaire: true,
    },
  });
  if (!demande?.offre.formulaire) notFound();

  const finance = await assurerEspaceFinancier(demande.id);
  const valeurs = reponsesVersMap(demande.reponses);
  const etapes = JSON.parse(demande.offre.etapesParcours) as string[];
  const index = Math.max(1, etapes.indexOf(demande.etapeCourante) + 1);
  const final = demande.documents.find((d) => d.type === "genere" && d.statut === "signe");
  const unread = await unreadCount(session);

  const service = demande.offre.codeService;
  const tabs = [
    ["formulaire", "Formulaire", FileText],
    ...(service === "ASSURANCE" ? [["assurance", "Assurance", Shield] as const] : []),
    ...(service === "VOL" ? [["vol", "Vol", Plane] as const] : []),
    ...(service === "HEBERGEMENT" ? [["logement", "Logement", Home] as const] : []),
    ["documents", "Pièces", Paperclip],
    ...(aLeDroit(droits, "payer") ? [["paiement", "Paiement", CreditCard] as const] : []),
    ["messages", "Messages", MessageCircle],
  ] as const;

  return (
    <div className="min-h-screen">
      <AppHeader user={session} unread={unread} />
      <main className="shell py-6 sm:py-8">
        <DossierHero
          backHref={session.typeCompte === "delegataire" ? "/delegue" : "/tableau-de-bord"}
          backLabel="Dossiers"
          reference={`${demande.reference}${demande.partenaire ? ` · Apporté par ${demande.partenaire.nom}` : ""}`}
          title={demande.offre.service.libelle}
          country={<PaysNom code={demande.offre.codePays} libelle={demande.offre.pays.libelle} size="lg" />}
          aside={<StatusPill statut={demande.statut} />}
        />

        <ol className="step-list">
          {etapes.map((etape, i) => (
            <li key={etape} className={`step-chip${i + 1 === index ? " is-on" : ""}`}>
              {etapeLabel[etape] ?? etape}
            </li>
          ))}
        </ol>

        <BanniereCroisee demandeId={demande.id} service={service} />

        {final ? (
          <div className="card reveal mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="stamp">
                <ShieldCheck size={22} />
              </span>
              <div>
                <p className="kicker">Document final</p>
                <p className="text-[15px] font-semibold tracking-tight">Formulaire signé + pièces</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`/api/fichiers/${final.id}`} className="icon-btn" aria-label="Télécharger" title="Télécharger">
                <Download size={18} />
              </a>
              {demande.jetons[0] ? (
                <a href={`/verifier/${demande.jetons[0].token}`} className="icon-btn" aria-label="Vérifier" title="Vérifier">
                  <ShieldCheck size={18} />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <DossierTabs
          demandeId={demande.id}
          onglet={onglet}
          tabs={tabs.map(([key, label]) => ({ key, label }))}
        />

        <div className="workspace">
          <div className="reveal min-w-0">
            {onglet === "formulaire" ? (
              aLeDroit(droits, "repondre") ? (
                <FormulaireDynamique
                  demandeId={demande.id}
                  champs={demande.offre.formulaire.champs.map((c) => ({
                    id: c.id,
                    code: c.code,
                    typeSaisie: c.typeSaisie,
                    obligatoire: c.obligatoire,
                    libelle: c.libelle,
                    aide: c.aide,
                    options: c.optionsJson ? (JSON.parse(c.optionsJson) as string[]) : [],
                    conditionChamp: c.conditionChamp,
                    conditionOp: c.conditionOp,
                    conditionValeur: c.conditionValeur,
                  }))}
                  valeursInitiales={valeurs}
                  avancementInitial={demande.pourcentageAvancement}
                />
              ) : (
                <ConsultationSeule>Consultation seule. Le formulaire n’est pas délégué.</ConsultationSeule>
              )
            ) : null}

            {onglet === "assurance" ? <AssurancePanel demandeId={demande.id} /> : null}
            {onglet === "vol" ? <VolPanel demandeId={demande.id} /> : null}
            {onglet === "logement" ? <LogementPanel demandeId={demande.id} /> : null}

            {onglet === "documents" ? (
              <PiecesBoard
                demandeId={demande.id}
                canUpload={aLeDroit(droits, "deposer_piece")}
                pieces={demande.offre.pieces.map((piece) => ({
                  id: piece.id,
                  libelle: piece.libelle,
                  obligatoire: piece.obligatoire,
                  typePiece: piece.typePiece,
                  docs: demande.documents
                    .filter((d) => d.idPieceRequise === piece.id)
                    .map((d) => ({ id: d.id, nom: d.nom, statut: d.statut })),
                }))}
              />
            ) : null}

            {onglet === "paiement" && finance ? (
              <PaiementBoard
                demandeId={demande.id}
                reference={demande.reference}
                iban={ibanPlateforme()}
                attendu={finance.montantAttendu}
                recu={finance.montantRecu}
                statutFonds={finance.statutFonds}
                tarif={finance.demande.tarif}
                operations={finance.operations}
                pieces={finance.demande.piecesComptables}
                remboursements={finance.demande.remboursements}
                canPay={aLeDroit(droits, "payer")}
                moyens={etatMoyensPaiement()}
                payRetour={pay}
              />
            ) : null}

            {onglet === "messages" ? (
              <Thread
                selfId={session.id}
                messages={(demande.conversation?.messages ?? []).map((m) => ({
                  id: m.id,
                  contenu: m.contenu,
                  createdAt: m.createdAt,
                  idAuteur: m.idAuteur,
                  auteurNom: m.auteur.profil?.prenom ?? m.auteur.email,
                }))}
                composer={aLeDroit(droits, "repondre") ? <MessageBox demandeId={demande.id} /> : null}
              />
            ) : null}
          </div>

          <aside className="workspace-rail">
            <ChecklistRail items={demande.checklist} />
            {aLeDroit(droits, "consulter") ? (
              <SupportRail
                demandeId={demande.id}
                peutAbandonner={
                  session.typeCompte === "candidat" &&
                  (demande.statut === "brouillon" || demande.statut === "en_traitement")
                }
              />
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
