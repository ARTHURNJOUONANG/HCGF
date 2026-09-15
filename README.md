# Plateforme AVI — LOT 1 à 8 + 3B

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
- police rattachée à **sa** demande
- attestation après encaissement
- depuis un dossier AVI : préremplissage identité + dates

## LOT 3B — Vol Hold

- recherche d’offres, PNR, date limite (fuseau Europe/Paris)
- Hold interdit si paiement immédiat
- justificatif « Réservation confirmée – billet non émis »
- page **Mes réservations de vol** (`/vols`)
- idempotence : un seul Hold par offre / dossier

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

## LOT 8 — Relances et exploitation

- SLA Standard / Prioritaire / Urgent
- relances J+2, J+5, J+7 puis tâche à J+10
- échéances et réclamations SAV
- file `/bureau/exploitation`

## LOT 7 — Hébergement

- matching sur le **temps en transports ≤ 40 min** (voiture informative)
- choix de logement, coordonnées bailleur masquées
- liste d’attente s’il n’y a aucun compatible

## Démarrer

```bash
cd plateforme-avi
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Ouvrir http://localhost:3000

Mot de passe démo : `Demo2026!`

| Rôle | E-mail |
|---|---|
| Candidat | `candidat.demo@avi.test` |
| Conseiller | `conseiller.demo@avi.test` |
| Signataire | `signataire.demo@avi.test` |
| Partenaire | `partenaire.demo@avi.test` |
| Délégataire | `delegue.demo@avi.test` |
