"use client";

import { cn } from '@heroui/react';

// Modern login illustration
export function LoginIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full h-full flex items-center justify-center', className)}>
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full max-w-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background with gradient */}
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--theme-primary-100)" />
            <stop offset="100%" stopColor="var(--theme-primary-200)" />
          </linearGradient>
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>
        
        {/* Background shapes */}
        <circle cx="320" cy="80" r="60" fill="var(--theme-primary-100)" opacity="0.3" />
        <circle cx="80" cy="220" r="40" fill="var(--theme-accent-100)" opacity="0.4" />
        
        {/* Computer screen */}
        <rect x="100" y="80" width="200" height="140" rx="8" fill="url(#cardGradient)" stroke="var(--theme-primary-300)" strokeWidth="2" />
        <rect x="110" y="90" width="180" height="100" rx="4" fill="var(--theme-primary-50)" />
        
        {/* Login interface */}
        <rect x="120" y="110" width="160" height="8" rx="4" fill="var(--theme-primary-200)" />
        <rect x="120" y="130" width="120" height="8" rx="4" fill="var(--theme-primary-200)" />
        <rect x="120" y="150" width="80" height="20" rx="10" fill="var(--theme-primary)" />
        
        {/* Security icon */}
        <circle cx="200" cy="50" r="20" fill="var(--theme-primary)" opacity="0.1" />
        <path
          d="M190 45 L200 40 L210 45 L210 55 C210 60 205 65 200 65 C195 65 190 60 190 55 Z"
          fill="var(--theme-primary)"
        />
        <circle cx="200" cy="52" r="3" fill="white" />
        
        {/* Particules flottantes */}
        <circle cx="150" cy="40" r="3" fill="var(--theme-accent)" opacity="0.6">
          <animate attributeName="cy" values="40;35;40" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="60" r="2" fill="var(--theme-primary)" opacity="0.8">
          <animate attributeName="cy" values="60;55;60" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="130" cy="250" r="2.5" fill="var(--theme-accent)" opacity="0.7">
          <animate attributeName="cy" values="250;245;250" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// Modern signup illustration
export function SignupIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full h-full flex items-center justify-center', className)}>
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full max-w-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="signupBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--theme-accent-100)" />
            <stop offset="100%" stopColor="var(--theme-accent-200)" />
          </linearGradient>
        </defs>
        
        {/* Formes d'arrière-plan */}
        <circle cx="80" cy="60" r="50" fill="var(--theme-accent-100)" opacity="0.3" />
        <circle cx="320" cy="240" r="35" fill="var(--theme-primary-100)" opacity="0.4" />
        
        {/* Personnage stylisé */}
        <circle cx="200" cy="120" r="30" fill="var(--theme-primary-100)" />
        <circle cx="200" cy="115" r="25" fill="var(--theme-primary-200)" />
        <circle cx="200" cy="110" r="20" fill="var(--theme-primary)" />
        
        {/* Corps */}
        <rect x="180" y="140" width="40" height="60" rx="20" fill="var(--theme-primary-100)" />
        
        {/* Bras */}
        <circle cx="165" cy="160" r="12" fill="var(--theme-primary-200)" />
        <circle cx="235" cy="160" r="12" fill="var(--theme-primary-200)" />
        
        {/* Éléments de bienvenue */}
        <rect x="120" y="220" width="160" height="40" rx="20" fill="white" stroke="var(--theme-primary-200)" strokeWidth="2" />
        <text x="200" y="245" textAnchor="middle" fill="var(--theme-primary)" fontSize="14" fontWeight="600">
          Welcome!
        </text>
        
        {/* Étoiles de célébration */}
        <g fill="var(--theme-accent)" opacity="0.8">
          <path d="M150 80 L152 85 L157 85 L153 88 L155 93 L150 90 L145 93 L147 88 L143 85 L148 85 Z">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 150 80;360 150 80"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M270 100 L272 105 L277 105 L273 108 L275 113 L270 110 L265 113 L267 108 L263 105 L268 105 Z">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 270 100;-360 270 100"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
        </g>
        
        {/* Particules de joie */}
        <circle cx="130" cy="50" r="2" fill="var(--theme-primary)" opacity="0.6">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="280" cy="70" r="3" fill="var(--theme-accent)" opacity="0.7">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// Animated background component
export function AnimatedBackground({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-theme-primary/5 rounded-full blur-3xl animate-pulse-subtle" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-theme-accent/5 rounded-full blur-3xl animate-pulse-subtle animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-theme-secondary/3 rounded-full blur-3xl animate-pulse-subtle animation-delay-4000" />
    </div>
  );
}

// Animated security icon
export function SecurityIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-theme-primary', className)}
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M24 8L32 12V22C32 28 28 33.5 24 36C20 33.5 16 28 16 22V12L24 8Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M24 12L28 14V20C28 24 26 27 24 28C22 27 20 24 20 20V14L24 12Z"
        fill="currentColor"
      />
      <circle cx="24" cy="20" r="2" fill="white" />
      <rect x="23" y="22" width="2" height="4" fill="white" />
    </svg>
  );
}

// Community icon
export function CommunityIcon({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-theme-accent"
      >
        <circle cx="18" cy="16" r="6" fill="currentColor" fillOpacity="0.2" />
        <circle cx="30" cy="16" r="6" fill="currentColor" fillOpacity="0.2" />
        <circle cx="24" cy="28" r="6" fill="currentColor" fillOpacity="0.2" />
        
        <circle cx="18" cy="16" r="4" fill="currentColor" />
        <circle cx="30" cy="16" r="4" fill="currentColor" />
        <circle cx="24" cy="28" r="4" fill="currentColor" />
        
        <path
          d="M18 20C18 20 20 22 24 22C28 22 30 20 30 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 24C20 24 22 26 24 26C26 26 28 24 28 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

// Decorative component with geometric shapes
export function GeometricDecoration({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-4 h-4 bg-theme-primary/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 right-20 w-3 h-3 bg-theme-accent/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-20 left-20 w-5 h-5 bg-theme-secondary/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-10 right-10 w-2 h-2 bg-theme-primary/40 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
      
      {/* Decorative lines */}
      <div className="absolute top-1/4 left-0 w-20 h-px bg-linear-to-r from-transparent via-theme-primary/30 to-transparent" />
      <div className="absolute bottom-1/4 right-0 w-20 h-px bg-linear-to-l from-transparent via-theme-accent/30 to-transparent" />
    </div>
  );
}

// Trust badge component
export function TrustBadge({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300', className)}>
      <SecurityIcon className="w-5 h-5" />
      <span>Secured by SSL</span>
    </div>
  );
}
