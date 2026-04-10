---
id: unit-testing
title: Tests unitaires et de composants
sidebar_label: Tests unitaires
sidebar_position: 5
---

# Tests unitaires et de composants

Cette page couvre les patterns et approches pour les tests unitaires des services, hooks et composants dans le template Ever Works.

## Stratégie de test

Le template Ever Works utilise une approche de test en couches :

1. **Analyse statique** — TypeScript (`pnpm tsc --noEmit`) détecte les erreurs de type à la compilation
2. **Linting** — ESLint (`pnpm lint`) applique le style de code et détecte les bugs courants
3. **Tests E2E** — Les tests Playwright valident les flux utilisateur complets
4. **Tests unitaires** — Tests ciblés pour la logique métier, les services et les utilitaires

Pour la plupart des changements, la chaîne de validation recommandée est :

```bash
pnpm lint && pnpm tsc --noEmit && pnpm build
```

## Tester les services

Les services dans `lib/services/` contiennent la logique métier principale et sont les cibles les plus importantes pour les tests unitaires.

### Architecture des services

Les services suivent un pattern cohérent qui les rend testables :

```typescript
// lib/services/survey.service.ts
export class SurveyService {
  async create(data: CreateSurveyData): Promise<Survey> { /* ... */ }
  async getBySlug(slug: string): Promise<Survey | null> { /* ... */ }
  async update(id: string, data: UpdateSurveyData): Promise<Survey> { /* ... */ }
  async delete(id: string): Promise<void> { /* ... */ }
}

export const surveyService = new SurveyService();
```

### Mocker les requêtes de base de données

Les services dépendent des requêtes de base de données de `lib/db/queries/`. Moquez-les au niveau du module :

```typescript
import { SurveyService } from '@/lib/services/survey.service';

jest.mock('@/lib/db/queries', () => ({
  getSurveyBySlug: jest.fn(),
  createSurvey: jest.fn(),
}));

describe('SurveyService', () => {
  it('should return null for unknown slug', async () => {
    const { getSurveyBySlug } = require('@/lib/db/queries');
    getSurveyBySlug.mockResolvedValue(null);

    const service = new SurveyService();
    const result = await service.getBySlug('unknown');
    expect(result).toBeNull();
  });
});
```

## Tester les hooks React

Les hooks personnalisés dans `hooks/` peuvent être testés avec `@testing-library/react-hooks` ou directement via les composants.

## Configuration requise

Pour les tests unitaires, installez les dépendances de test :

```bash
pnpm add -D jest @testing-library/react @testing-library/react-hooks jest-environment-jsdom
```
