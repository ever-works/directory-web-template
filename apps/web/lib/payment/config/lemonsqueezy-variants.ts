// Configuration des produits Lemonsqueezy pour chaque plan
// Note: Ces IDs sont des IDs de PRODUITS, pas de variantes

export const LEMONSQUEEZY_PRODUCTS = {
  FREE: {
    id: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID || '602432',
    name: 'Free Plan',
    price: 0,
    slug: 'free-plan',
  },
  STANDARD: {
    id: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID || '602426',
    name: 'Standard Plan',
    price: 3000000, // 30.00 (en centimes, selon l'API)
    slug: 'standard-plan',
  },
  PREMIUM: {
    id: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '602428',
    name: 'Premium Plan',
    price: 4500000, // 45.00 (en centimes, selon l'API)
    slug: 'premium-plan',
  },
} as const;

export type PlanType = keyof typeof LEMONSQUEEZY_PRODUCTS;

/**
 * Obtient l'ID de produit pour un plan donné
 * @param plan - Type de plan (FREE, STANDARD, PREMIUM)
 * @returns ID du produit
 */
export function getProductId(plan: PlanType): string {
  return LEMONSQUEEZY_PRODUCTS[plan].id;
}

/**
 * Obtient le prix pour un plan donné
 * @param plan - Type de plan (FREE, STANDARD, PREMIUM)
 * @returns Prix en centimes
 */
export function getPlanPrice(plan: PlanType): number {
  return LEMONSQUEEZY_PRODUCTS[plan].price;
}

/**
 * Obtient le nom pour un plan donné
 * @param plan - Type de plan (FREE, STANDARD, PREMIUM)
 * @returns Nom du plan
 */
export function getPlanName(plan: PlanType): string {
  return LEMONSQUEEZY_PRODUCTS[plan].name;
}

/**
 * Obtient le slug pour un plan donné
 * @param plan - Type de plan (FREE, STANDARD, PREMIUM)
 * @returns Slug du plan
 */
export function getPlanSlug(plan: PlanType): string {
  return LEMONSQUEEZY_PRODUCTS[plan].slug;
}

/**
 * Obtient tous les produits disponibles
 * @returns Objet avec tous les produits
 */
export function getAllProducts() {
  return LEMONSQUEEZY_PRODUCTS;
}

/**
 * Vérifie si un produit ID est valide
 * @param productId - ID du produit à vérifier
 * @returns true si le produit est valide
 */
export function isLemonsqueezyProductIdValid(productId: string | number): boolean {
  const validIds = Object.values(LEMONSQUEEZY_PRODUCTS).map(p => p.id);
  return validIds.includes(productId.toString());
}

/**
 * Obtient le plan correspondant à un produit ID
 * @param productId - ID du produit
 * @returns Type de plan ou null si non trouvé
 */
export function getPlanByProductId(productId: string | number): PlanType | null {
  for (const [plan, product] of Object.entries(LEMONSQUEEZY_PRODUCTS)) {
    if (product.id === productId.toString()) {
      return plan as PlanType;
    }
  }
  return null;
}

// Alias for compatibility (deprecated)
export const LEMONSQUEEZY_VARIANTS = LEMONSQUEEZY_PRODUCTS;
export const getVariantId = getProductId;
