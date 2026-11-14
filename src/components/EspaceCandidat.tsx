import Link from "next/link";
import { ArrowRight, Check, FileCheck, Home, Plane, Shield } from "lucide-react";

export const LIBELLES_ETAPE: Record<string, string> = {
  formulaire: "Formulaire",
  contrat: "Contrat",
  documents: "Pièces",
  paiement: "Paiement",
  validation: "Contrôle",
  tarification: "Tarif",
  attestation: "Attestation",
  matching: "Logement",
  signature: "Signature",
  recherche: "Recherche",
  passager: "Passager",
  hold: "Réservation",
  justificatif: "Justificatif",
  billet: "Billet",
  cloture: "Clôture",
};

/** Ce que le candidat doit faire (ou attendre) à l’étape courante. */
const PROCHAINE_ACTION: Record<string, string> = {
  formulaire: "Complétez le formulaire",
  contrat: "Signez votre contrat",
  documents: "Déposez vos pièces justificatives",
  tarification: "Vérifiez votre tarif",
  paiement: "Réglez votre dossier",
  validation: "L’équipe contrôle votre dossier",
  signature: "Signature de votre attestation en cours",
  matching: "Choisissez votre logement",
  recherche: "Choisissez votre vol",
  passager: "Renseignez les passagers",
  hold: "Votre réservation est en cours",
  attestation: "Votre attestation est disponible",
  justificatif: "Votre justificatif est disponible",
  billet: "Votre billet est émis",
  cloture: "Dossier clôturé",
};

const EN_ATTENTE = new Set(["validation", "signature", "hold"]);
const TERMINE = new Set(["attestation", "justificatif", "billet", "cloture"]);

export function prochaineAction(etape: string) {
  return {
    texte: PROCHAINE_ACTION[etape] ?? "Poursuivez votre dossier",
    ton: TERMINE.has(etape) ? ("fini" as const) : EN_ATTENTE.has(etape) ? ("attente" as const) : ("action" as const),
  };
}

/** Frise du parcours : étapes franchies, étape courante, étapes à venir. */
export function EtapesDossier({ etapes, courante }: { etapes: string[]; courante: string }) {
  const position = Math.max(0, etapes.indexOf(courante));
  const fini = TERMINE.has(courante);
  return (
    <ol className="timeline" aria-label="Avancement du dossier">
      {etapes.map((etape, i) => {
        const etat = i < position || (fini && i === position) ? "done" : i === position ? "current" : "todo";
        return (
          <li
            key={etape}
            className={`timeline-step is-${etat}`}
            aria-current={etat === "current" ? "step" : undefined}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="timeline-dot">{etat === "done" ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span className="timeline-label">{LIBELLES_ETAPE[etape] ?? etape}</span>
          </li>
        );
      })}
    </ol>
  );
}

const SERVICES_ACCUEIL = [
  {
    code: "AVI",
    titre: "Attestation de virement (AVI)",
    texte: "Le justificatif financier demandé pour votre visa étudiant.",
    image: "/hcgf/financier.jpg",
    Icone: FileCheck,
  },
  {
    code: "ASSURANCE",
    titre: "Assurance voyage",
    texte: "Une couverture santé conforme pour tout votre séjour.",
    image: "/hcgf/assurance.jpg",
    Icone: Shield,
  },
  {
    code: "HEBERGEMENT",
    titre: "Attestation d’hébergement",
    texte: "Un logement à moins de 40 minutes de votre établissement.",
    image: "/hcgf/hebergement.jpg",
    Icone: Home,
  },
  {
    code: "VOL",
    titre: "Réservation de vol",
    texte: "Votre place réservée, sans payer le billet tout de suite.",
    image: "/hcgf/vol.jpg",
    Icone: Plane,
  },
];

/** Premier contact d’un candidat sans dossier : choisir directement un service. */
export function BienvenueCandidat() {
  return (
    <section className="welcome mt-6">
      <h2 className="welcome-title">Que souhaitez-vous préparer ?</h2>
      <ul className="welcome-grid">
        {SERVICES_ACCUEIL.map(({ code, titre, texte, image, Icone }, i) => (
          <li key={code} style={{ animationDelay: `${80 + i * 70}ms` }}>
            <Link href={`/demandes/nouvelle?service=${code}`} className="welcome-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" loading="lazy" />
              <span className="welcome-card-body">
                <span className="welcome-icon">
                  <Icone size={18} />
                </span>
                <strong>{titre}</strong>
                <small>{texte}</small>
                <span className="welcome-go">
                  Commencer <ArrowRight size={15} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ol className="howto">
        <li>
          <span>1</span>
          <div>
            <strong>Choisissez un service et un pays</strong>
            <small>Le formulaire s’adapte à votre destination.</small>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Déposez vos pièces et réglez</strong>
            <small>Chaque dossier a son propre espace sécurisé.</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Recevez votre document</strong>
            <small>Vérifiable en ligne par les autorités.</small>
          </div>
        </li>
      </ol>
    </section>
  );
}
