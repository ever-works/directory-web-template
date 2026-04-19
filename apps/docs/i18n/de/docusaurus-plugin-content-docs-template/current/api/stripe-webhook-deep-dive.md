---
id: stripe-webhook-deep-dive
title: "Stripe Webhook Deep Dive"
sidebar_label: "Stripe Webhook Deep Dive"
---

# Stripe Webhook – Detailanalyse

Diese Seite behandelt Webhook-Ereignisverarbeitung, Signaturverifizierung, unterstützte Ereignistypen, E-Mail-Benachrichtigungen und Fehlerbehandlungsmuster.

## Übersicht

Der Stripe-Webhook-Endpunkt verarbeitet eingehende Ereignisse von Stripe, verifiziert deren Echtheit per Signaturverifizierung, ordnet sie internen Ereignistypen zu und leitet sie an spezialisierte Handler weiter. Jeder Handler aktualisiert die Datenbank über `WebhookSubscriptionService` und sendet Transaktions-E-Mails.

## Routentabelle

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|------|-------|
| `POST` | `/api/stripe/webhook` | Stripe-Signatur | Eingehende Stripe-Webhook-Ereignisse verarbeiten |

## Signaturverifizierung

Jeder eingehende Webhook muss einen `stripe-signature`-Header enthalten. Der Provider verifiziert ihn mit der `constructEvent`-Methode von Stripe:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

Fehlt die Signatur, gibt der Endpunkt `400` zurück:

```json
{ "error": "No signature provided" }
```

Bei ungültiger Signatur wirft der `constructEvent`-Aufruf eine Ausnahme und der Endpunkt gibt zurück:

```json
{ "error": "Webhook processing failed" }
```

## Ereignistyp-Zuordnung

Stripe-Ereignistypen werden internen `WebhookEventType`-Werten zugeordnet:

| Stripe-Ereignis | Interner Typ | Handler |
|----------------|--------------|--------|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | `handleSubscriptionCreated` |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | `handleSubscriptionCancelled` |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | `handleSubscriptionPaymentSucceeded` |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | `handleSubscriptionPaymentFailed` |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | `handlePaymentSucceeded` |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | `handlePaymentFailed` |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | `handleSubscriptionTrialEnding` |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Nur protokolliert |

## Webhook-Verarbeitungsablauf

```
Stripe sendet POST -> Rohen Körper lesen -> stripe-signature-Header extrahieren
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (Signaturverifizierung)
    -> Ereignistyp auf internen Typ abbilden
    -> { received: true, type, id, data } zurückgeben
  -> Switch auf webhookResult.type
    -> Geeigneten Handler aufrufen
    -> Handler aktualisiert DB + sendet E-Mail
  -> { received: true } zurückgeben
```

## Ereignis-Handler

### Abonnement erstellt

Behandelt neu erstellte Abonnements:

1. Prüft, ob das Abonnement ein Sponsor-Anzeigen-Abonnement ist (Sonderbehandlung)
2. Ruft `webhookSubscriptionService.handleSubscriptionCreated(data)` auf, um die Datenbank zu aktualisieren
3. Extrahiert Tarifinfo (Name, Betrag, Abrechnungszeitraum)
4. Sendet eine Willkommens-E-Mail mit Abonnement-Details und Features

### Abonnement aktualisiert

Behandelt Abonnementänderungen (Tarif-Upgrades, -Downgrades usw.):

1. Aktualisiert die Datenbank über `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Extrahiert aktualisierte Tarifinfo
3. Sendet eine Aktualisierungsbenachrichtigungs-E-Mail

### Abonnement gekündigt

Behandelt Abonnementkuendigungen:

1. Prüft auf Sponsor-Anzeigen-Abonnements
2. Aktualisiert die Datenbank über `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Sendet eine Kürdigungs-E-Mail mit Grund und Reaktivierungs-URL

### Zahlung erfolgreich (einmalig)

Behandelt erfolgreiche Einmalzahlungen:

1. Extrahiert Kundeninfo und Zahlungsdetails
2. Formatiert Betrag und Zahlungsmethode
3. Sendet eine Zahlungsbestatigungs-E-Mail mit Quittungs-URL

### Zahlung fehlgeschlagen

Behandelt fehlgeschlagene Einmalzahlungen:

1. Extrahiert Fehlerinformationen aus `last_payment_error`
2. Erstellt Wiederholungs- und Zahlungsmethoden-Update-URLs
3. Sendet eine Zahlungsfehlermeldungs-E-Mail

### Abonnementzahlung erfolgreich

Behandelt erfolgreiche wiederkehrende Abonnementzahlungen:

1. Aktualisiert die Datenbank über `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Extrahiert Rechnungs- und Abonnement-Details
3. Sendet eine Abonnementzahlungsquittungs-E-Mail

### Abonnementzahlung fehlgeschlagen

Behandelt fehlgeschlagene wiederkehrende Abonnementzahlungen:

1. Aktualisiert die Datenbank über `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Sendet eine Fehlermeldung mit Wiederholungs- und Zahlungsaktualisierungs-URLs

### Testzeitraum endet

Behandelt 3-Tage-Ablaufbenachrichtigungen für den Testzeitraum von Stripe:

1. Aktualisiert die Datenbank über `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Sendet eine Erinnerungs-E-Mail zum Ablauf des Testzeitraums

## E-Mail-Benachrichtigungen

Jeder Handler verwendet den `paymentEmailService`, um Transaktions-E-Mails zu senden. Die E-Mail-Konfiguration wird sicher über `getEmailConfig()` geladen:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

| Ereignis | E-Mail-Vorlage |
|--------|---------------|
| Abonnement erstellt | `sendNewSubscriptionEmail` |
| Abonnement aktualisiert | `sendUpdatedSubscriptionEmail` |
| Abonnement gekündigt | `sendCancelledSubscriptionEmail` |
| Zahlung erfolgreich | `sendPaymentSuccessEmail` |
| Zahlung fehlgeschlagen | `sendPaymentFailedEmail` |
| Abonnementzahlung erfolgreich | `sendSubscriptionPaymentSuccessEmail` |
| Abonnementzahlung fehlgeschlagen | `sendSubscriptionPaymentFailedEmail` |
| Testzeitraum endet | `sendUpdatedSubscriptionEmail` |

## Sponsor-Anzeigen-Behandlung

Der Webhook enthält Sonderbehandlung für Sponsor-Anzeigen-Abonnements. Diese werden durch Prüfung der Metadaten identifiziert:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Sponsor-Anzeigen-Ereignisse lösen aus:
- **Aktivierung**: Bestätigt die Zahlung und setzt die Anzeige auf ausstehende Admin-Prüfung
- **Kündigung**: Deaktiviert die Sponsor-Anzeige
- **Verlängerung**: Verlängert das Enddatum der Sponsor-Anzeige

## Tarif-Features

Die Funktion `getSubscriptionFeatures` ordnet Tariflnamen Feature-Listen zu, die in Willkommens-E-Mails verwendet werden:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Fehlerbehandlung

Der Webhook-Endpunkt folgt einem robusten Muster:

- Jeder einzelne Handler ist in seinen eigenen try/catch-Block eingeschlossen
- Handler-Fehler werden protokolliert, führen aber nicht dazu, dass der Webhook einen Fehler zurückgibt
