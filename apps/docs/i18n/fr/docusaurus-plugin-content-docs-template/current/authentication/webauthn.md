---
id: webauthn
title: Authentification WebAuthn / Passkey
sidebar_label: WebAuthn
sidebar_position: 3
---

# Authentification WebAuthn / Passkey

Le modèle inclut la prise en charge du schéma de base de données pour l'authentification WebAuthn (API Web Authentication) basée sur les clés d'accès (passkeys). Cela permet une connexion sans mot de passe en utilisant la biométrie, des clés de sécurité matérielles ou des authentificateurs de plateforme intégrés aux appareils modernes.

## Schéma de base de données

La table `authenticators` dans `lib/db/schema.ts` stocke les données d'identification WebAuthn, en suivant le schéma requis par le support WebAuthn d'Auth.js :

```typescript
export const authenticators = pgTable(
  'authenticators',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: text('transports'),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
);
```

### Référence des colonnes

| Colonne | Type | Description |
|---------|------|-------------|
| `credentialID` | `text` | Identifiant unique pour l'identifiant, encodé en base64url |
| `userId` | `text` | Clé étrangère vers `users.id`, suppression en cascade |
| `providerAccountId` | `text` | Identifiant de compte spécifique au fournisseur |
| `credentialPublicKey` | `text` | Clé publique COSE, encodée en base64url |
| `counter` | `integer` | Compteur de signature pour la détection de clonage |
| `credentialDeviceType` | `text` | Type d'appareil : `singleDevice` ou `multiDevice` |
| `credentialBackedUp` | `boolean` | Si l'identifiant est sauvegardé (synchronisé entre appareils) |
| `transports` | `text` | Liste de transports supportés séparés par des virgules (ex : `usb`, `ble`, `nfc`, `internal`) |

## Flux d'enregistrement

L'enregistrement de passkey WebAuthn suit la cérémonie FIDO2 standard :

1. Le client demande des options d'enregistrement au serveur
2. Le serveur génère un défi et les options de création de credential
3. L'utilisateur complète l'authentification biométrique / PIN sur l'appareil
4. Le navigateur crée l'attestation de credential
5. Le serveur vérifie et stocke le credential dans la table `authenticators`

## Appareils supportés

WebAuthn fonctionne avec :

- **Touch ID / Face ID** (macOS, iOS)
- **Windows Hello** (Windows)
- **Lecteurs d'empreintes Android**
- **Clés de sécurité matérielles** (YubiKey, etc.)
- **Authenticateurs de plateforme** (intégrés aux appareils modernes)

## Activation de WebAuthn

WebAuthn est disponible via Auth.js. Pour l'activer :

```typescript
// Dans auth.config.ts
import WebAuthn from 'next-auth/providers/webauthn';

export const authConfig = {
  providers: [
    WebAuthn,
    // ... autres fournisseurs
  ],
  experimental: {
    enableWebAuthn: true,
  },
};
```

## Notes de sécurité

- Les credentials WebAuthn sont liés à l'appareil et ne peuvent pas être transférés
- Le compteur de signatures prévient les attaques par rejeu
- Les credentials `multiDevice` sont synchronisés via l'écosystème de la plateforme (ex : iCloud Keychain)
