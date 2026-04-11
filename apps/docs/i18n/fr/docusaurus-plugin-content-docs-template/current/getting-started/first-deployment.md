# Premier déploiement

Ce guide vous accompagne à travers le déploiement de votre Ever Works en production pour la première fois.

## Liste de contrôle pré-déploiement

Avant de déployer, assurez-vous d'avoir :

- [ ] Terminé la [configuration de l'environnement](./environment-setup)
- [ ] Testé en local avec `pnpm run dev`
- [ ] Configuré votre dépôt de données
- [ ] Configuré au moins un fournisseur d'authentification
- [ ] Généré des secrets de production
- [ ] Préparé votre domaine (si vous utilisez un domaine personnalisé)

## Options de déploiement

### Option 1 : Vercel (recommandé)

Vercel offre la meilleure expérience pour les applications Next.js.

#### 1. Installer la CLI Vercel

```bash
npm install -g vercel
```

#### 2. Se connecter à Vercel

```bash
vercel login
```

#### 3. Déployer

```bash
vercel
```

Suivez les invites :

- Lier à un projet existant ? **Non**
- Nom du projet : `votre-nom-de-projet`
- Répertoire : `./` (répertoire actuel)
- Remplacer les paramètres ? **Non**

#### 4. Définir les variables d'environnement

Dans le tableau de bord Vercel :

1. Allez dans votre projet → Paramètres → Variables d'environnement
2. Ajoutez toutes les variables d'environnement de production
3. Définissez des valeurs différentes pour Production, Aperçu et Développement

**Variables de production critiques :**

```bash
NODE_ENV=production
NEXTAUTH_URL=https://votre-domaine.vercel.app
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
AUTH_SECRET=votre-secret-de-production
DATABASE_URL=votre-url-de-base-de-données-production
```

#### 5. Redéployer

```bash
vercel --prod
```

### Option 2 : Docker

Pour les déploiements auto-hébergés ou les pipelines CI/CD personnalisés.

#### Construire l'image Docker

```bash
docker build -t ever-works-app .
```

#### Exécuter le conteneur

```bash
docker run -p 3000:3000 \
  -e AUTH_SECRET=votre-secret \
  -e DATABASE_URL=votre-url-bd \
  ever-works-app
```

### Option 3 : Hébergement manuel (VPS/serveur dédié)

#### 1. Préparer le serveur

```bash
# Mettre à jour les paquets
sudo apt update && sudo apt upgrade -y

# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer pnpm
npm install -g pnpm
```

#### 2. Déployer l'application

```bash
# Cloner et installer
git clone https://github.com/votre-org/votre-repo.git
cd votre-repo
pnpm install

# Construire
pnpm run build

# Démarrer avec PM2
pm2 start "pnpm start" --name "ever-works"
pm2 save
pm2 startup
```

## Configuration du domaine personnalisé

### DNS

Ajoutez ces enregistrements DNS à votre fournisseur de domaine :

| Type  | Nom  | Valeur                        |
| ----- | ---- | ----------------------------- |
| A     | @    | Adresse IP de votre serveur   |
| CNAME | www  | votre-domaine.vercel.app      |

### SSL/TLS

Vercel fournit automatiquement des certificats SSL. Pour les déploiements auto-hébergés, utilisez Let's Encrypt :

```bash
sudo apt install certbot
sudo certbot --nginx -d votre-domaine.com
```

## Variables d'environnement de production

Assurez-vous de définir ces variables en production :

```bash
NODE_ENV=production
AUTH_SECRET=<secret-aléatoire-long>
COOKIE_SECURE=true
COOKIE_DOMAIN=.votre-domaine.com
DATABASE_URL=<url-postgres-production>
NEXTAUTH_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

## Surveillance et journaux

### Vercel Analytics

Activez Vercel Analytics dans votre tableau de bord pour surveiller les performances.

### Sentry (optionnel)

```bash
SENTRY_DSN=https://votre-sentry-dsn@sentry.io/projet-id
```

## Prochaines étapes

- [Référence rapide](/getting-started/quick-reference) — Commandes essentielles
- [Guide de déploiement avancé](/deployment/docker) — Configurations Docker avancées
