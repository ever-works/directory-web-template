"use client";

import { cn } from '@heroui/react';

// Directory browser illustration for login
export function LoginIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft ambient blobs */}
        <circle cx="340" cy="50" r="90" fill="var(--theme-primary)" opacity="0.04" />
        <circle cx="60" cy="260" r="75" fill="var(--theme-accent)" opacity="0.04" />

        {/* App window frame */}
        <rect x="48" y="22" width="304" height="244" rx="14" fill="white" fillOpacity="0.92" stroke="var(--theme-primary)" strokeWidth="1" strokeOpacity="0.12" />
        {/* Titlebar - path with rounded top corners only */}
        <path d="M 62 22 Q 48 22 48 36 L 48 62 L 352 62 L 352 36 Q 352 22 338 22 Z" fill="var(--theme-primary)" fillOpacity="0.05" />
        {/* Window chrome dots */}
        <circle cx="70" cy="42" r="4.5" fill="#ff5f57" opacity="0.65" />
        <circle cx="86" cy="42" r="4.5" fill="#febc2e" opacity="0.65" />
        <circle cx="102" cy="42" r="4.5" fill="#28c840" opacity="0.65" />
        {/* Titlebar label */}
        <rect x="155" y="38" width="90" height="7" rx="3.5" fill="var(--theme-primary)" opacity="0.12" />

        {/* Search bar */}
        <rect x="64" y="72" width="272" height="28" rx="7" fill="white" stroke="var(--theme-primary)" strokeWidth="1" strokeOpacity="0.2" />
        <circle cx="82" cy="86" r="5.5" stroke="var(--theme-primary)" strokeWidth="1.5" opacity="0.45" fill="none" />
        <line x1="86" y1="91" x2="90" y2="95" stroke="var(--theme-primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        <rect x="97" y="83" width="76" height="6" rx="3" fill="var(--theme-primary)" opacity="0.08" />
        {/* Filter icon */}
        <rect x="310" y="77" width="18" height="18" rx="5" fill="var(--theme-primary)" fillOpacity="0.08" />
        <line x1="313" y1="83" x2="325" y2="83" stroke="var(--theme-primary)" strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
        <line x1="315" y1="87" x2="323" y2="87" stroke="var(--theme-primary)" strokeWidth="1.3" opacity="0.28" strokeLinecap="round" />
        <line x1="317" y1="91" x2="321" y2="91" stroke="var(--theme-primary)" strokeWidth="1.3" opacity="0.16" strokeLinecap="round" />

        {/* Category tabs */}
        <rect x="64" y="110" width="42" height="15" rx="7.5" fill="var(--theme-primary)" fillOpacity="0.12" />
        <rect x="111" y="110" width="36" height="15" rx="7.5" fill="var(--theme-primary)" fillOpacity="0.05" />
        <rect x="152" y="110" width="30" height="15" rx="7.5" fill="var(--theme-primary)" fillOpacity="0.05" />

        {/* ── Row 1 cards ── */}

        {/* Card 1 – selected, AI Agent */}
        <rect x="64" y="136" width="88" height="68" rx="10" fill="var(--theme-primary)" fillOpacity="0.06" stroke="var(--theme-primary)" strokeWidth="1.5" strokeOpacity="0.5" />
        <rect x="74" y="146" width="24" height="24" rx="6" fill="var(--theme-primary)" fillOpacity="0.18" />
        {/* Robot head */}
        <rect x="77" y="150" width="18" height="13" rx="3" fill="var(--theme-primary)" opacity="0.38" />
        <circle cx="82" cy="156" r="2" fill="var(--theme-primary)" opacity="0.7" />
        <circle cx="89" cy="156" r="2" fill="var(--theme-primary)" opacity="0.7" />
        <rect x="82" y="163" width="7" height="3" rx="1.5" fill="var(--theme-primary)" opacity="0.22" />
        <rect x="85" y="147" width="2" height="3.5" rx="1" fill="var(--theme-primary)" opacity="0.4" />
        <rect x="74" y="177" width="64" height="5.5" rx="2.75" fill="var(--theme-primary)" opacity="0.35" />
        <rect x="74" y="187" width="44" height="4" rx="2" fill="var(--theme-primary)" opacity="0.18" />
        {/* NEW badge */}
        <rect x="116" y="141" width="26" height="13" rx="6.5" fill="var(--theme-primary)" />
        <rect x="120" y="145" width="18" height="5" rx="2.5" fill="white" opacity="0.82" />

        {/* Card 2 – Code / Runtime */}
        <rect x="162" y="136" width="88" height="68" rx="10" fill="white" stroke="var(--theme-primary)" strokeWidth="0.75" strokeOpacity="0.14" />
        <rect x="172" y="146" width="24" height="24" rx="6" fill="var(--theme-accent)" fillOpacity="0.12" />
        {/* Code brackets */}
        <path d="M178 153 L174 158 L178 163" stroke="var(--theme-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        <path d="M190 153 L194 158 L190 163" stroke="var(--theme-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        <line x1="183" y1="158" x2="185" y2="158" stroke="var(--theme-accent)" strokeWidth="1.5" opacity="0.3" />
        <rect x="172" y="177" width="64" height="5.5" rx="2.75" fill="var(--theme-primary)" opacity="0.12" />
        <rect x="172" y="187" width="44" height="4" rx="2" fill="var(--theme-primary)" opacity="0.07" />

        {/* Card 3 – Git / Open Source */}
        <rect x="260" y="136" width="88" height="68" rx="10" fill="white" stroke="var(--theme-primary)" strokeWidth="0.75" strokeOpacity="0.14" />
        <rect x="270" y="146" width="24" height="24" rx="6" fill="var(--theme-secondary)" fillOpacity="0.12" />
        {/* Git branch icon */}
        <circle cx="278" cy="152" r="2.5" fill="var(--theme-secondary)" opacity="0.5" />
        <circle cx="286" cy="165" r="2.5" fill="var(--theme-secondary)" opacity="0.5" />
        <circle cx="285" cy="152" r="2.5" fill="var(--theme-secondary)" opacity="0.3" />
        <line x1="278" y1="154.5" x2="286" y2="162.5" stroke="var(--theme-secondary)" strokeWidth="1.4" opacity="0.38" />
        <path d="M285 154.5 Q285 159 286 162.5" stroke="var(--theme-secondary)" strokeWidth="1.4" fill="none" opacity="0.3" />
        <rect x="270" y="177" width="64" height="5.5" rx="2.75" fill="var(--theme-primary)" opacity="0.12" />
        <rect x="270" y="187" width="44" height="4" rx="2" fill="var(--theme-primary)" opacity="0.07" />

        {/* ── Row 2 cards (partial) ── */}
        <rect x="64" y="214" width="88" height="40" rx="10" fill="white" stroke="var(--theme-primary)" strokeWidth="0.75" strokeOpacity="0.09" />
        <rect x="74" y="224" width="20" height="20" rx="5" fill="var(--theme-accent)" fillOpacity="0.1" />
        <rect x="74" y="250" width="56" height="4" rx="2" fill="var(--theme-primary)" opacity="0.07" />

        <rect x="162" y="214" width="88" height="40" rx="10" fill="white" stroke="var(--theme-primary)" strokeWidth="0.75" strokeOpacity="0.09" />
        <rect x="172" y="224" width="20" height="20" rx="5" fill="var(--theme-primary)" fillOpacity="0.1" />
        <rect x="172" y="250" width="56" height="4" rx="2" fill="var(--theme-primary)" opacity="0.07" />

        <rect x="260" y="214" width="88" height="40" rx="10" fill="white" stroke="var(--theme-primary)" strokeWidth="0.75" strokeOpacity="0.09" />
        <rect x="270" y="224" width="20" height="20" rx="5" fill="var(--theme-secondary)" fillOpacity="0.1" />
        <rect x="270" y="250" width="56" height="4" rx="2" fill="var(--theme-primary)" opacity="0.07" />

        {/* Floating particles */}
        <circle cx="22" cy="100" r="3" fill="var(--theme-primary)" opacity="0.3">
          <animate attributeName="cy" values="100;94;100" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="378" cy="158" r="2" fill="var(--theme-accent)" opacity="0.38">
          <animate attributeName="cy" values="158;152;158" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="362" cy="280" r="2.5" fill="var(--theme-secondary)" opacity="0.28">
          <animate attributeName="cy" values="280;274;280" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// Agent network graph illustration for signup
export function SignupIllustration({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft ambient blobs */}
        <circle cx="70" cy="55" r="85" fill="var(--theme-accent)" opacity="0.04" />
        <circle cx="335" cy="255" r="70" fill="var(--theme-primary)" opacity="0.04" />

        {/* Network connection lines */}
        <line x1="200" y1="150" x2="118" y2="78" stroke="var(--theme-primary)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />
        <line x1="200" y1="150" x2="296" y2="82" stroke="var(--theme-primary)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />
        <line x1="200" y1="150" x2="328" y2="180" stroke="var(--theme-accent)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />
        <line x1="200" y1="150" x2="277" y2="248" stroke="var(--theme-accent)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />
        <line x1="200" y1="150" x2="114" y2="238" stroke="var(--theme-secondary)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />
        <line x1="200" y1="150" x2="70" y2="168" stroke="var(--theme-secondary)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.2" />

        {/* Node 1 – top-left: AI Agent (robot) */}
        <circle cx="118" cy="78" r="27" fill="var(--theme-primary)" fillOpacity="0.07" stroke="var(--theme-primary)" strokeWidth="1.5" strokeOpacity="0.28" />
        <rect x="109" y="68" width="18" height="13" rx="3.5" fill="var(--theme-primary)" opacity="0.28" />
        <circle cx="114" cy="74" r="2" fill="var(--theme-primary)" opacity="0.6" />
        <circle cx="122" cy="74" r="2" fill="var(--theme-primary)" opacity="0.6" />
        <rect x="113" y="81" width="10" height="5" rx="2" fill="var(--theme-primary)" opacity="0.18" />
        <rect x="117.5" y="65.5" width="2" height="3.5" rx="1" fill="var(--theme-primary)" opacity="0.4" />

        {/* Node 2 – top-right: Code / Runtime */}
        <circle cx="296" cy="82" r="25" fill="var(--theme-accent)" fillOpacity="0.07" stroke="var(--theme-accent)" strokeWidth="1.5" strokeOpacity="0.28" />
        <path d="M285 76 L280 82 L285 88" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <path d="M307 76 L312 82 L307 88" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <line x1="292" y1="82" x2="300" y2="82" stroke="var(--theme-accent)" strokeWidth="1.4" opacity="0.28" strokeDasharray="2 2" />

        {/* Node 3 – right: Git */}
        <circle cx="328" cy="180" r="24" fill="var(--theme-secondary)" fillOpacity="0.07" stroke="var(--theme-secondary)" strokeWidth="1.5" strokeOpacity="0.28" />
        <circle cx="320" cy="173" r="3.5" fill="var(--theme-secondary)" opacity="0.45" />
        <circle cx="334" cy="173" r="3.5" fill="var(--theme-secondary)" opacity="0.45" />
        <circle cx="328" cy="187" r="3.5" fill="var(--theme-secondary)" opacity="0.45" />
        <line x1="323" y1="174" x2="328" y2="187" stroke="var(--theme-secondary)" strokeWidth="1.5" opacity="0.35" />
        <path d="M331 174 Q335 179 328 187" stroke="var(--theme-secondary)" strokeWidth="1.5" fill="none" opacity="0.35" />

        {/* Node 4 – bottom-right: Star / Featured */}
        <circle cx="277" cy="248" r="24" fill="var(--theme-primary)" fillOpacity="0.07" stroke="var(--theme-primary)" strokeWidth="1.5" strokeOpacity="0.28" />
        <path d="M277 237 L279.6 244.5 L287.5 244.5 L281.3 249.5 L283.7 257 L277 252 L270.3 257 L272.7 249.5 L266.5 244.5 L274.4 244.5 Z" fill="var(--theme-primary)" opacity="0.32" />

        {/* Node 5 – bottom-left: Web / Content */}
        <circle cx="114" cy="238" r="24" fill="var(--theme-accent)" fillOpacity="0.07" stroke="var(--theme-accent)" strokeWidth="1.5" strokeOpacity="0.28" />
        <circle cx="114" cy="238" r="10" stroke="var(--theme-accent)" strokeWidth="1.5" opacity="0.36" fill="none" />
        <ellipse cx="114" cy="238" rx="5.5" ry="10" stroke="var(--theme-accent)" strokeWidth="1" opacity="0.22" fill="none" />
        <line x1="104" y1="238" x2="124" y2="238" stroke="var(--theme-accent)" strokeWidth="1" opacity="0.26" />
        <line x1="106" y1="232" x2="122" y2="232" stroke="var(--theme-accent)" strokeWidth="1" opacity="0.16" />
        <line x1="106" y1="244" x2="122" y2="244" stroke="var(--theme-accent)" strokeWidth="1" opacity="0.16" />

        {/* Node 6 – left: Automation / Lightning */}
        <circle cx="70" cy="168" r="22" fill="var(--theme-secondary)" fillOpacity="0.07" stroke="var(--theme-secondary)" strokeWidth="1.5" strokeOpacity="0.28" />
        <path d="M75 158 L65 168 L71 168 L65 178 L75 168 L69 168 Z" fill="var(--theme-secondary)" opacity="0.4" />

        {/* Central node – new member joining */}
        {/* Pulsing outer ring */}
        <circle cx="200" cy="150" r="44" fill="none" stroke="var(--theme-primary)" strokeWidth="1" opacity="0.1">
          <animate attributeName="r" values="44;58;44" dur="2.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0;0.25" dur="2.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="150" r="44" fill="var(--theme-primary)" fillOpacity="0.04" stroke="var(--theme-primary)" strokeWidth="1" strokeOpacity="0.14" />
        <circle cx="200" cy="150" r="34" fill="var(--theme-primary)" fillOpacity="0.08" stroke="var(--theme-primary)" strokeWidth="2" strokeOpacity="0.45" />
        {/* Plus icon */}
        <rect x="194" y="136" width="12" height="28" rx="4" fill="var(--theme-primary)" opacity="0.6" />
        <rect x="186" y="144" width="28" height="12" rx="4" fill="var(--theme-primary)" opacity="0.6" />

        {/* Floating particles */}
        <circle cx="20" cy="115" r="2.5" fill="var(--theme-primary)" opacity="0.28">
          <animate attributeName="cy" values="115;109;115" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="380" cy="95" r="2" fill="var(--theme-accent)" opacity="0.36">
          <animate attributeName="cy" values="95;89;95" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="355" cy="275" r="2.5" fill="var(--theme-secondary)" opacity="0.26">
          <animate attributeName="cy" values="275;269;275" dur="2s" repeatCount="indefinite" />
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
