"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sauvegarderReponses } from "@/lib/actions";
import { pushToast } from "@/components/Feedback";

function champVisible(champ: Champ, valeurs: Record<string, string>) {
  if (!champ.conditionChamp) return true;
  if (champ.conditionOp === "eq") {
    return (valeurs[champ.conditionChamp] ?? "") === (champ.conditionValeur ?? "");
  }
  return true;
}

type Champ = {
  id: string;
  code: string;
  typeSaisie: string;
  obligatoire: boolean;
  libelle: string;
  aide: string | null;
  options: string[];
  conditionChamp: string | null;
  conditionOp: string | null;
  conditionValeur: string | null;
};

const BLOCS: { id: string; titre: string; texte: string; codes: string[] }[] = [
  {
    id: "identite",
    titre: "Identité",
    texte: "Repris de votre compte. Corrigez seulement si besoin.",
    codes: ["nom", "prenom", "date_naissance", "telephone", "email", "adresse"],
  },
  {
    id: "etudes",
    titre: "Études",
    texte: "Ces informations déterminent les pièces et le montant.",
    codes: ["etablissement", "date_rentree", "duree_mois", "montant_avi", "a_admission", "reference_admission"],
  },
  {
    id: "sejour",
    titre: "Séjour",
    texte: "Période couverte par l’assurance.",
    codes: ["date_debut", "date_fin", "formule"],
  },
  {
    id: "trajet",
    titre: "Trajet",
    texte: "Pour proposer un Hold adapté à vos dates.",
    codes: ["aeroport_depart", "aeroport_arrivee", "date_depart", "date_retour"],
  },
];

export function FormulaireDynamique({
  demandeId,
  champs,
  valeursInitiales,
  avancementInitial,
}: {
  demandeId: string;
  champs: Champ[];
  valeursInitiales: Record<string, string>;
  avancementInitial: number;
}) {
  const [valeurs, setValeurs] = useState(valeursInitiales);
  const [avancement, setAvancement] = useState(avancementInitial);
  const [etat, setEtat] = useState("Sauvegarde prête");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibles = useMemo(
    () => champs.filter((c) => champVisible(c, valeurs)),
    [champs, valeurs],
  );

  const groupes = useMemo(() => {
    const pris = new Set<string>();
    const liste = BLOCS.map((bloc) => ({
      ...bloc,
      champs: visibles.filter((c) => bloc.codes.includes(c.code)),
    })).filter((bloc) => {
      bloc.champs.forEach((c) => pris.add(c.id));
      return bloc.champs.length > 0;
    });
    const reste = visibles.filter((c) => !pris.has(c.id));
    if (reste.length) {
      liste.push({
        id: "autres",
        titre: "Complément",
        texte: "Informations propres à ce dossier.",
        codes: [],
        champs: reste,
      });
    }
    return liste;
  }, [visibles]);

  function update(code: string, valeur: string) {
    const next = { ...valeurs, [code]: valeur };
    setValeurs(next);
    setEtat("Non enregistré");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEtat("Sauvegarde…");
      const result = await sauvegarderReponses(demandeId, next);
      if (result.error) setEtat(result.error);
      else {
        setAvancement(result.avancement ?? avancement);
        setEtat("Enregistré");
        if ("fraudeDetectee" in result && result.fraudeDetectee) {
          pushToast("Signal fraude : identité incohérente — dossier en contrôle renforcé", "hot");
        }
      }
    }, 700);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <section className="form-desk card">
      <header className="form-desk-head">
        <div>
          <p className="kicker">Saisie automatique</p>
          <h2 className="form-desk-title">Votre dossier</h2>
        </div>
        <div className="form-desk-save">
          <span className={`pill ${etat === "Enregistré" ? "pill-ok" : etat === "Non enregistré" ? "pill-hot" : ""}`}>
            {etat}
          </span>
          <div className="form-desk-bar">
            <div className="progress">
              <span style={{ width: `${avancement}%` }} />
            </div>
            <span>{avancement}%</span>
          </div>
        </div>
      </header>

      {groupes.map((bloc) => (
        <fieldset key={bloc.id} className="form-bloc">
          <legend>
            <span>{bloc.titre}</span>
            {bloc.texte ? <small>{bloc.texte}</small> : null}
          </legend>
          <div className="form-grid">
            {bloc.champs.map((champ) => {
              const large = champ.code === "adresse" || champ.code === "etablissement" || champ.code === "reference_admission";
              return (
                <label key={champ.id} className={`field${large ? " is-wide" : ""}`}>
                  {champ.libelle}
                  {champ.obligatoire ? <em> *</em> : null}
                  {champ.typeSaisie === "select" ? (
                    <select
                      className="input"
                      value={valeurs[champ.code] ?? ""}
                      onChange={(e) => update(champ.code, e.target.value)}
                    >
                      <option value="">Sélectionner</option>
                      {champ.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={champ.typeSaisie === "number" ? "number" : champ.typeSaisie}
                      value={valeurs[champ.code] ?? ""}
                      onChange={(e) => update(champ.code, e.target.value)}
                    />
                  )}
                  {champ.aide ? <span className="field-help">{champ.aide}</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <p className="form-desk-note">Enregistrement automatique. Vous pouvez quitter et reprendre.</p>
    </section>
  );
}
