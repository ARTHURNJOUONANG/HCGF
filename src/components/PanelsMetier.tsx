import { CheckCircle2, Clock, Home, Plane, Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { euros, jour } from "@/lib/finance";
import { assurerCatalogueAssurance, libelleStatutVol } from "@/lib/catalogues";
import { rechercherOffresVol, modeVol } from "@/lib/duffel";
import { suggestionsTrajetsVol } from "@/lib/aeroports";
import { reponsesVersMap } from "@/lib/metier";
import {
  AttestationAssuranceBtn,
  ChoisirLogementBtn,
  HoldBtn,
  JustificatifVolBtn,
  ListeAttenteBtn,
  MatchingBtn,
  PayerBilletBtn,
  SouscrireFormule,
  VenteCroiseeAvi,
} from "@/components/LotServices";

function dateFr(valeur?: string) {
  if (!valeur) return "—";
  const [y, m, d] = valeur.split("-");
  return d && m && y ? `${d}/${m}/${y}` : valeur;
}

export function BanniereCroisee({ demandeId, service }: { demandeId: string; service: string }) {
  if (service !== "AVI") return null;
  return (
    <aside className="cross-sell card">
      <div>
        <p className="kicker kicker-caution">Assurance</p>
        <h2>Ajouter une couverture voyage</h2>
        <p className="muted">Identité et dates reprises. Le dossier assurance reste isolé.</p>
      </div>
      <VenteCroiseeAvi demandeId={demandeId} />
    </aside>
  );
}

export async function AssurancePanel({ demandeId }: { demandeId: string }) {
  await assurerCatalogueAssurance();
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      reponses: { include: { champ: true } },
      police: { include: { formule: { include: { garanties: { include: { garantie: true } } } } } },
      espaceFinancier: true,
      origine: true,
    },
  });
  const formules = await prisma.formuleAssurance.findMany({
    where: { active: true },
    include: { garanties: { include: { garantie: true } } },
    orderBy: { supplement: "asc" },
  });
  if (!demande) return null;
  const map = reponsesVersMap(demande.reponses);
  const supplementActuel = demande.police?.formule.supplement ?? 0;
  const baseBareme = (demande.espaceFinancier?.montantAttendu ?? 9800) - supplementActuel;
  const { modeAssureur } = await import("@/lib/assureur");
  const mode = modeAssureur();
  const fondsOk = demande.espaceFinancier?.statutFonds === "fonds_recus";

  return (
    <section className="offer-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Couverture</p>
          <h2 className="form-desk-title">Assurance voyage</h2>
          <p className="muted mt-2 text-sm">
            Séjour {dateFr(map.date_debut)} → {dateFr(map.date_fin)}
            {demande.origine ? ` · Prérempli depuis ${demande.origine.reference}` : ""}
          </p>
          <p className="muted mt-1 text-sm">
            Formulaire → formule → paiement → attestation.
            {mode === "api" ? (
              <span className="pill pill-ok ml-2">Assureur API</span>
            ) : (
              <span className="pill ml-2">Mode démo — branchez ASSUREUR_API_*</span>
            )}
          </p>
        </div>
        <span className="rail-ico" aria-hidden>
          <Shield size={16} />
        </span>
      </header>

      {demande.police ? (
        <article className="status-card card" data-state="ok">
          <div className="status-card-top">
            <span className="piece-ico">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <p className="kicker">Police {demande.police.statut}</p>
              <h3 className="piece-name">{demande.police.formule.libelle}</h3>
              <p className="muted mt-1 text-sm">
                {dateFr(demande.police.dateDebut)} → {dateFr(demande.police.dateFin)}
                {demande.police.idExterne ? ` · ${demande.police.idExterne}` : ""}
              </p>
              <p className="muted mt-1 text-sm">
                Montant dossier : {euros(demande.espaceFinancier?.montantAttendu ?? baseBareme + demande.police.formule.supplement)}
                {!fondsOk ? " · paiement en attente" : " · fonds reçus"}
              </p>
            </div>
          </div>
          {demande.police.storagePath ? (
            <a className="link-blue mt-4 inline-block" href={`/api/police/${demande.id}`}>
              Télécharger l’attestation
            </a>
          ) : fondsOk ? (
            <AttestationAssuranceBtn demandeId={demandeId} />
          ) : (
            <p className="muted mt-4 text-sm">
              Après le paiement (onglet Paiement), vous pourrez émettre l’attestation.
            </p>
          )}
        </article>
      ) : (
        <p className="muted text-sm">
          Renseignez les dates du séjour dans le formulaire, puis choisissez une formule ci-dessous.
        </p>
      )}

      <div className="offer-grid">
        {formules.map((f) => {
          const retenue = demande.police?.idFormule === f.id;
          return (
            <article key={f.id} className="offer-card card" data-on={String(retenue)}>
              <p className="kicker">{f.code}</p>
              <h3>{f.libelle}</h3>
              <p className="offer-price">{euros(baseBareme + f.supplement)}</p>
              <p className="muted text-sm">{f.description}</p>
              <ul className="offer-points">
                {f.garanties.map((g) => (
                  <li key={g.idGarantie}>
                    {g.garantie.libelle}
                    <span>{g.garantie.plafond}</span>
                  </li>
                ))}
              </ul>
              {retenue ? (
                <p className="pill pill-ok mt-4">Formule retenue</p>
              ) : (
                <SouscrireFormule demandeId={demandeId} formule={f.code} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export async function VolPanel({ demandeId }: { demandeId: string }) {
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: { reponses: { include: { champ: true } }, reservationsVol: { include: { segments: true, justificatif: true } } },
  });
  if (!demande) return null;
  const map = reponsesVersMap(demande.reponses);
  const offres = await rechercherOffresVol({
    origin: map.aeroport_depart || "",
    destination: map.aeroport_arrivee || "",
    date: map.date_depart,
    dateRetour: map.date_retour,
    idDemande: demande.id,
  });
  const liste = offres;
  const mode = modeVol();

  return (
    <section className="offer-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Recherche Hold</p>
          <h2 className="form-desk-title">Vol</h2>
          <p className="muted mt-2 text-sm">
            {map.aeroport_depart && map.aeroport_arrivee
              ? `${map.aeroport_depart} → ${map.aeroport_arrivee}${map.date_depart ? ` · ${dateFr(map.date_depart)}` : ""}${map.date_retour ? ` · retour ${dateFr(map.date_retour)}` : ""}`
              : "Renseignez le trajet dans le formulaire pour lancer une recherche."}
          </p>
          <p className="muted mt-1 text-sm">
            Liaisons Afrique ↔ France, Allemagne, Belgique, Canada (Air France, Brussels Airlines,
            Lufthansa, Air Canada, Ethiopian, Royal Air Maroc…).
            {mode === "duffel" ? (
              <span className="pill pill-ok ml-2">Duffel live</span>
            ) : (
              <span className="pill ml-2">Catalogue démo</span>
            )}
          </p>
          {!map.aeroport_depart || !map.aeroport_arrivee ? (
            <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
              {suggestionsTrajetsVol()
                .slice(0, 8)
                .map((s) => (
                  <li key={s.label} className="rounded border border-[var(--line)] px-2 py-1">
                    {s.label} ({s.from}→{s.to})
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
        <span className="rail-ico" aria-hidden>
          <Plane size={16} />
        </span>
      </header>

      {demande.reservationsVol.map((r) => (
        <article key={r.id} className="status-card card" data-state={r.statut === "TICKETED" ? "ok" : "hold"}>
          <div className="status-card-top">
            <span className="piece-ico">
              <Clock size={18} />
            </span>
            <div>
              <p className="kicker">{libelleStatutVol(r.statut)}</p>
              <h3 className="piece-name">PNR {r.bookingReference || "—"}</h3>
              <p className="muted mt-1 text-sm">
                {r.airlineName} · {r.provider} · {euros(r.totalAmount)}
                {r.paymentRequiredBy && r.statut !== "TICKETED"
                  ? ` · limite ${r.paymentRequiredBy.toLocaleString("fr-FR", { timeZone: r.timezone })}`
                  : ""}
              </p>
              {r.statut === "TICKETED" ? (
                <p className="mt-1 text-sm font-medium text-[var(--ink)]">Billet émis</p>
              ) : (
                <p className="hold-warn">Réservation confirmée – billet non émis</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.statut === "HELD" || r.statut === "EXPIRING_SOON" ? (
              <PayerBilletBtn reservationId={r.id} />
            ) : null}
            {r.justificatif ? (
              <a className="link-blue inline-block self-center" href={`/api/justificatif-vol/${r.id}`}>
                {r.justificatif.nom}
              </a>
            ) : r.statut === "HELD" || r.statut === "EXPIRING_SOON" ? (
              <JustificatifVolBtn reservationId={r.id} />
            ) : null}
          </div>
        </article>
      ))}

      {liste.length === 0 ? (
        <p className="muted text-sm">
          Aucune offre pour ce trajet. Indiquez des codes IATA (ex. CDG → FRA) ou une ville reconnue
          (Paris, Lyon, Berlin…).
        </p>
      ) : null}
      <ul className="flight-list">
        {liste.map((o) => (
          <li key={o.code} className="flight-row card">
            <div className="flight-route">
              <div>
                <strong>{o.from}</strong>
                <span>{o.depart}</span>
              </div>
              <i />
              <div>
                <strong>{o.to}</strong>
                <span>{o.arrivee}</span>
              </div>
            </div>
            <div className="flight-meta">
              <p className="flight-cities">
                {o.fromNom} → {o.toNom}
                {o.retourDepart ? ` · retour ${o.retourDepart}` : ""}
              </p>
              <p className="muted text-sm">
                {o.airline} · {euros(o.prix)}
                {o.code.startsWith("off_") ? " · live" : " · démo"}
              </p>
              <span className={`pill ${o.hold ? "pill-ok" : "pill-hot"}`}>
                {o.hold ? `Hold ${o.garantieHeures} h` : "Paiement immédiat"}
              </span>
            </div>
            {o.hold ? <HoldBtn demandeId={demandeId} offreCode={o.code} /> : <p className="muted text-sm">Hold interdit</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function LogementPanel({ demandeId }: { demandeId: string }) {
  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      etablissement: { include: { matchings: { include: { logement: { include: { bailleur: true } } }, orderBy: { dureeTransportMin: "asc" } } } },
      affectation: { include: { logement: true } },
      listeAttente: true,
    },
  });
  if (!demande) return null;
  const matchings = demande.etablissement?.matchings ?? [];
  const compatibles = matchings.filter((m) => m.statut === "COMPATIBLE" && m.logement.statut === "disponible");
  const exclus = matchings.filter((m) => m.statut !== "COMPATIBLE");

  return (
    <section className="offer-desk">
      <header className="piece-desk-head card">
        <div>
          <p className="kicker">Matching ≤ 40 min</p>
          <h2 className="form-desk-title">Logement</h2>
          <p className="muted mt-2 text-sm">
            Seul le temps en transports compte. La voiture est indicative.
          </p>
          {demande.etablissement ? (
            <p className="mt-2 text-sm">
              {demande.etablissement.nom} · {demande.etablissement.ville}
            </p>
          ) : (
            <p className="muted mt-2 text-sm">Indiquez l’établissement dans le formulaire, puis lancez le calcul.</p>
          )}
        </div>
        <MatchingBtn demandeId={demandeId} />
      </header>

      {demande.affectation ? (
        <article className="status-card card" data-state="ok">
          <div className="status-card-top">
            <span className="piece-ico">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <p className="kicker">Logement choisi</p>
              <h3 className="piece-name">{demande.affectation.logement.titre}</h3>
              <p className="muted mt-1 text-sm">{demande.affectation.logement.adresse}</p>
            </div>
          </div>
        </article>
      ) : null}

      {compatibles.length > 0 ? (
        <ul className="home-list">
          {compatibles.map((m) => (
            <li key={m.id} className="home-card card">
              <span className="rail-pct">{m.dureeTransportMin}<small> min</small></span>
              <div className="min-w-0 flex-1">
                <h3 className="piece-name">{m.logement.titre}</h3>
                <p className="muted mt-1 text-sm">{m.logement.adresse}</p>
                <p className="muted mt-2 text-xs">
                  Transports {m.dureeTransportMin} min · voiture {m.dureeVoitureMin} min (indicatif)
                </p>
                <p className="muted mt-1 text-xs">Coordonnées bailleur masquées tant que le logement n’est pas attribué.</p>
                <ChoisirLogementBtn demandeId={demandeId} idLogement={m.idLogement} />
              </div>
            </li>
          ))}
        </ul>
      ) : demande.etablissement ? (
        <section className="status-card card" data-state="wait">
          <p className="hold-warn">Aucun logement compatible. Recherche en cours.</p>
          {demande.listeAttente ? (
            <p className="muted mt-2 text-sm">
              Liste d’attente depuis {jour(demande.listeAttente.dateInscription)}.
            </p>
          ) : (
            <ListeAttenteBtn demandeId={demandeId} />
          )}
        </section>
      ) : null}

      {exclus.length > 0 ? (
        <details className="offer-fold">
          <summary>Hors critère ({exclus.length})</summary>
          <ul>
            {exclus.map((m) => (
              <li key={m.id}>
                {m.logement.titre} · {m.dureeTransportMin} min · {m.statut.replace("_", " ")}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
