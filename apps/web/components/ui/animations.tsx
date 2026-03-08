"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@heroui/react';

// Types pour les animations
export type AnimationType = 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'bounceIn';
export type AnimationDuration = 'fast' | 'normal' | 'slow';
export type AnimationEasing = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';

interface AnimationProps {
  children: React.ReactNode;
  type?: AnimationType;
  duration?: AnimationDuration;
  easing?: AnimationEasing;
  delay?: number;
  className?: string;
  trigger?: boolean;
  onAnimationComplete?: () => void;
}

// Duration mapping
const durationMap: Record<AnimationDuration, string> = {
  fast: 'duration-200',
  normal: 'duration-300',
  slow: 'duration-500',
};

// Easing mapping
const easingMap: Record<AnimationEasing, string> = {
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Animation mapping
const animationMap: Record<AnimationType, { initial: string; animate: string }> = {
  fadeIn: {
    initial: 'opacity-0',
    animate: 'opacity-100',
  },
  slideUp: {
    initial: 'opacity-0 translate-y-4',
    animate: 'opacity-100 translate-y-0',
  },
  slideDown: {
    initial: 'opacity-0 -translate-y-4',
    animate: 'opacity-100 translate-y-0',
  },
  slideLeft: {
    initial: 'opacity-0 translate-x-4',
    animate: 'opacity-100 translate-x-0',
  },
  slideRight: {
    initial: 'opacity-0 -translate-x-4',
    animate: 'opacity-100 translate-x-0',
  },
  scaleIn: {
    initial: 'opacity-0 scale-95',
    animate: 'opacity-100 scale-100',
  },
  bounceIn: {
    initial: 'opacity-0 scale-50',
    animate: 'opacity-100 scale-100',
  },
};

// Composant d'animation principal
export function AnimatedContainer({
  children,
  type = 'fadeIn',
  duration = 'normal',
  easing = 'ease-out',
  delay = 0,
  className,
  trigger = true,
  onAnimationComplete,
}: AnimationProps) {
  const [isVisible, setIsVisible] = useState(!trigger);

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        if (onAnimationComplete) {
          setTimeout(onAnimationComplete, 300); // Approximate delay for animation
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [trigger, delay, onAnimationComplete]);

  const animation = animationMap[type];
  const durationClass = durationMap[duration];

  return (
    <div
      className={cn(
        'transition-[opacity,transform]',
        durationClass,
        isVisible ? animation.animate : animation.initial,
        className
      )}
      style={{
        transitionTimingFunction: easingMap[easing],
      }}
    >
      {children}
    </div>
  );
}

// Component for staggered animations
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
  animationType?: AnimationType;
  duration?: AnimationDuration;
}

export function StaggerContainer({
  children,
  staggerDelay = 100,
  className,
  animationType = 'slideUp',
  duration = 'normal',
}: StaggerContainerProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedContainer
          key={index}
          type={animationType}
          duration={duration}
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  );
}

// Hook pour les animations au scroll
export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [elementRef, setElementRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!elementRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(elementRef);
        }
      },
      { threshold }
    );

    observer.observe(elementRef);

    return () => {
      if (elementRef) observer.unobserve(elementRef);
    };
  }, [elementRef, threshold]);

  return { isVisible, ref: setElementRef };
}

// Component for scroll animations
interface ScrollAnimationProps extends AnimationProps {
  threshold?: number;
}

export function ScrollAnimation({
  children,
  threshold = 0.1,
  ...animationProps
}: ScrollAnimationProps) {
  const { isVisible, ref } = useScrollAnimation(threshold);

  return (
    <div ref={ref}>
      <AnimatedContainer {...animationProps} trigger={isVisible}>
        {children}
      </AnimatedContainer>
    </div>
  );
}

// Composant pour les micro-interactions
interface MicroInteractionProps {
  children: React.ReactNode;
  hoverScale?: number;
  tapScale?: number;
  className?: string;
}

export function MicroInteraction({
  children,
  hoverScale = 1.02,
  tapScale = 0.98,
  className,
}: MicroInteractionProps) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out cursor-pointer',
        className
      )}
      style={{
        '--hover-scale': hoverScale,
        '--tap-scale': tapScale,
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${hoverScale})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = `scale(${tapScale})`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = `scale(${hoverScale})`;
      }}
    >
      {children}
    </div>
  );
}

// Composant pour les transitions de page
interface PageTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
}

export function PageTransition({ children, isVisible, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        'transition-[opacity,transform] duration-300 ease-in-out',
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95',
        className
      )}
    >
      {children}
    </div>
  );
}

// Component for loading animations
export function LoadingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative">
        <div className="w-8 h-8 border-4 border-theme-primary/20 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-theme-primary rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

// Component for success animations
export function SuccessAnimation({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
          <svg
            className="w-6 h-6 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
