"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { terminerIntro } from "@/lib/actions";
import { Drapeau } from "@/components/Pays";

const DUREE = 7800;

const ETAPES = [
  {
    image: "/intro/compte.png",
    alt: "Étudiante souriante ouvrant son espace sur un ordinateur, passeport posé à côté",
    kicker: "Votre espace",
    titre: "Un compte.\nTous vos dossiers.",
    texte:
      "AVI, assurance, logement et vol restent au même endroit. Vous ouvrez un espace une seule fois, vous quittez, vous reprenez exactement là où vous étiez.",
    jetons: ["AVI", "Assurance", "Logement", "Vol"],
  },
  {
    image: "/intro/pays.png",
    alt: "Étudiant choisissant un pays d’études sur une tablette, drapeaux devant lui",
    kicker: "Le bon parcours",
    titre: "Choisissez le pays.\nLe dossier s’adapte.",
    texte:
      "France, Allemagne, Belgique ou Canada : le formulaire, les pièces et les règles changent selon le service et la destination. Rien à recréer.",
    drapeaux: ["FR", "DE", "BE", "CA"],
  },
  {
    image: "/intro/documents.png",
    alt: "Étudiante qui dépose ses pièces : téléphone, passeport et formulaires",
    kicker: "Votre dossier",
    titre: "Remplissez.\nDéposez. Reprenez.",
    texte:
      "Identité, justificatifs, photos : chaque pièce a sa place. La sauvegarde est automatique. Vous pouvez partir et revenir plus tard.",
    jetons: ["Passeport", "Justificatifs", "Photos"],
  },
  {
    image: "/intro/equipe.png",
    alt: "Contrôleur qui vérifie un dossier sur son écran",
    kicker: "L’équipe AVI",
    titre: "On vérifie.\nOn signe.\nOn vous prévient.",
    texte:
      "Un contrôleur contrôle chaque pièce. Un administrateur valide. Vous recevez un message à chaque étape, sans relancer personne.",
    jetons: ["Contrôle", "Signature", "Notifications"],
  },
  {
    image: "/intro/attestation.png",
    alt: "Étudiant heureux montrant son attestation validée sur une tablette",
    kicker: "Le départ",
    titre: "Votre attestation\nest prête.",
    texte:
      "Le dossier signé se télécharge. Un lien public permet de le vérifier. Vous partez avec un document clair, pas une copie floue.",
    jetons: ["Télécharger", "Vérifier"],
  },
];

export function IntroOnboarding() {
  const params = useSearchParams();
  const suite = params.get("suite") === "inscription" ? "/inscription" : "/connexion";
  const [, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  const [sens, setSens] = useState(1);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const etape = ETAPES[index];
  const dernier = index === ETAPES.length - 1;

  const aller = useCallback((cible: number, direction = 1) => {
    const suivant = Math.max(0, Math.min(ETAPES.length - 1, cible));
    if (suivant === index) return;
    setSens(direction);
    setIndex(suivant);
  }, [index]);

  const terminer = useCallback(
    (vers = suite) => {
      startTransition(() => {
        void terminerIntro(vers);
      });
    },
    [suite],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (prefersReduced || dernier) return;
    const id = window.setTimeout(() => aller(index + 1, 1), DUREE);
    return () => window.clearTimeout(id);
  }, [aller, dernier, index, prefersReduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (dernier) terminer();
        else aller(index + 1, 1);
      }
      if (e.key === "ArrowLeft") aller(index - 1, -1);
      if (e.key === "Escape") terminer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aller, dernier, index, terminer]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!swipe.current) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      if (dernier) terminer();
      else aller(index + 1, 1);
    } else {
      aller(index - 1, -1);
    }
  };

  return (
    <section
      className="intro"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="intro-mesh" aria-hidden />
      <span className="intro-orb intro-orb-a" aria-hidden />
      <span className="intro-orb intro-orb-b" aria-hidden />
      <span className="intro-orb intro-orb-c" aria-hidden />

      <header className="intro-top">
        <p className="intro-brand">AVI</p>
        <div className="intro-steps" aria-hidden>
          {ETAPES.map((_, i) => (
            <span key={i} className={i <= index ? "on" : undefined} />
          ))}
        </div>
        <button type="button" className="intro-skip" onClick={() => terminer()}>
          Passer
        </button>
      </header>

      <div className="intro-stage" data-sens={sens}>
        <div key={`copy-${index}`} className="intro-copy">
          <p className="intro-num">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i />
            <span>{String(ETAPES.length).padStart(2, "0")}</span>
          </p>
          <p className="kicker">{etape.kicker}</p>
          <h1 className="intro-title">
            {etape.titre.split("\n").map((ligne) => (
              <span key={ligne}>{ligne}</span>
            ))}
          </h1>
          <p className="intro-text">{etape.texte}</p>

          {etape.drapeaux ? (
            <ul className="intro-chips">
              {etape.drapeaux.map((code) => (
                <li key={code} className="intro-chip">
                  <Drapeau code={code} />
                  {code === "FR" ? "France" : code === "DE" ? "Allemagne" : code === "BE" ? "Belgique" : "Canada"}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="intro-chips">
              {etape.jetons?.map((jeton) => (
                <li key={jeton} className="intro-chip">
                  {jeton}
                </li>
              ))}
            </ul>
          )}

          {dernier ? (
            <div className="intro-cta">
              <button type="button" className="btn btn-primary" onClick={() => terminer("/inscription")}>
                Créer un compte
                <ArrowRight size={16} />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => terminer("/connexion")}>
                J’ai un compte
              </button>
            </div>
          ) : null}
        </div>

        <figure key={`photo-${index}`} className="intro-photo">
          <span className="intro-ring" aria-hidden />
          <span className="intro-ring intro-ring-2" aria-hidden />
          <div className="intro-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={etape.image} alt={etape.alt} />
          </div>
          <figcaption className="intro-caption">{etape.kicker}</figcaption>
        </figure>
      </div>

      <footer className="intro-nav">
        <button
          type="button"
          className="intro-arrow"
          aria-label="Étape précédente"
          disabled={index === 0}
          onClick={() => aller(index - 1, -1)}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="intro-dots">
          {ETAPES.map((s, i) => (
            <button
              key={s.kicker}
              type="button"
              aria-label={`Aller à ${s.kicker}`}
              aria-current={i === index ? true : undefined}
              onClick={() => aller(i, i > index ? 1 : -1)}
            />
          ))}
        </div>

        <button
          type="button"
          className="intro-arrow intro-arrow-next"
          aria-label={dernier ? "Aller à la connexion" : "Étape suivante"}
          onClick={() => (dernier ? terminer() : aller(index + 1, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </footer>

      {!prefersReduced && !dernier ? (
        <div className="intro-auto" aria-hidden>
          <span key={index} />
        </div>
      ) : null}
    </section>
  );
}
