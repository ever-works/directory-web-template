---
id: webauthn
title: WebAuthn / Passkey Authentication
sidebar_label: WebAuthn
sidebar_position: 3
---

# WebAuthn / Passkey Authentication

The template includes database schema support for WebAuthn (Web Authentication API) passkey-based authentication. This enables passwordless login using biometrics, hardware security keys, or platform authenticators built into modern devices.

## Database Schema

The `authenticators` table in `lib/db/schema.ts` stores WebAuthn credential data, following the schema required by Auth.js WebAuthn support:

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

### Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `credentialID` | `text` | Unique identifier for the credential, base64url-encoded |
| `userId` | `text` | Foreign key to `users.id`, cascading delete |
| `providerAccountId` | `text` | Provider-specific account identifier |
| `credentialPublicKey` | `text` | COSE public key, base64url-encoded |
| `counter` | `integer` | Signature counter for clone detection |
| `credentialDeviceType` | `text` | Device type: `singleDevice` or `multiDevice` |
| `credentialBackedUp` | `boolean` | Whether the credential is backed up (synced across devices) |
| `transports` | `text` | Comma-separated list of supported transports (e.g., `usb`, `ble`, `nfc`, `internal`) |

### Primary Key

The table uses a composite primary key on `(userId, credentialID)`, allowing users to register multiple authenticator devices while ensuring each credential is unique per user.

## Registration Flow

WebAuthn passkey registration follows the standard FIDO2 ceremony:

```
1. Client requests registration challenge
   -> Server generates challenge + user info
   -> Server sends PublicKeyCredentialCreationOptions

2. Browser calls navigator.credentials.create()
   -> User performs biometric/PIN verification
   -> Authenticator generates key pair
   -> Browser returns attestation response

3. Client sends attestation to server
   -> Server verifies attestation
   -> Server stores credential in authenticators table
   -> Registration complete
```

### Key Fields Stored During Registration

- **credentialID**: The unique ID assigned by the authenticator
- **credentialPublicKey**: The public key used for future verification
- **counter**: Initial signature counter (typically 0)
- **credentialDeviceType**: Whether the key is device-bound or synced
- **credentialBackedUp**: Whether the passkey is available across devices
- **transports**: How the authenticator communicates (USB, BLE, NFC, internal)

## Authentication Flow

```
1. Client requests authentication challenge
   -> Server looks up user's registered credentials
   -> Server generates challenge + allowCredentials list

2. Browser calls navigator.credentials.get()
   -> User performs biometric/PIN verification
   -> Authenticator signs the challenge

3. Client sends assertion to server
   -> Server verifies signature using stored public key
   -> Server checks and updates counter (clone detection)
   -> Server creates session/JWT
   -> Authentication complete
```

### Counter Verification

The `counter` field provides replay attack protection. Each time an authenticator signs a challenge, it increments its internal counter. The server verifies that the new counter value is greater than the stored value. If it is not, the credential may have been cloned.

## Device Management

Users can register multiple authenticators. The schema supports this through the composite primary key on `(userId, credentialID)`.

### Multi-Device Passkeys

The `credentialDeviceType` and `credentialBackedUp` fields indicate passkey portability:

| Device Type | Backed Up | Meaning |
|-------------|-----------|---------|
| `singleDevice` | `false` | Hardware security key (YubiKey, etc.) |
| `multiDevice` | `true` | Synced passkey (iCloud Keychain, Google Password Manager) |
| `multiDevice` | `false` | Multi-device capable but not yet synced |

### Transport Types

The `transports` field helps the browser optimize the authentication UX by knowing which communication channels to try:

| Transport | Description |
|-----------|-------------|
| `internal` | Platform authenticator (Touch ID, Windows Hello, Android biometrics) |
| `usb` | USB security key |
| `ble` | Bluetooth Low Energy |
| `nfc` | Near Field Communication |
| `hybrid` | Cross-device authentication (e.g., phone as authenticator for laptop) |

## Browser Compatibility

WebAuthn is supported by all major modern browsers:

| Browser | Platform Authenticator | Security Keys | Passkey Sync |
|---------|----------------------|---------------|-------------|
| Chrome 67+ | Yes | Yes | Yes (Google Password Manager) |
| Safari 14+ | Yes | Yes | Yes (iCloud Keychain) |
| Firefox 60+ | Yes | Yes | Limited |
| Edge 18+ | Yes | Yes | Yes (Microsoft Account) |

### Mobile Support

- **iOS 16+**: Full passkey support with iCloud Keychain sync
- **Android 9+**: FIDO2 support; Android 14+ includes native passkey UI
- **Cross-device**: Hybrid transport allows using a phone as an authenticator for desktop browsers via QR code scanning

## Integration with NextAuth

The `authenticators` table follows the Auth.js WebAuthn adapter schema. When WebAuthn is enabled, the Drizzle adapter maps this table alongside the standard `users`, `accounts`, `sessions`, and `verificationTokens` tables.

The cascade delete on `userId` ensures that when a user account is deleted, all associated passkey credentials are automatically removed from the database.
