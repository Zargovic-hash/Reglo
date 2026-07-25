# Reglo+

> Plateforme intelligente qui simplifie et centralise l'audit et la gestion de la conformité réglementaire en matière de **santé & sécurité au travail**, **gestion des risques industriels** et **environnement**, pour le contexte réglementaire algérien (EHS).
>
> Développée par le bureau d'étude **Smart Safety Services - 3S**.

> ⚠️ Nom de travail historique : le projet a été renommé **SafeNext** → **Reglo+**. Certains artefacts (titre HTML, URLs de déploiement legacy, noms de packages npm) portent encore l'ancien nom — voir la section [Notes de rebranding](#notes-de-rebranding).

---

## Sommaire

- [Présentation](#présentation)
- [Architecture générale](#architecture-générale)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Modèle de données](#modèle-de-données)
- [API Backend](#api-backend)
- [Frontend](#frontend)
- [Sécurité](#sécurité)
- [Installation & démarrage](#installation--démarrage)
- [Migrations de base de données](#migrations-de-base-de-données)
- [Variables d'environnement](#variables-denvironnement)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Notes de rebranding](#notes-de-rebranding)
- [Points d'attention / dette technique](#points-dattention--dette-technique)

---

## Présentation

Reglo+ centralise une base de données de textes réglementaires EHS algériens (organisés par **domaine → titre → sous-titre → référence réglementaire → article → exigence → documents justificatifs → liens vers le texte**) et permet à des utilisateurs authentifiés de :

- Réaliser un **audit de conformité** pour chaque exigence réglementaire (conformité, priorité, faisabilité, plan d'action, échéance, responsable, risque).
- Suivre l'avancement via des **tableaux de bord** (taux de conformité, taux de complétion, regroupement par domaine).
- **Exporter des rapports** (PDF, Excel, CSV/JSON).
- Gérer des **favoris** parmi les exigences réglementaires.
- Gérer les utilisateurs et les rôles (**admin** / **user**) via un panneau d'administration.

La donnée réglementaire (table `reglementation_all`) est chargée depuis `database/reglementation_ehs_algerie.csv` (~623 lignes, colonnes `Domaine;Titre;Sous_Titre;Référence_Reglementaire;ID_Article;Exigence;Documents_Justificatif;Lien_1;Lien_2;Lien_3;Lien_4;Derniere_verification_JO`) via le script `Backend/scripts/importReglementationCsv.js` (`npm run import:reglementation`). Les deux fichiers Excel historiques (`database/Algeria EHS regulatory data Base.xlsx` et `database/Base de données reglementation EHS Algerie.xlsx`) ne sont plus la source d'import active. Le dépôt contient aussi ~133 documents PDF sources répartis en 10 domaines (`database/Fichier PDF/`) :

1. Environnement (27)
2. Air (7)
3. Eau (16)
4. Déchets (12)
5. Produits chimiques (13)
6. Produits dangereux (18)
7. Safety (11)
8. Technical safety (6)
9. Préparation situation d'urgence (8)
10. Santé au travail (15)

## Architecture générale

Application deux tiers classique :

```
┌─────────────────┐        REST/JSON (JWT)        ┌──────────────────┐
│   Frontend       │  ───────────────────────────▶ │   Backend         │
│   React (CRA)    │ ◀─────────────────────────── │   Express / Node   │
│   port 3000       │                               │   port 3001        │
└─────────────────┘                                └─────────┬────────┘
                                                                │ pg (Pool)
                                                                ▼
                                                        ┌───────────────┐
                                                        │  PostgreSQL    │
                                                        └───────────────┘
```

Pas d'ORM : les requêtes SQL sont écrites à la main via le driver `pg`.

## Stack technique

### Backend (`Backend/`)

| Domaine | Choix |
|---|---|
| Runtime | Node.js 18.x, modules ESM (`"type": "module"`) |
| Framework | Express 4.18 |
| Base de données | PostgreSQL via `pg` (Pool) |
| Auth | JWT (`jsonwebtoken`, expiration 24h) + `bcrypt` (12 rounds) |
| Sécurité HTTP | `helmet` (CSP désactivée), `cors` (allow-list), `express-rate-limit` sur `/api/*` (2000 req / 15 min en `development`, 100 req / 15 min en production) |
| Emails | `nodemailer` (SMTP configurable, fallback compte de test Ethereal en dev) |
| Rapports | `puppeteer` (PDF via Chrome headless), `exceljs` (Excel) |
| Autres | `moment`, `uuid`, `dotenv` |
| Dev / tests | `nodemon`, `jest` (mode ESM `--experimental-vm-modules`) |

### Frontend (`Frontend/`)

| Domaine | Choix |
|---|---|
| Framework | React 19.1 + Create React App (react-scripts 5.0.1) |
| Routing | React Router DOM 6.28 |
| Style | Tailwind CSS 3.4 + PostCSS/autoprefixer, tokens de design custom (couleurs primary/secondary/accent/success/warning/error, police Inter) |
| Graphiques | `chart.js` + `react-chartjs-2` **et** `recharts` (deux libs de charts coexistent) |
| UI/Anim | `framer-motion`, `@headlessui/react`, `lucide-react`, `@heroicons/react`, ~25 icônes SVG custom |
| Divers | `react-toastify` (notifications), `react-window` (virtualisation de listes) |
| Tests | Testing Library installée, mais aucun fichier de test présent sous `src/` |

## Structure du dépôt

```
6. Reglo+/
├── Backend/
│   ├── index.js                     # point d'entrée (fin, délègue à app.js)
│   ├── package.json                 # name: audit-reglementaire-backend
│   ├── scripts/
│   │   ├── runMigrations.js         # runner de migrations custom
│   │   └── importReglementationCsv.js  # (re)charge reglementation_all depuis le CSV source (TRUNCATE + import) — npm run import:reglementation
│   └── src/
│       ├── app.js                   # app Express principale (CORS, middlewares, routes, listen)
│       ├── db.js                    # pool pg (DATABASE_URL)
│       ├── controllers/
│       │   ├── authController.js           # register/login/profile/forgot-reset password/delete account
│       │   ├── auditController.js           # save/get audits, historique par utilisateur
│       │   ├── dashboardController.js       # stats, rapport d'audit, bulk save, export CSV/JSON
│       │   ├── favoriteController.js        # favoris de réglementations
│       │   ├── reglementationController.js  # recherche/filtre/pagination, full-text search, listes titres/sous-titres/domaines/owners
│       │   ├── reportController.js          # génération PDF (Puppeteer) / Excel (ExcelJS)
│       │   ├── userController.js            # gestion des utilisateurs (admin)
│       │   └── __tests__/reglementationController.test.js
│       ├── middleware/auth.js       # authenticateToken, requireAdmin, checkOwnership
│       ├── migrations/              # migrations SQL versionnées manuellement
│       └── routes/                  # audit.js, auth.js, dashboard.js, reglementation.js, reports.js, users.js
│
├── Frontend/
│   ├── package.json                 # name: audit-frontend
│   ├── public/index.html            # <title> encore "SafeNext"
│   ├── build/                       # build de production déjà présent dans le repo
│   └── src/
│       ├── App.jsx                  # routes + layout + routes protégées
│       ├── config/config.js         # base URL API (REACT_APP_API_URL) + wrapper fetch
│       ├── context/AuthContext.jsx  # login/register/logout/updateProfile/deleteAccount (JWT en localStorage)
│       ├── pages/
│       │   ├── HomePage.jsx                     # hero + graphiques de conformité
│       │   ├── LoginPage.jsx / RegisterPage.jsx
│       │   ├── ForgotPasswordPage.jsx / ResetPasswordPage.jsx
│       │   ├── ModernReglementationPage.jsx     # écran principal : navbar de domaines, filtres cascadés (titre/sous-titre), recherche, pagination, modal d'audit, vues table/cartes
│       │   ├── RecapPage.jsx                    # dashboard récapitulatif (KPI, export de rapport)
│       │   └── ProfilePage.jsx
│       ├── components/
│       │   ├── DomainNavbar.jsx             # barre horizontale de sélection de domaine (une ligne, défilement)
│       │   ├── ReglementationSidebar.jsx    # sidebar collapsible : recherche, filtres titre/sous-titre/statut/priorité/propriétaire/échéance, chips de filtres actifs, export PDF/Excel
│       │   ├── ModernTableView.jsx          # vue tableau (sous-vues "Audit & conformité" / "Plan d'action"), colonnes Statut+Actions fusionnées, colonne "Lien" (points lien_1..4)
│       │   ├── ModernCardsView.jsx          # vue cartes
│       │   ├── AuditModal.jsx               # formulaire d'audit + bloc contexte (exigence, référence légale, article, documents justificatifs, liens)
│       │   └── …                            # ~20 autres composants (AdvancedFilters, ReportButton, ui/…)
│       ├── icons/                   # ~25 icônes SVG custom
│       ├── styles/                  # app.css, index.css, modern.css, modern-reglementation.css
│       └── utils/reglementationStats.js  # calculs client (taux de conformité/complétion, regroupement par domaine)
│
└── database/
    ├── reglementation_ehs_algerie.csv                      # source active, alimente reglementation_all via import:reglementation
    ├── Algeria EHS regulatory data Base.xlsx                # historique, non utilisé par l'import actuel
    ├── Base de données reglementation EHS Algerie.xlsx      # historique, non utilisé par l'import actuel
    └── Fichier PDF/                                         # ~133 PDF sources, 10 dossiers par domaine
```

## Modèle de données

Aucun schéma SQL complet n'est versionné (pas d'ORM ni de dump `schema.sql`) : le schéma est reconstitué à partir des contrôleurs et des migrations.

| Table | Colonnes principales | Notes |
|---|---|---|
| `users` | id, email, password_hash, first_name, last_name, role (`user`/`admin`), is_active, created_at, updated_at, last_login | |
| `reglementation_all` | id, domaine, titre, sous_titre, reference_reglementaire, id_article, exigence, documents_justificatif, lien_1, lien_2, lien_3, lien_4, derniere_verification_jo | Catalogue réglementaire, chargé depuis `database/reglementation_ehs_algerie.csv` via `npm run import:reglementation` (TRUNCATE + réimport complet) |
| `audit_conformite` | reglementation_id (unique, cible d'upsert), conformite, `"prioritée"`, faisabilite, plan_action, deadline, owner, user_id, risque, created_at, updated_at | Colonne `"prioritée"` accentuée et donc entre guillemets en SQL |
| `password_reset_tokens` | user_id, token (UUID), expires_at | Expiration 15 min |
| `reglementation_favorites` | user_id, reglementation_id, created_at | PK composite, FKs `ON DELETE CASCADE` — ajoutée par migration |
| `schema_migrations` | name, applied_at | Créée dynamiquement par `runMigrations.js` |

### Migrations existantes (`Backend/src/migrations/`)

- `20260720_add_reglementation_favorites.sql` — création de la table des favoris + index.
- `20260720_add_reglementation_filter_indexes.sql` — index GIN full-text (français) sur titre/exigence/lois/documents (colonnes depuis renommées/retirées, voir migration suivante), + index de filtre sur domaine/chapitre/sous_chapitre/titre et colonnes de `audit_conformite`.
- `20260725_add_reglementation_metadata_columns.sql` — ajout initial de date_maj/numero_article/lien_texte (superseded par la migration suivante).
- `20260726_restructure_reglementation_schema.sql` — restructuration complète de `reglementation_all` : ajout de sous_titre, reference_reglementaire, id_article, documents_justificatif, lien_1..lien_4, derniere_verification_jo ; suppression de chapitre, sous_chapitre, lois, documents, date_maj, numero_article, lien_texte ; recréation des index (`idx_reglementation_all_domaine_titre`, index GIN full-text français).

⚠️ Les colonnes `lien_1`..`lien_4` ne contiennent pas encore systématiquement des URLs valides pour toutes les lignes (le CSV source est en cours de complétion). Le frontend valide chaque valeur (`/^https?:\/\//i`) avant de l'afficher comme lien cliquable.

## API Backend

Toutes les routes métier sont montées sous `/api` (`Backend/src/app.js`).

**Système**
- `GET /` — info API
- `GET /health` — vérification de connexion à la base
- `GET /api/status` — statut + liste des endpoints clés

**`/api/auth`**
- `POST /register`, `POST /login`
- `POST /forgot-password`, `POST /reset-password/:token`, `GET /validate-reset-token/:token`
- `GET /profile` (auth), `PUT /profile` (auth), `POST /logout` (auth), `DELETE /delete-account` (auth)

**`/api/users`** (admin uniquement, via `requireAdmin`)
- `GET /`, `GET /stats`, `GET /:userId`, `PUT /:userId`, `DELETE /:userId`

**`/api/reglementation`** (auth requise)
- `GET /favorites`, `POST /favorites/:reglementationId`, `DELETE /favorites/:reglementationId`
- `GET /` (recherche/filtre/pagination, full-text — filtres : titre, sous_titre, domaine, conformite, prioritée, owner)
- `GET /titres` (optionnellement filtré par `?domaine=`), `GET /sous-titres` (optionnellement filtré par `?domaine=&titre=`), `GET /domaines`, `GET /owners`

**`/api/audit`** (auth requise)
- `POST /`, `GET /:reglementation_id`, `GET /` (audits de l'utilisateur, paginé)

**`/api/dashboard`** (auth requise)
- `GET /stats`, `GET /report`, `POST /bulk-save`, `GET /export` (CSV/JSON)

**`/api/reports`** (auth requise)
- `POST /pdf`, `POST /excel`, `GET /test` (types : audit, dashboard, reglementation)

Contrôle d'accès basé sur les rôles : un utilisateur standard ne voit que ses propres données d'audit ; un admin voit tout et gère les utilisateurs.

## Frontend

- **Routing** protégé via `ProtectedRoute` (composant) — redirection si non authentifié.
- **Auth** gérée par `AuthContext` : login/register/logout/updateProfile/deleteAccount, token JWT stocké en `localStorage`.
- **Écran principal** : `ModernReglementationPage.jsx` — `DomainNavbar` en haut pour choisir un domaine (une ligne, défilement horizontal), filtres cascadés Titre → Sous-titre scopés au domaine actif (`ReglementationSidebar`), recherche, pagination, vues table (`ModernTableView`, sous-vues "Audit & conformité" / "Plan d'action") et cartes (`ModernCardsView`), modal d'audit (`AuditModal`) avec bloc contexte (exigence, référence légale + article, documents justificatifs, liens vers le texte).
- **Sidebar** (`ReglementationSidebar.jsx`) : repliable en rail d'icônes, chips récapitulatifs pour chaque filtre actif (domaine/titre/sous-titre/statut/priorité) avec retrait rapide, sélecteurs titre/sous-titre désactivés tant qu'aucun domaine n'est choisi, export PDF/Excel.
- **Dashboards** : `HomePage.jsx` (hero + graphiques) et `RecapPage.jsx` (KPI, export de rapport).
- **Accès API** : `src/config/config.js` expose `REACT_APP_API_URL` (défaut `http://localhost:3001/api`) et un wrapper `apiRequest` ; certaines pages lisent `process.env.REACT_APP_API_URL` directement plutôt que d'utiliser ce wrapper (incohérence à corriger, voir [Points d'attention](#points-dattention--dette-technique)).

## Sécurité

- **JWT** : expiration 24h, `Authorization: Bearer <token>`, vérifié à chaque requête contre la ligne `users` en base (dont `is_active`) via `authenticateToken`.
- **Mots de passe** : hachés avec `bcrypt` (12 rounds).
- **Réinitialisation de mot de passe** : token UUID dans `password_reset_tokens`, expiration 15 min, envoyé par email (Nodemailer, fallback Ethereal en dev).
- **CORS** : allow-list explicite (localhost:3000/3001 + domaines legacy Render) ; en `NODE_ENV=development`, toutes origines autorisées.
- **Autres middlewares** : `helmet` (CSP désactivée pour éviter les conflits avec le frontend), `express-rate-limit` (100 req/15 min sur `/api/*`), validation du corps JSON, timeout de requête 30s, `trust proxy` activé (déploiement derrière proxy type Render).

## Installation & démarrage

### Prérequis
- Node.js 18.x
- PostgreSQL accessible (local ou distant)

### Backend

```bash
cd Backend
npm install
# créer un fichier .env (voir Variables d'environnement) — l'app refuse de démarrer sans JWT_SECRET et DATABASE_URL
npm run migrate    # applique les migrations SQL en attente (table schema_migrations)
npm run import:reglementation  # (ré)importe reglementation_all depuis database/reglementation_ehs_algerie.csv (TRUNCATE + réimport complet)
npm run dev         # nodemon, développement
# ou
npm start            # production, node ./src/app.js
```
Serveur sur `process.env.PORT || 3001`, health check sur `/health`.

### Frontend

```bash
cd Frontend
npm install    # ⚠️ le postinstall lance `npx puppeteer browsers install chrome` (voir Points d'attention)
npm start       # serveur de dev CRA, port 3000
npm run build   # build de production
```

## Migrations de base de données

Le runner `Backend/scripts/runMigrations.js` (`npm run migrate`) applique les fichiers SQL de `Backend/src/migrations/` dans l'ordre et enregistre chaque migration appliquée dans `schema_migrations`.

⚠️ D'après `Backend/src/migrations/README.md`, **aucun lancement automatique des migrations n'est branché sur le déploiement** : elles doivent être exécutées manuellement, en fenêtre de maintenance, avant/après mise en production.

## Variables d'environnement

### Backend (`Backend/.env` — non versionné)

| Variable | Rôle |
|---|---|
| `PG_USER`, `PG_PASSWORD`, `PG_HOST`, `PG_PORT`, `PG_DATABASE` | Connexion PostgreSQL (détaillée) |
| `DATABASE_URL` | Connexion PostgreSQL (URL unique, utilisée par `db.js`) |
| `DATABASE_SSL` | Active/désactive SSL sur la connexion DB |
| `PORT` | Port d'écoute du serveur (défaut 3001) |
| `NODE_ENV` | `development` / `production` |
| `JWT_SECRET` | Secret de signature JWT (obligatoire au démarrage) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Config SMTP pour l'envoi d'emails |
| `FROM_EMAIL` | Adresse expéditeur des emails |
| `FRONTEND_URL` | URL du frontend (liens dans les emails, ex. reset password) |
| `DEBUG_MODE` | Active des logs additionnels |
| `MAX_FILE_SIZE` | Taille max de fichier acceptée |

Aucun fichier `.env.example` n'existe actuellement — il serait utile d'en créer un pour faciliter l'onboarding.

### Frontend

| Variable | Rôle |
|---|---|
| `REACT_APP_API_URL` | Base URL de l'API backend (défaut `http://localhost:3001/api`) |

## Tests

- **Backend** : `npm test` (Jest, mode ESM). Un seul test unitaire identifié : `Backend/src/controllers/__tests__/reglementationController.test.js` (query builder de recherche/filtre).
- **Frontend** : Testing Library installée mais aucun fichier de test présent sous `Frontend/src/`.

## Déploiement

- Historiquement déployé sur **Render** sous les noms `safenext.onrender.com`, `safenext-1.onrender.com` et `safetysolution.onrender.com` (toujours présents dans l'allow-list CORS du backend).
- `Backend` lance Puppeteer avec l'option `--no-sandbox`, ce qui indique un déploiement conteneurisé/Linux.
- Un dossier `Frontend/build/` est déjà présent dans le dépôt — probablement issu d'un build manuel précédent, à ne pas committer sans raison précise.

## Notes de rebranding

Le produit a changé de nom : **SafeNext** / **Safety Solution** → **Reglo+**. Éléments qui portent encore l'ancien nom et méritent une mise à jour :

- `Frontend/public/index.html` : balise `<title>` toujours sur **"SafeNext"**.
- `Backend/package.json` : nom du package `audit-reglementaire-backend`.
- `Frontend/package.json` : nom du package `audit-frontend`.
- Allow-list CORS (`Backend/src/app.js`) : domaines Render historiques (`safenext*.onrender.com`, `safetysolution.onrender.com`).

## Points d'attention / dette technique

- **Pas de README** de niveau projet avant ce document (seul `Backend/src/migrations/README.md` existait).
- **Pas de `.env.example`** — à créer pour faciliter l'installation par un nouveau développeur.
- **Deux librairies de graphiques** coexistent côté frontend (`chart.js`/`react-chartjs-2` et `recharts`) — à unifier si possible.
- **`postinstall` du frontend** exécute `npx puppeteer browsers install chrome`, alors que Puppeteer est une dépendance backend — semble être une configuration résiduelle/erronée.
- **Accès à l'API incohérent côté frontend** : certaines pages utilisent le wrapper `apiRequest` de `config/config.js`, d'autres lisent `process.env.REACT_APP_API_URL` directement.
- **Migrations non automatisées** au déploiement — nécessitent une exécution manuelle documentée.
- **Colonne SQL accentuée** `"prioritée"` dans `audit_conformite` — à garder en tête lors de l'écriture de requêtes brutes (nécessite des guillemets doubles).
- **Couverture de tests faible** : un seul test backend, aucun test frontend.
- **`build/` frontend committé** dans le dépôt — vérifier si c'est intentionnel (artefact de déploiement) ou à ignorer via `.gitignore`.
- **`lien_1`..`lien_4` pas encore tous des URLs réelles** — le CSV source (`database/reglementation_ehs_algerie.csv`) est en cours de complétion ; le frontend n'affiche un lien cliquable que si la valeur ressemble à une URL (`isLikelyUrl`), sinon un indicateur neutre est affiché à la place.
- **Deux fichiers Excel legacy dans `database/`** (`Algeria EHS regulatory data Base.xlsx`, `Base de données reglementation EHS Algerie.xlsx`) ne sont plus utilisés par l'import actif — à archiver ou supprimer si confirmé obsolètes.
