import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileCheck,
  Home,
  Mail,
  MapPin,
  Phone,
  Plane,
  Shield,
  Wallet,
} from "lucide-react";
import { Mark } from "./Surface";
import { PaysListe } from "./Pays";
import { SiteHeader } from "./SiteHeader";
import { RevealOnScroll, VitrineStage } from "./VitrineStage";
import { VitrineWorld } from "./VitrineWorld";
import { SCENES } from "@/lib/scenes";
import { coordonneesPubliques } from "@/lib/coordonnees";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Services" },
  { href: "/#avi", label: "Souscription AVI" },
  { href: "/contact", label: "Contact" },
];

export const SERVICES = [
  {
    slug: "garantie",
    image: "/hcgf/garantie.jpg",
    title: "Garantie & disponibilité financière",
    text: "Des mécanismes adaptés aux exigences du parcours d’études, de mobilité ou d’installation.",
  },
  {
    slug: "courtage",
    image: "/hcgf/courtage.jpg",
    title: "Courtage bancaire",
    text: "Une orientation vers des solutions adaptées au projet et au profil du bénéficiaire.",
  },
  {
    slug: "paiement",
    image: "/hcgf/paiement.jpg",
    title: "Services de paiement",
    text: "Des règlements lisibles, isolés par dossier, pour finaliser chaque démarche sans mélange.",
  },
  {
    slug: "administratif",
    image: "/hcgf/administratif.jpg",
    title: "Accompagnement administratif",
    text: "Structuration et suivi des documents nécessaires au parcours international.",
  },
  {
    slug: "financier",
    image: "/hcgf/financier.jpg",
    title: "Accompagnement financier",
    text: "Préparation des justificatifs et lecture globale du projet, dossier par dossier.",
  },
  {
    slug: "logistique",
    image: "/hcgf/logistique.jpg",
    title: "Accompagnement logistique",
    text: "Un soutien sur les aspects pratiques liés au voyage, à l’arrivée et à l’installation.",
  },
  {
    slug: "hebergement",
    image: "/hcgf/hebergement.jpg",
    title: "Attestation d’hébergement",
    text: "Un dossier isolé, un matching ≤ 40 min, des justificatifs prêts pour le consulat.",
  },
  {
    slug: "assurance",
    image: "/hcgf/assurance.jpg",
    title: "Assurance voyage",
    text: "Couverture du séjour, police rattachée à sa demande, attestation après encaissement.",
  },
  {
    slug: "vol",
    image: "/hcgf/vol.jpg",
    title: "Réservation du billet d’avion",
    text: "Hold / Pay Later, PNR et justificatif « réservation confirmée — billet non émis ».",
  },
];

const DOSSIERS = [
  {
    code: "01",
    rail: "AVI",
    id: "avi",
    title: "AVI / justificatif",
    kicker: "Justificatif financier",
    text: "Formulaire, pièces, signature et QR de vérification — un dossier, une attestation.",
    icon: FileCheck,
    scene: SCENES.AVI,
    href: "/inscription",
  },
  {
    code: "02",
    rail: "Assurance",
    id: "assurance",
    title: "Assurance voyage",
    kicker: "Couverture du séjour",
    text: "Formules, police isolée, attestation après encaissement. Rien n’est mélangé avec l’AVI.",
    icon: Shield,
    scene: SCENES.ASSURANCE,
    href: "/inscription",
  },
  {
    code: "03",
    rail: "Logement",
    id: "hebergement",
    title: "Hébergement",
    kicker: "Attestation de logement",
    text: "Matching ≤ 40 min, bailleur masqué, liste d’attente. Le dossier reste le vôtre.",
    icon: Home,
    scene: SCENES.HEBERGEMENT,
    href: "/inscription",
  },
  {
    code: "04",
    rail: "Vol",
    id: "vol",
    title: "Vol Hold",
    kicker: "Billet d’avion",
    text: "PNR, date limite, justificatif « réservation confirmée — billet non émis ».",
    icon: Plane,
    scene: SCENES.VOL,
    href: "/inscription",
  },
];

const PROMESSES = [
  { icon: Shield, title: "Accompagnement humain", text: "Un contrôleur nommé, du premier échange à la validation." },
  { icon: Wallet, title: "Paiements isolés", text: "Tarif figé, fonds rattachés au dossier, reçu et rapprochement." },
  { icon: Building2, title: "Dossiers structurés", text: "Pièces, messages et historique restent dans leur demande." },
];

