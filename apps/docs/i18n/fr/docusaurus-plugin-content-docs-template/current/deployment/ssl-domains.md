---
id: ssl-domains
title: SSL et domaines personnalisés
sidebar_label: SSL & Domaines
sidebar_position: 2
---

# SSL et domaines personnalisés

Ce guide couvre la configuration des domaines personnalisés, la gestion des certificats SSL et la configuration DNS pour le Template Ever Works.

## En-têtes de sécurité intégrés

Le template configure un ensemble complet d'en-têtes de sécurité dans `next.config.ts` appliqués automatiquement à chaque route :

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'none';"
        },
      ],
    },
  ];
}
```

## Configuration de domaine sur Vercel

### Ajouter un domaine personnalisé

1. Dans les paramètres du projet Vercel → **Domains**
2. Saisissez votre domaine et cliquez sur **Add**
3. Configurez les DNS selon les instructions de Vercel

### Configuration DNS

Pour un domaine racine (`exemple.com`) :
```
Type: A
Name: @
Value: 76.76.21.21
```

Pour un sous-domaine (`www.exemple.com`) :
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### SSL automatique

Vercel provisionne automatiquement les certificats Let's Encrypt. Le renouvellement est également automatique — aucune intervention nécessaire.

## Configuration de domaine self-hosted

Pour les déploiements Docker/cloud, utilisez Nginx comme proxy inverse avec Certbot pour les certificats SSL :

```nginx
server {
    listen 443 ssl;
    server_name exemple.com;

    ssl_certificate /etc/letsencrypt/live/exemple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exemple.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Obtenez un certificat SSL avec Certbot :

```bash
certbot --nginx -d exemple.com -d www.exemple.com
```
