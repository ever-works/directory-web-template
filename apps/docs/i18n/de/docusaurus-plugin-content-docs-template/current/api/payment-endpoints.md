---
id: payment-endpoints
title: "Payment API Endpoints"
sidebar_label: "Payment API Endpoints"
---

# Zahlungs-API-Endpunkte

Die Vorlage unterstützt vier Zahlungsanbieter: **Stripe**, **Lemon Squeezy**, **Polar** und **Solidgate**. Jeder Anbieter verfügt über eigene API-Routen für Checkout, Abonnementverwaltung und Webhook-Verarbeitung. Eine generische `/api/payment`-Gruppe bietet anbieterneutrale Abonnementabfragen.

## Stripe (`/api/stripe`)

Stripe ist die funktionsreichste Integration mit 17 Routen-Handlern für Checkout, Abonnements, Zahlungsmethoden, Setup Intents und Produkte.

### Checkout

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/stripe/checkout` | Stripe-Checkout-Sitzung erstellen |

### Abonnements

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `GET` | `/api/stripe/subscription` | Aktives Abonnement des aktuellen Benutzers abrufen |
| `POST` | `/api/stripe/subscription` | Neues Abonnement erstellen |
| `GET` | `/api/stripe/subscriptions` | Alle Benutzerabonnements auflisten |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Abonnement kündigen |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Gekündigtes Abonnement reaktivieren |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Abonnement aktualisieren (Tarif wechseln) |
| `POST` | `/api/stripe/subscription/portal` | Stripe-Kundenportal-Sitzung erstellen |

### Zahlungsmethoden

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `GET` | `/api/stripe/payment-methods/list` | Gespeicherte Zahlungsmethoden auflisten |
| `POST` | `/api/stripe/payment-methods/create` | Neue Zahlungsmethode hinzufügen |
| `PUT` | `/api/stripe/payment-methods/update` | Standard-Zahlungsmethode aktualisieren |
| `DELETE` | `/api/stripe/payment-methods/delete` | Zahlungsmethode entfernen |
| `GET` | `/api/stripe/payment-methods/[id]` | Details einer Zahlungsmethode abrufen |

### Setup Intents

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/stripe/setup-intent` | Setup Intent zum Speichern einer Zahlungsmethode erstellen |
| `GET` | `/api/stripe/setup-intent/[id]` | Status eines Setup Intents abrufen |

### Payment Intents

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/stripe/payment-intent` | Einmaligen Payment Intent erstellen |

### Produkte

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `GET` | `/api/stripe/products` | Verfügbare Stripe-Produkte/Preise auflisten |

### Webhook

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/stripe/webhook` | Stripe-Webhook-Ereignis-Handler |

Der Stripe-Webhook-Handler verarbeitet folgende Ereignisse:
- `checkout.session.completed` – Checkout-Abschluss
- `customer.subscription.created` – Neues Abonnement
- `customer.subscription.updated` – Abonnement-Änderungen
- `customer.subscription.deleted` – Abonnement-Kündigung
- `invoice.payment_succeeded` – Erfolgreiche Zahlung
- `invoice.payment_failed` – Fehlgeschlagene Zahlung

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy bietet ein einfacheres Abonnementmodell mit 7 Endpunkten.

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/lemonsqueezy/checkout` | Lemon-Squeezy-Checkout erstellen |
| `GET` | `/api/lemonsqueezy/list` | Abonnements des Benutzers auflisten |
| `POST` | `/api/lemonsqueezy/cancel` | Abonnement kündigen |
| `POST` | `/api/lemonsqueezy/reactivate` | Gekündigtes Abonnement reaktivieren |
| `POST` | `/api/lemonsqueezy/update` | Abonnement-Details aktualisieren |
| `POST` | `/api/lemonsqueezy/update-plan` | Abonnement-Tarif wechseln |
| `POST` | `/api/lemonsqueezy/webhook` | Lemon-Squeezy-Webhook-Handler |

### Webhook-Ereignisse

Der Lemon-Squeezy-Webhook verarbeitet:
- `subscription_created` – Neues Abonnement
- `subscription_updated` – Tarifänderungen
- `subscription_cancelled` – Kündigung
- `subscription_payment_success` – Zahlungsbestätigung
- `subscription_payment_failed` – Zahlungsfehler

## Polar (`/api/polar`)

Polar bietet 5 Endpunkte für Checkout und Abonnementverwaltung.

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/polar/checkout` | Polar-Checkout-Sitzung erstellen |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Abonnement kündigen |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Abonnement reaktivieren |
| `POST` | `/api/polar/subscription/portal` | Abonnementportal aufrufen |
| `POST` | `/api/polar/webhook` | Polar-Webhook-Handler |

