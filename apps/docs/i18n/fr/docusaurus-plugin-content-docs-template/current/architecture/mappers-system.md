---
id: mappers-system
title: "Système de mappage"
sidebar_label: "Système de mappage"
sidebar_position: 48
---

# Système de mappage

## Aperçu

Le système Mappers fournit des fonctions de transformation pures et sans effets secondaires qui convertissent les modèles de données d'application internes en charges utiles CRM (Customer Relationship Management) externes. Actuellement, il implémente des mappeurs pour l'intégration Twenty CRM, convertissant les entités `ClientProfile` et `Company` en charges utiles `Person` et `Company` compatibles Twenty avec un mappage de champs de sécurité nulle et une validation des champs obligatoires.

## Architecture

Le module mappeurs réside dans `lib/mappers/` et suit un modèle strict de séparation des préoccupations :

- Les **Mappers** sont des fonctions pures : pas d'E/S, pas d'appels à la base de données, pas de requêtes HTTP.
- Les **Services** (dans `lib/services/`) consomment des mappeurs pour préparer les données avant de les envoyer à des API externes.
- Les **Types** sont importés à partir du schéma de base de données (`lib/db/schema`) et des définitions de types CRM (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

Le flux de données est :

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## Référence API

### Exportations depuis `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Valide qu’un ID d’entité est présent et non vide. Il s'agit d'un contrôle de sécurité critique garantissant que chaque enregistrement CRM possède un `external_id` valide renvoyant au système local.

**Paramètres :**
- `id` -- L'ID de l'entité locale (peut être indéfini ou nul)
- `entityType` -- Nom du type d'entité pour les messages d'erreur (par exemple, `'ClientProfile'`)

**Renvoie :** Chaîne d'identification tronquée

**Lance :** `Error` si l'ID est manquant, nul, non défini ou une chaîne vide.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Analyse une chaîne d'emplacement de forme libre pour extraire le nom de la ville. Gère différents formats en les divisant par des virgules et en prenant la première partie.

**Formats pris en charge :**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Renvoie :** Le nom de la ville ou `null` si l'emplacement est vide/non défini.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Mappe une entité de base de données `ClientProfile` locale à une charge utile Twenty CRM `Person`.

**Cartographie de champ :**

|Champ de profil client|Champ de vingt personnes|Obligatoire|
|--------------------|--------------------|----------|
|`id`|`external_id`|Oui (lance si manquant)|
|`name`|`name`|Oui|
|`email`|`email`|Oui|
|`phone`|`phone`|Facultatif|
|`jobTitle`|`job_title`|Facultatif|
|`company`|`company_name`|Facultatif|
|`website`|`website`|Facultatif|
|`location`|`city` (extrait)|Facultatif|
|`accountType`|`account_type`|Facultatif|
|`plan`|`plan`|Facultatif|
|`totalSubmissions`|`total_submissions`|Facultatif|

**Renvoie :** Un objet `TwentyPerson` avec uniquement des champs renseignés.

**Lance :** `Error` si `clientProfile.id` est manquant.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Mappe une entité locale `Company` à une charge utile Twenty CRM `Company`.

**Cartographie de champ :**

|Domaine de l'entreprise|Champ TwentyCompany|Obligatoire|
|--------------|---------------------|----------|
|`id`|`external_id`|Oui (lance si manquant)|
|`name`|`name`|Oui|
|`domain`|`domain_name`|Facultatif|
|`website`|`website`|Facultatif|
|`status`|`status`|Facultatif|

**Renvoie :** Un objet `TwentyCompany` avec uniquement des champs renseignés.

**Lance :** `Error` si `company.id` est manquant.

## Détails de mise en œuvre

**Mappage nul** : les champs facultatifs utilisent des vérifications explicites `if` avant l'affectation, garantissant que `null`, `undefined` et les valeurs vides ne sont jamais envoyées au CRM. Cela maintient les charges utiles propres et évite d'écraser les données CRM existantes avec des valeurs nulles.

**Application de l'ID externe** : chaque mappeur appelle `ensureExternalId()` comme première opération. Cela déclenche immédiatement les identifiants non valides, selon un modèle d'échec rapide qui empêche les enregistrements orphelins dans le CRM.

**Aucune mutation** : les fonctions Mapper créent de nouveaux objets plutôt que de modifier l'entrée. L'objet d'entrée `ClientProfile` ou `Company` n'est jamais modifié.

**Élagage facultatif des champs** : les champs ne sont ajoutés à l'objet de sortie que lorsqu'ils ont des valeurs véridiques. Cela produit des charges utiles minimales qui mettent à jour uniquement les champs non nuls dans le CRM.

**Heuristique d'extraction de ville** : la fonction `extractCityFromLocation()` utilise une approche simple par séparation par virgule. Cela gère les formats de localisation les plus courants (Ville, Ville + État, Ville + État + Pays) mais ne tente pas d'analyser les formats d'adresse complexes.

## Configuration

Aucune configuration n'est requise. Les mappeurs sont des fonctions pures qui dépendent uniquement de leurs types d'entrée. La configuration de la connexion Twenty CRM (URL API, tokens) est gérée par la couche de service d'intégration.

## Exemples d'utilisation

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## Meilleures pratiques

- Utilisez toujours les fonctions du mappeur au lieu de construire manuellement des charges utiles CRM pour garantir une dénomination de champ cohérente et une sécurité nulle.
- Gérez le `Error` lancé par `ensureExternalId()` au niveau de la couche de service ; enregistrez-le et ignorez la synchronisation CRM pour cet enregistrement plutôt que de planter l'ensemble du lot.
- Lorsque vous ajoutez de nouveaux champs à un mappeur, suivez le modèle existant : vérifiez la véracité avant de les attribuer à l'objet de sortie.
- Écrivez des tests unitaires pour les mappeurs car ce sont des fonctions pures sans dépendances, ce qui les rend faciles à tester de manière isolée.
- Si une nouvelle intégration CRM est nécessaire, créez un nouveau fichier de mappage (par exemple, `hubspot.mapper.ts`) dans le même répertoire en suivant les mêmes modèles.

## Modules associés

- [Config Manager System](./config-manager-system) -- Configuration de l'intégration via `configService.integrations`
- [API Client Layer](/template/architecture/api-client-layer) -- Client HTTP utilisé par les services CRM
