# HCGF — Guide client : parcours et tests (tous services)

**Site :** https://plateforme-avi.vercel.app  
Tous les services : AVI, Assurance, Hébergement, Vol.

---

## 0. Identifiants d’accès (démonstration)

| Espace | Connexion | E-mail | Mot de passe | Code PD |
|--------|-----------|--------|--------------|---------|
| **Candidat** | → Candidat | `candidat.demo@avi.test` | `Demo2026!` | Aucun |
| **Contrôleur** | → Contrôleur | `conseiller.demo@avi.test` | `Demo2026!` | `PD-4F2D8F97` |
| **Administrateur** | → Administrateur | `signataire.demo@avi.test` | `Demo2026!` | `PD-4F2D8F97` |
| **Partenaire** | → Partenaire | `partenaire.demo@avi.test` | `Demo2026!` | Aucun |

Si un compte équipe / partenaire a déjà été créé, le code PD a peut‑être changé : utiliser le dernier code affiché à l’écran.

---

## 1. Code de sécurité PD

Second secret (en plus du mot de passe) pour **Contrôleur** et **Administrateur**.

**Pourquoi :** protéger le bureau ; ne pas l’envoyer par mail ; rotation à chaque nouveau compte équipe / partenaire.

| Étape | Qui | Quoi |
|-------|-----|------|
| 1 | Administrateur | Crée le compte |
| 2 | Plateforme | Lien (1 h) + **nouveau code PD** |
| 3 | Plateforme | Mail du **lien** seulement |
| 4 | Administrateur | Note le code PD |
| 5–6 | Nouveau compte | Mot de passe puis login avec le nouveau PD |
| 7 | — | Ancien code mort |

---

## 2. Commun à tous les services

Dossier isolé, formulaire / pièces / paiement selon l’offre, suivi bureau.  
Ce qui change : **les étapes** et le **document final**.

| Service | Étapes | Résultat final | Validation clé |
|---------|--------|----------------|----------------|
| **AVI** | Formulaire → Documents → Paiement → Validation | Dossier final signé | Contrôleur puis **Administrateur** |
| **Assurance** | Formulaire → Tarification → Paiement → Attestation | Police / attestation | Souscription + paiement |
| **Hébergement** | Formulaire → Matching → Documents → Signature | Logement choisi + docs | Matching ≤ 40 min |
| **Vol** | Recherche → Passager → Hold → Justificatif | Justificatif Hold | Hold + date limite |

---

## 3. Parcours détaillés

### 3.1 AVI

Pays démo : FR, DE, BE, CA.

1. Nouvelle → AVI → pays.  
2. Formulaire (établissement, dates, montant).  
3. Pièces : passeport, admission, justificatifs.  
4. Paiement (virement déclaré).  
5. Contrôleur : ✓ Conforme.  
6. Administrateur : rapprocher fonds → **Signer**.  
7. Candidat : **Document final**.

Quatre yeux : contrôle ≠ signature.  
Vente croisée possible vers une assurance isolée.

### 3.2 Assurance

Pays démo : FR, DE.

1. Nouvelle → Assurance **ou** bandeau depuis un AVI.  
2. Dates + formule (essentielle / confort / premium).  
3. Onglet Assurance → souscrire.  
4. Paiement.  
5. Émettre / télécharger l’attestation.  

Pas le bouton Signer AVI.

### 3.3 Hébergement

Pays démo : FR.

1. Nouvelle → Hébergement.  
2. Établissement + date de rentrée.  
3. Matching (≤ 40 min).  
4. Choisir un logement.  
5. Pièces (passeport…).  
6. Suite documents / signature logement.  

### 3.4 Vol (Hold)

1. Nouvelle → Vol.  
2. Aéroports / dates.  
3. Offres → **Hold** si autorisé.  
4. Passager si demandé.  
5. Justificatif « billet non émis ».  
6. Suivi dans **Vols**.  

Pas une signature AVI ; le Hold peut expirer.

---

## 4. Bureau

| Action | Qui | Services |
|--------|-----|----------|
| Pièces Conformes | Contrôleur / Administrateur | Tous avec pièces |
| Rapprocher virement | Équipe | Tous avec paiement |
| **Signer** AVI | Administrateur | **AVI seulement** |
| Messages / SAV | Équipe | Tous |
| Inviter équipe | Administrateur | — |

---

## 5. Tests

**A — AVI** : formulaire + pièces + virement → conformes → Signer → PDF final.  
**B — Assurance** : formule → payer → attestation.  
**C — Hébergement** : matching → choisir logement → pièces.  
**D — Vol** : Hold → justificatif.  
**E — Messages / partenaire** : fil dossier ; Initier un apport.

---

## 6. Points d’attention

1. Seul l’AVI utilise **Signer** + quatre yeux.  
2. Chaque service = dossier isolé.  
3. Fonds reçus avant signature AVI.  
4. Code PD change à chaque invitation.  
5. Paiements externes souvent encore en démo.

---

## 7. Checklist

- [ ] AVI document final  
- [ ] Assurance attestation  
- [ ] Hébergement matching  
- [ ] Vol Hold + justificatif  
- [ ] Messages  
- [ ] (Option) partenaire  

*Document HCGF — production. Ne pas republier les identifiants hors cercle autorisé.*