function CartesContact() {
  const c = coordonneesPubliques();
  if (!c.email && !c.tel && !c.adresse) {
    return (
      <div className="vz-contact-line">
        <span className="vz-ico">
          <Mail size={20} />
        </span>
        <div>
          <small>Contact</small>
          <strong>HCGF</strong>
          <p>Les coordonnées seront publiées dès qu’elles seront confirmées.</p>
        </div>
      </div>
    );
  }
  return (
    <>
      {c.email ? (
        <a className="vz-contact-line" href={`mailto:${c.email}`}>
          <span className="vz-ico">
            <Mail size={20} />
          </span>
          <div>
            <small>E-mail</small>
            <strong>{c.email}</strong>
          </div>
        </a>
      ) : null}
      {c.tel ? (
        <a className="vz-contact-line" href={c.telHref}>
          <span className="vz-ico">
            <Phone size={20} />
          </span>
          <div>
            <small>Téléphone</small>
            <strong>{c.tel}</strong>
          </div>
        </a>
      ) : null}
      {c.adresse ? (
        <div className="vz-contact-line">
          <span className="vz-ico">
            <MapPin size={20} />
          </span>
          <div>
            <small>Adresse</small>
            <strong>{c.adresse}</strong>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CoordonneesContact() {
  const c = coordonneesPubliques();
  if (!c.email && !c.tel && !c.adresse) {
    return <p>Les coordonnées seront publiées dès qu’elles seront confirmées.</p>;
  }
  return (
    <>
      {c.email ? (
        <p>
          <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>
      ) : null}
      {c.tel ? (
        <p>
          <a href={c.telHref}>{c.tel}</a>
        </p>
      ) : null}
      {c.adresse ? <p>{c.adresse}</p> : null}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="vz-footer">
      <div className="vz-shell vz-footer-top">
        <div>
          <Mark light />
          <p className="vz-footer-lead">
            Horizon Caution & Garantie Financière — l’accompagnement des étudiants internationaux et de leurs familles.
            Un espace, tous les dossiers.
          </p>
        </div>
        <div>
          <p className="vz-foot-title">Navigation</p>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="vz-foot-title">Contact</p>
          <CoordonneesContact />
        </div>
      </div>
      <div className="vz-shell vz-legal">
        <span>© 2026 Horizon Caution & Garantie Financière. Tous droits réservés.</span>
        <span className="flex gap-4">
          <Link href="/cgv">Mentions légales</Link>
          <Link href="/cgv">Confidentialité</Link>
        </span>
      </div>
    </footer>
  );
}

const HOME_IMAGES = [
  SCENES.PARIS.src,
  SCENES.AVI.src,
  SCENES.ASSURANCE.src,
  SCENES.HEBERGEMENT.src,
  SCENES.VOL.src,
  SCENES.ETUDE.src,
];

export function LandingHome() {
  return (
    <div className="vitrine vz">
      <SiteHeader current="/" />
      <VitrineStage images={HOME_IMAGES}>
        <section className="vz-chapter is-intro" data-rail="Accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="vz-chapter-photo" src={SCENES.PARIS.src} alt={SCENES.PARIS.alt} />
          <div className="vz-chapter-veil" />
          <span className="vz-orbit" aria-hidden />
          <div className="vz-chapter-copy">
            <p className="vz-kicker is-light">Horizon Caution &amp; Garantie Financière</p>
            <h1>
              L’accompagnement des
              <span> étudiants internationaux</span>
            </h1>
            <p className="vz-lead is-light">
              AVI, assurance, hébergement et vol : des dossiers isolés, un contrôleur, un seul espace. Faites défiler
              pour parcourir l’offre, puis ouvrez votre compte.
            </p>
            <div className="vz-actions">
              <a href="#avi" className="btn btn-orange">
                Découvrir l’accompagnement
                <ArrowRight size={16} />
              </a>
              <Link href="/connexion" className="btn btn-ghost-on-blue">
                Connexion
              </Link>
            </div>
            <PaysListe light />
          </div>
        </section>

        {DOSSIERS.map((item, index) => {
          const Icon = item.icon;
          const next = DOSSIERS[index + 1];
          return (
            <section key={item.id} className="vz-chapter" id={item.id} data-rail={item.rail}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="vz-chapter-photo" src={item.scene.src} alt={item.scene.alt} />
              <div className="vz-chapter-veil" />
              <div className="vz-chapter-copy">
                <p className="vz-kicker is-light">{item.kicker}</p>
                <h2>
                  <Icon size={22} />
                  {item.title}
                </h2>
                <p className="vz-lead is-light">{item.text}</p>
                <div className="vz-actions">
                  <a href={next ? `#${next.id}` : "#porte"} className="btn btn-orange">
                    {next ? "Service suivant" : "Ouvrir un espace"}
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </section>
          );
        })}

        <section className="vz-chapter is-enter" id="porte" data-rail="Espace">
          <div className="vz-chapter-veil is-deep" />
          <div className="vz-chapter-copy">
            <p className="vz-kicker is-light">Votre espace</p>
            <h2>
              Ouvrez
              <span> votre dossier.</span>
            </h2>
            <p className="vz-lead is-light">
              Créez un compte pour déposer vos pièces, suivre chaque demande et échanger avec un contrôleur nommé.
            </p>
            <div className="vz-actions">
              <Link href="/inscription" className="btn btn-orange">
                Créer un compte
                <ArrowRight size={16} />
              </Link>
              <Link href="/connexion" className="btn btn-ghost-on-blue">
                Connexion
              </Link>
            </div>
            <ul className="vz-promises">
              {PROMESSES.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title}>
                    <Icon size={18} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="vz-enter-legal">
              <Link href="/services">Services</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/cgv">Mentions</Link>
            </p>
          </div>
        </section>
      </VitrineStage>
    </div>
  );
}

export function ServicesHome() {
  return (
    <div className="vitrine vz vz-page">
      <VitrineWorld mode="ambience" />
      <SiteHeader current="/services" />
      <RevealOnScroll>
        <main>
          <section className="vz-pagehead">
            <div className="vz-shell">
              <p className="vz-crumb">Accueil / Services</p>
              <p className="vz-kicker">Offre</p>
              <h1>
                Neuf services,
                <span> un seul espace.</span>
              </h1>
              <p className="vz-lead is-light">
                Garantie, courtage, paiement, administratif, financier, logistique, hébergement, assurance et vol —
                chaque demande reste isolée.
              </p>
            </div>
          </section>
          <section className="vz-catalog">
            <div className="vz-shell">
              <ul>
                {SERVICES.map((s, i) => (
                  <li key={s.slug} className="vz-reveal">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt={s.title} />
                    <div>
                      <small>{String(i + 1).padStart(2, "0")}</small>
                      <h2>{s.title}</h2>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="vz-doorband vz-reveal">
            <div className="vz-shell">
              <p className="vz-kicker">Espace client</p>
              <h2>
                Prêt à ouvrir
                <span> votre dossier ?</span>
              </h2>
              <div className="vz-actions">
                <Link href="/inscription" className="btn btn-orange">
                  Créer un compte
                  <ArrowRight size={16} />
                </Link>
                <Link href="/connexion" className="btn btn-ghost-on-blue">
                  Connexion
                </Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </RevealOnScroll>
    </div>
  );
}

export function ContactHome() {
  return (
    <div className="vitrine vz vz-page">
      <VitrineWorld mode="ambience" />
      <SiteHeader current="/contact" />
      <RevealOnScroll>
        <main>
          <section className="vz-contact-hero">
            <div className="vz-contact-visual" aria-hidden />
            <div className="vz-contact-panel vz-reveal">
              <p className="vz-crumb">Accueil / Contact</p>
              <p className="vz-kicker">Écrire à HCGF</p>
              <h1>
                Présentez
                <span> votre projet.</span>
              </h1>
              <p className="vz-lead is-light">
                Un premier échange, puis l’ouverture d’un espace pour constituer le dossier.
              </p>
              <div className="vz-contact-stack">
                <CartesContact />
              </div>
              <div className="vz-actions">
                <Link href="/inscription" className="btn btn-orange">
                  Créer un compte
                  <ArrowRight size={16} />
                </Link>
                <Link href="/connexion" className="btn btn-ghost-on-blue">
                  Connexion
                </Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </RevealOnScroll>
    </div>
  );
}
