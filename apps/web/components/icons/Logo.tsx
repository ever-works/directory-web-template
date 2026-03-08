import React from "react";
import { IconEverworks, IconEverworksSimple } from "./Icons";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  variant?: "full" | "simple";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
  full: "w-full h-full",
};

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  variant = "simple",
  className = "",
}) => {
  const sizeClass = sizeClasses[size];
  const combinedClassName = `${sizeClass} ${className}`.trim();

  return (
    <div className={combinedClassName}>
      {variant === "full" ? <IconEverworks /> : <IconEverworksSimple />}
    </div>
  );
};

export const NavLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative ${className || ""}`}>
      <Logo size="sm" variant="simple" className="transition-transform duration-300 hover:scale-110" />
    </div>
  );
};

export const FooterLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative group ${className || ""}`}>
      <Logo size="lg" variant="full" className="transition-opacity duration-300 group-hover:opacity-90" />
      <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export const HeaderLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative ${className || ""}`}>
      <IconEverworksSimple className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-300 hover:scale-110" />
      <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-xs opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export const FooterLogoCompact: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative group ${className || ""}`}>
      <IconEverworks className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}; 