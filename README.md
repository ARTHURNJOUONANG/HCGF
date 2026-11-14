# Plateforme AVI — LOT 1 à 8 + 3B + LOT 9

Application web du cahier des charges V9.

## LOT 1 — Espace candidat

- compte unique et multi-demandes
- tableau de bord candidat
- nouvelle demande (service + pays)
- formulaires dynamiques, préremplissage, sauvegarde automatique
- checklist et barre de progression

## LOT 2 — Documents et traitement

- espace documentaire isolé par dossier
- dépôt PDF / image, contrôle back-office
- messagerie du dossier
- notifications
- tâches internes
- journal d’audit
- signature back-office + mise à disposition immédiate
- page publique de vérification (`/verifier/{token}`)

## LOT 3 — Assurance voyage + vente croisée

- formules Essentielle / Confort / Premium et garanties
- police rattachée à **sa** demande (FR, DE, BE, CA)
- prix = barème + supplément formule
- attestation HTML après encaissement (mode démo ou API assureur)
- depuis un dossier AVI : préremplissage identité + dates
- `ASSUREUR_API_URL` + `ASSUREUR_API_KEY` pour brancher un partenaire

## LOT 3B — Vol Hold

- recherche d’offres (Duffel live si `DUFFEL_API_KEY`, sinon catalogue démo)
- codes IATA / villes Afrique ↔ FR / DE / BE / CA
- aller-retour optionnel (`date_retour`)
- Hold avec passagers ; interdit si paiement immédiat
- **Payer et émettre le billet** (balance Duffel en test) → statut `TICKETED`
- justificatif « Réservation confirmée – billet non émis »
- page **Mes réservations de vol** (`/vols`)
- idempotence : un seul Hold par offre / dossier

```bash
# .env — clé test Duffel (https://app.duffel.com)
DUFFEL_API_KEY=duffel_test_...
DUFFEL_VERSION=v2
```

## LOT 4 — Finance

- barème versionné et tarif figé à l’ouverture du dossier
- espace financier isolé (attendu / reçu / frais)
- paiement carte simulé, virement + rapprochement
- reçus HTML, remboursements, file `/bureau/finance`
- la signature attend que les fonds soient reçus

## LOT 5 — Partenaires et commissions

- agence / école / apporteur, dossiers isolés
- initiation d’un dossier + notification « COMPLÉTER MON DOSSIER »
- statuts partenaires : DRAFT / IN_PROGRESS / VALID / CLOSED / CANCELLED
- commission calculée → acquise à la signature → payée
- espaces `/partenaire` et `/bureau/partenaires`

## LOT 6 — Délégation et CGV

- documents contractuels versionnés (`/cgv`)
- acceptation enregistrée (version exacte, preuve)
- délégation révocable, droits limités
- signature / identité / suppression **non déléguables**
- espaces `/delegations` et `/delegue`

## LOT 7 — Hébergement

- matching sur le **temps en transports ≤ 40 min** (voiture informative)
- choix de logement, coordonnées bailleur masquées
- liste d’attente s’il n’y a aucun compatible

## LOT 8 — Relances et exploitation

- SLA Standard / Prioritaire / Urgent
- relances J+2, J+5, J+7 puis tâche à J+10
- échéances et réclamations SAV
- file `/bureau/exploitation`

## LOT 9 — Fraude et contrôle renforcé

- signaux backend : pièce partagée (hash, bilatéral), identité instable, paiement incohérent
- alerte → **contrôle renforcé** (signature bloquée), jamais de rejet auto
- lien document optionnel, notification équipe, tâches, audit
- balayage cron via maintenance ; analyse manuelle dossier
- file `/bureau/fraude` : confirmer, lever, filtres

## Démarrer (développement, SQLite)

```bash
npm install            # génère aussi le client Prisma (postinstall)
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed     # catalogue + comptes démo (SQLite uniquement par défaut)
npm run dev
```

Ouvrir http://localhost:3000 — le code PD de l’équipe est écrit dans `prisma/code-acces-pd.txt`.

Mot de passe démo : `Demo2026!`

| Rôle | E-mail |
|---|---|
| Candidat | `candidat.demo@avi.test` |
| Contrôleur | `conseiller.demo@avi.test` |
| Administrateur | `signataire.demo@avi.test` |
| Partenaire | `partenaire.demo@avi.test` |
| Délégataire | `delegue.demo@avi.test` (délégation active du candidat démo) |

Docker (Postgres 16) : `npm run docker:up` puis http://localhost:3010.

## Qualité

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | Types Next + TypeScript (le build échoue aussi sur une erreur de type) |
| `npm test` | Vitest sur une base SQLite dédiée (`prisma/test.db`) |
| `npm run build` | Build de production |

La CI GitHub (`.github/workflows/ci.yml`) enchaîne ces étapes et vérifie les migrations Postgres sur une base vide.

## Base de données

- **SQLite (dev)** : `prisma/schema.prisma`, migrations dans `prisma/migrations`.
- **PostgreSQL (prod)** : schéma dérivé dans `prisma/postgres/schema.prisma` (généré), migrations versionnées dans `prisma/postgres/migrations`.

Après une modification de `prisma/schema.prisma` :

```bash
npx prisma migrate dev --name ma_modif                                  # SQLite
SHADOW_DATABASE_URL=postgresql://…/shadow npm run db:migration:pg -- ma_modif   # Postgres
```

Appliquer en production : `npm run db:migrate:pg` (ou `npm run db:prod` avec `.env.vercel`).
Une base créée autrefois par `db push` est rattachée automatiquement à la migration `0_init`
si, et seulement si, elle correspond exactement au schéma ; sinon le script s’arrête sans rien modifier.
`--accept-data-loss` n’est plus utilisé.

## Production — variables obligatoires

| Variable | Pourquoi |
|---|---|
| `AUTH_SECRET` | 32 caractères minimum, jamais une valeur d’exemple (`openssl rand -hex 32`) |
| `DATABASE_URL` | PostgreSQL |
| `BLOB_READ_WRITE_TOKEN` | Stockage privé des pièces sur Vercel Blob (le disque Vercel est éphémère) |
| `CRON_SECRET` | Tâches planifiées de `vercel.json` (relances, reprise API, maintenance) |

Garde-fous :

- **Paiements démo** (encaissement sans argent réel) interdits en production ; les moyens sans clés
  sont masqués. `PAIEMENT_DEMO=1` les réactive pour une preview client uniquement.
- **Comptes démo** non créés sur Postgres sauf `SEED_DEMO=1`.
- **Webhooks de paiement** : seule une opération ouverte par le serveur, sur le même dossier, le même
  moyen et le montant exact peut être confirmée ; un webhook rejoué n’est compté qu’une fois.
