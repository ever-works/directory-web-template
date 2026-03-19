import React, { memo, useMemo, useEffect } from 'react'

export type PlanType = 
  | "TRIAL"      
  | "FREE"       
  | "STANDARD"   
  | "PREMIUM"    
  | "EXPIRED"    
  | "CANCELLED"  

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,  
  EXPIRED: 1,    
  TRIAL: 2,      
  FREE: 3,       
  STANDARD: 4,   
  PREMIUM: 5     
} as const



export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7, 
  TRIAL_DURATION_DAYS: 14, 
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType, 
} as const

export interface User {
  readonly id: string
  readonly plan: PlanType
  readonly featureOverrides?: readonly string[]
  readonly isAdmin?: boolean
  readonly planExpiresAt?: Date | null
  readonly trialEndsAt?: Date | null
  readonly isInGracePeriod?: boolean
}

export interface FeatureGuardProps {
  readonly user: User | null | undefined
  readonly requiredPlan: PlanType
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
  readonly onAccessDenied?: (userPlan: PlanType | null, requiredPlan: PlanType, reason?: 'unauthenticated' | 'insufficient_plan' | 'expired') => void
  readonly featureId?: string
  readonly allowOverride?: boolean
  readonly respectGracePeriod?: boolean 
}

type PlanComparison = {
  readonly userLevel: number
  readonly requiredLevel: number
  readonly hasAccess: boolean
  readonly isOverride?: boolean
  readonly isGracePeriod?: boolean
}

type AccessDecision = {
  readonly hasAccess: boolean
  readonly userPlan: PlanType | null
  readonly isOverride: boolean
  readonly isGracePeriod: boolean
  readonly reason?: 'unauthenticated' | 'insufficient_plan' | 'expired'
}

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false
  
  const now = new Date()
  const graceEnd = new Date(user.planExpiresAt)
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS)
  
  return now <= graceEnd && user.plan === "EXPIRED"
}

export const getEffectivePlan = (user: User): PlanType => {
  if (isInGracePeriod(user)) {
    return GRACE_PERIOD_CONFIG.EXPIRED_ACCESS_LEVEL
  }
  
  return user.plan
}

export const comparePlans = (userPlan: PlanType, requiredPlan: PlanType): PlanComparison => {
  const userLevel = PLAN_LEVEL[userPlan]
  const requiredLevel = PLAN_LEVEL[requiredPlan]
  
  return {
    userLevel,
    requiredLevel,
    hasAccess: userLevel >= requiredLevel
  }
}

export const hasAccess = (userPlan: PlanType, requiredPlan: PlanType): boolean => {
  return comparePlans(userPlan, requiredPlan).hasAccess
}

export const hasFeatureOverride = (user: User, featureId: string): boolean => {
  return user.featureOverrides?.includes(featureId) ?? false
}

export const FEATURE_OVERRIDES = {

  ALLOW_FREE_PREMIUM: process.env.NODE_ENV === 'development',
    FREE_ACCESS_FEATURES: [
      'premium-analytics',
      'advanced-export',
      'priority-support'
    ] as const,
    
  GRACE_PERIOD_FEATURES: [
    'basic-export',
    'standard-analytics'
  ] as const
} as const

const FeatureGuard: React.FC<FeatureGuardProps> = memo(({ 
  user, 
  requiredPlan, 
  children, 
  fallback = null,
  onAccessDenied,
  featureId,
  allowOverride = true,
  respectGracePeriod = true
}) => {
  const accessResult = useMemo<AccessDecision>(() => {
    if (!user) {
      return { 
        hasAccess: false, 
        userPlan: null, 
        isOverride: false, 
        isGracePeriod: false,
        reason: 'unauthenticated'
      }
    }
    
    const effectivePlan = respectGracePeriod ? getEffectivePlan(user) : user.plan
    const isGracePeriod = respectGracePeriod && isInGracePeriod(user)
    
    const comparison = comparePlans(effectivePlan, requiredPlan)
    let hasAccess = comparison.hasAccess
    let isOverride = false
    let reason: 'unauthenticated' | 'insufficient_plan' | 'expired' = 'insufficient_plan'
    
    if (!hasAccess && allowOverride) {
      if (user.isAdmin) {
        hasAccess = true
        isOverride = true
      }
      else if (featureId && hasFeatureOverride(user, featureId)) {
        hasAccess = true
        isOverride = true
      }
      else if (FEATURE_OVERRIDES.ALLOW_FREE_PREMIUM && effectivePlan === 'FREE') {
        hasAccess = true
        isOverride = true
      }
      else if (featureId && FEATURE_OVERRIDES.FREE_ACCESS_FEATURES.includes(featureId as any)) {
        hasAccess = true
        isOverride = true
      }
      else if (isGracePeriod && featureId && FEATURE_OVERRIDES.GRACE_PERIOD_FEATURES.includes(featureId as any)) {
        hasAccess = true
        isOverride = true
      }
    }
    
    // Determine reason for access denial
    if (!hasAccess) {
      if (user.plan === 'EXPIRED' && !isGracePeriod) {
        reason = 'expired'
      } else {
        reason = 'insufficient_plan'
      }
    }
    
    return { 
      hasAccess, 
      userPlan: user.plan,
      isOverride,
      isGracePeriod,
      reason
    }
  }, [user, requiredPlan, featureId, allowOverride, respectGracePeriod])

  useEffect(() => {
    if (!accessResult.hasAccess && onAccessDenied) {
      onAccessDenied(accessResult.userPlan, requiredPlan, accessResult.reason)
    }
  }, [accessResult.hasAccess, accessResult.userPlan, accessResult.reason, requiredPlan, onAccessDenied])

  if (!accessResult.hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
})

FeatureGuard.displayName = 'FeatureGuard'

export default FeatureGuard
