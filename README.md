# 🔍 Inspecteur Mr Code

Plateforme d'analyse automatique de sécurité et de qualité pour dépôts GitHub. Connectez votre repo, et Inspecteur Mr Code passe votre code à la loupe : dépendances vulnérables, secrets exposés, qualité de code, configuration Docker et pipelines CI/CD — avec des explications en langage naturel générées par IA.

## Fonctionnalités

- **Authentification GitHub OAuth** — connexion sécurisée via son compte GitHub
- **Analyse de dépendances** — détection des vulnérabilités via `npm audit`
- **Détection de secrets** — scan des credentials/clés API exposés via `gitleaks`
- **Qualité de code** — analyse statique via `ESLint` + `eslint-plugin-sonarjs`
- **Analyse Docker** — bonnes pratiques de Dockerfile via `Hadolint`
- **Configuration CI/CD** — audit des workflows GitHub Actions (versions non figées, permissions, secrets en clair)
- **Support mono-repo** — recherche récursive multi-dossiers (backend/frontend séparés)
- **Explications IA** — synthèse en langage naturel des résultats via l'API Mistral
- **Traitement asynchrone** — scans exécutés en arrière-plan via une file de jobs (BullMQ/Redis)

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express |
| Base de données | PostgreSQL, Prisma ORM |
| File de jobs | Redis, BullMQ |
| Authentification | JWT, GitHub OAuth |
| Analyse | npm audit, gitleaks, ESLint, Hadolint |
| IA | Mistral AI (mistral-small) |
| Conteneurisation | Docker |

## Architecture

sentinelhub/
├── backend/
│ ├── src/
│ │ ├── controllers/ # Logique métier (auth, projets, GitHub)
│ │ ├── routes/ # Définition des routes Express
│ │ ├── middleware/ # Authentification JWT
│ │ ├── lib/ # Clients partagés (Prisma, Redis, Mistral)
│ │ ├── queues/ # Définition de la file BullMQ
│ │ └── workers/ # Worker de scan (clone, analyses, sauvegarde)
│ ├── prisma/
│ │ └── schema.prisma # Modèles User, Project, Scan
│ └── index.js # Point d'entrée API
├── frontend/
│ └── src/
│ ├── pages/ # Dashboard, ProjectDetail, AuthCallback
│ └── lib/ # Client API authentifié
└── README.md


## Fonctionnement

1. L'utilisateur se connecte via GitHub OAuth
2. Il sélectionne un ou plusieurs de ses dépôts à connecter
3. Au déclenchement d'un scan, un job est ajouté à une file Redis/BullMQ
4. Un worker dédié clone le dépôt dans un dossier temporaire isolé, exécute les 5 analyses (récursivement dans chaque sous-dossier pour les mono-repos), sauvegarde les résultats en base, puis nettoie l'environnement
5. Les résultats sont affichés dans le dashboard, avec un résumé visuel des scores et la possibilité de générer une explication IA détaillée

## Installation

### Prérequis

- Node.js 24+
- Docker Desktop
- Un compte GitHub avec une [OAuth App](https://github.com/settings/developers) configurée
- Une clé API [Mistral AI](https://console.mistral.ai/)
- [Gitleaks](https://github.com/gitleaks/gitleaks) et [Hadolint](https://github.com/hadolint/hadolint) installés localement

### Backend

```bash
cd backend
npm install
```

Crée un fichier `.env` avec :
DATABASE_URL="postgresql://postgres:motdepasse@localhost:5433/inspecteur_mr_code?schema=public"
JWT_SECRET=ta_cle_secrete
GITHUB_CLIENT_ID=ton_client_id
GITHUB_CLIENT_SECRET=ton_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
REDIS_URL=redis://localhost:6380
MISTRAL_API_KEY=ta_cle_mistral


Lance PostgreSQL et Redis via Docker :

```bash
docker run --name inspecteur-postgres -e POSTGRES_PASSWORD=motdepasse -e POSTGRES_DB=inspecteur_mr_code -p 5433:5432 -d postgres:16
docker run --name inspecteur-redis -p 6380:6379 -d redis:7-alpine
```

Applique les migrations et lance les serveurs (deux terminaux séparés) :

```bash
npx prisma migrate dev
npm run dev      # API Express
npm run worker   # Worker de scan
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5180`.

## Roadmap

- [ ] Tests automatisés et couverture de code
- [ ] Gestion du refresh token GitHub OAuth
- [ ] Historique comparatif entre scans (évolution des scores dans le temps)
- [ ] Export PDF des rapports de scan

## Auteur

Salomon MONTHE