## Solidgate (`/api/solidgate`)

Solidgate ist die minimalste Integration mit 2 Endpunkten.

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `POST` | `/api/solidgate/checkout` | Solidgate-Checkout erstellen |
| `POST` | `/api/solidgate/webhook` | Solidgate-Webhook-Handler |

## Generische Zahlung (`/api/payment`)

Anbieterneutrale Zahlungs-Endpunkte zur Abonnementverwaltung unabhängig vom zugrundeliegenden Zahlungsanbieter.

| Methode | Pfad | Beschreibung |
|---------|------|-------|
| `GET` | `/api/payment/[subscriptionId]` | Abonnement-Details nach ID abrufen |
| `GET` | `/api/payment/account` | Zahlungskonto des aktuellen Benutzers abrufen |
| `GET` | `/api/payment/account/[userId]` | Zahlungskonto eines bestimmten Benutzers abrufen (Admin) |

## Webhook-Sicherheit

Alle Webhook-Endpunkte implementieren anbieterspezifische Signaturverifizierung:

### Stripe

Stripe-Webhooks verifizieren den `stripe-signature`-Header mithilfe der Umgebungsvariable `STRIPE_WEBHOOK_SECRET` und der Methode `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

Lemon-Squeezy-Webhooks verifizieren den `x-signature`-Header mit HMAC-SHA256 und dem `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

Polar-Webhooks verifizieren die Anfrage-Signaturen mit dem `POLAR_WEBHOOK_SECRET`.

### Solidgate

Solidgate-Webhooks verwenden die integrierte Signaturverifizierung des SDKs mit dem `SOLIDGATE_SECRET_KEY`.

## Umgebungsvariablen

### Stripe

| Variable | Beschreibung |
|----------|---------|
| `STRIPE_SECRET_KEY` | Geheimer Stripe-API-Schlüssel |
| `STRIPE_PUBLISHABLE_KEY` | Öffentlicher Stripe-Schlüssel (clientseitig) |
| `STRIPE_WEBHOOK_SECRET` | Webhook-Signierungsgeheimnis |

### Lemon Squeezy

| Variable | Beschreibung |
|----------|---------|
| `LEMONSQUEEZY_API_KEY` | Lemon-Squeezy-API-Schlüssel |
| `LEMONSQUEEZY_STORE_ID` | Shop-Bezeichner |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook-Signierungsgeheimnis |

### Polar

| Variable | Beschreibung |
|----------|---------|
| `POLAR_ACCESS_TOKEN` | Polar-API-Zugriffstoken |
| `POLAR_WEBHOOK_SECRET` | Webhook-Signierungsgeheimnis |
| `POLAR_ORGANIZATION_ID` | Organisations-Bezeichner |

### Solidgate

| Variable | Beschreibung |
|----------|---------|
| `SOLIDGATE_MERCHANT_ID` | Händler-Bezeichner |
| `SOLIDGATE_SECRET_KEY` | Geheimer API-Schlüssel |

## Authentifizierungsanforderungen

| Endpunkt-Typ | Authentifizierung erforderlich |
|--------------|------|
| Checkout-Erstellung | Ja (angemeldeter Benutzer) |
| Abonnementverwaltung | Ja (Abonnement-Eigentümer) |
| Zahlungsmethoden-Verwaltung | Ja (Stripe-Kunde) |
| Produkt-Auflistung | Öffentlich (Stripe-Produkte) |
| Webhook-Handler | Signaturverifizierung (keine Sitzung) |
| Generische Zahlungsabfragen | Ja (Konto-Eigentümer oder Admin) |
