---
id: scaling
title: Mise à l'échelle et haute disponibilité
sidebar_label: Mise à l'échelle
sidebar_position: 4
---

# Mise à l'échelle et haute disponibilité

Ce guide couvre les stratégies pour faire monter en charge le Template Ever Works depuis un déploiement à instance unique jusqu'à une configuration de production hautement disponible.

## Architectures de déploiement

| Architecture | Idéal pour | Modèle de mise à l'échelle |
|---|---|---|
| Vercel (Serverless) | La plupart des déploiements | Mise à l'échelle horizontale automatique |
| Docker (Standalone) | Auto-hébergé, on-premise | Manuelle ou par orchestrateur |
| Node.js (Direct) | Développement, déploiements simples | Instance unique ou cluster PM2 |

## Configuration Serverless (Vercel)

### Sortie standalone

Le template est configuré avec la sortie standalone pour un déploiement serverless optimal :

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Configuration des fonctions

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // secondes (plan Pro : jusqu'à 300s)
export const dynamic = 'force-dynamic';
```

### Paramètres de fonctions recommandés

| Type de route | Durée max | Notes |
|---|---|---|
| Routes API standard | 10s | Suffisant pour la plupart des endpoints |
| Traitements de webhook | 30s | Pour webhooks de paiement |
| Routes de données lourdes | 60s | Pour la génération de rapports |

## Connection Pooling pour Serverless

Les déploiements serverless créent de nombreuses connexions courtes. Utilisez PgBouncer ou un pooler compatible :

```bash
# URL avec PgBouncer
DATABASE_URL=postgresql://user:password@pooler.neon.tech:5432/db?sslmode=require

# Taille de pool recommandée pour serverless
DB_POOL_SIZE=5  # Moins est mieux pour serverless
```

## Distribution CDN

Vercel Edge Network fournit automatiquement une distribution CDN mondiale. Pour les déploiements auto-hébergés, envisagez Cloudflare :

1. Ajoutez votre site à Cloudflare
2. Mettez à jour vos serveurs DNS vers Cloudflare
3. Activez le proxy (nuage orange) pour la mise en cache CDN
