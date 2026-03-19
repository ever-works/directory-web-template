'use client';
import Image from 'next/image';
import { useContainerWidth } from '@/components/ui/container';
import React, { useMemo } from 'react';

type DecorativeBgProps = {
  className?: string;
  reverse?: boolean;
};

export default function DecorativeBg({ className = '', reverse = false }: DecorativeBgProps) {
  // When reversed we rotate the whole decorative block so it mirrors vertically.
  // We also adjust the top margin to avoid pulling content unexpectedly.
  const rootClasses = `overflow-hidden h-[30dvh] ${reverse ? '-mt-72' : '-mt-40'} -z-10 relative ${reverse ? 'rotate-180' : ''
    } ${className}`.trim();

  return (
    <div className={rootClasses}>
      <div className="w-4/6 h-full mx-auto -mt-18 relative flex items-end justify-center">
        <Image
          src="/bg-pattern.png"
          alt="Decorative pattern"
          className="w-full z-20 -mb-20 filter brightness-0 dark:brightness-200"
          width={800}
          height={400}
        />
      </div>
    </div>
  );
}

export function DotBgsible({ className = '', reverse = false }: { className?: string; reverse?: boolean }) {
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === 'fluid';
  const rootClasses = `absolute h-[20dvh] left-1/2 -translate-x-1/2 ${isFluid ? 'w-3/5' : 'w-5/6'} ${reverse ? 'rotate-180 -top-0' : 'bottom-0'
    } ${className}`.trim();

  return (
    <div className={rootClasses}>
      <div className="w-full h-full mx-auto relative flex items-end justify-center">
        <Image src="/bg-pattern.png" alt="Decorative pattern" fill className="z-20" />
      </div>
    </div>
  );
}

export function GridBackground({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute overflow-hidden ${className}`}>
      <div className={`relative isolate h-full`}>
        {/* Masked grid background */}
        <div
          style={{
            backgroundImage: 'url(/bg-grid.png)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%)'
          }}
          className="absolute inset-0 bg-[position-y:9px] bg-[size:100px_100px] z-0 opacity-5 dark:opacity-40"
        />
        {/* Stars overlay */}
        <StarsBackground className="z-20" color="#6209bb" glow />
        <div
          className="w-[95rem] h-[82rem] rounded-full z-10 absolute left-1/2 -translate-x-1/2 -bottom-[78rem] dark:opacity-25 opacity-10"
          style={{ background: 'radial-gradient(ellipse at center, rgba(98,9,187,0.9) 0%, transparent 70%)' }}
        ></div>
        {/* Content slot */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

const STAR_COUNT = 20;

function randomBetween(a: number, b: number) {
  return Math.random() * (b - a) + a;
}

export function StarsBackground({
  className = '',
  color = '#fff',
  glow = false
}: {
  className?: string;
  color?: string;
  glow?: boolean;
}) {
  // Memoize stars so they don't re-randomize on every render
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }).map(() => {
        const isWhite = Math.random() < 0.25; // 25% of stars are pure white
        return {
          left: `${randomBetween(0, 100)}%`,
          // increase delay range so stars start more staggered
          delay: `${randomBetween(0, 18)}s`,
          // slow down animation durations to create a gentler upward motion
          duration: `${randomBetween(12, 24)}s`,
          size: `${randomBetween(1.5, 2)}px`,
          opacity: `${randomBetween(0.8, 1)}`,
          color: isWhite ? '#fff' : color,
          glow: isWhite ? false : glow
        };
      }),
    [color, glow]
  );

  return (
    <>
      {/* Scoped CSS for the upward animation */}
      <style jsx>{`
				@keyframes star-up {
					0% {
						transform: translateY(0);
						opacity: 1;
					}
					100% {
						transform: translateY(-100vh); /* Move stars out of view */
						opacity: 0;
					}
				}
				.animate-star-up {
					animation: star-up linear infinite;
				}
			`}</style>

      <div
        className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        {/* Line at the bottom where stars start */}
        <div className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#6209bb]/40 to-transparent z-30" />
        {stars.map((star, i) => (
          <span
            key={i}
            className={`absolute rounded-full animate-star-up`}
            style={{
              left: star.left,
              bottom: -5,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              background: star.color,
              boxShadow: star.glow ? `0 0 8px ${star.color}` : undefined,
              willChange: 'transform',
              animationDelay: star.delay,
              animationDuration: star.duration
            }}
          />
        ))}
      </div>
    </>
  );
}
