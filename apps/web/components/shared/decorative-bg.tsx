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
	const rootClasses =
		`overflow-hidden h-[30dvh] ${reverse ? '-mt-60' : '-mt-10'} -z-10 relative ${reverse ? 'rotate-180' : ''} ${className}`.trim();

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
	const rootClasses =
		`absolute h-[20dvh] left-1/2 -translate-x-1/2 ${isFluid ? 'w-3/5' : 'w-5/6'} ${reverse ? 'rotate-180 -top-0' : 'bottom-0'} ${className}`.trim();

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
			<div className="relative isolate h-full">
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

function hashString(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function createSeededRandom(seed: number) {
	let state = seed || 1;

	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 0xffffffff;
	};
}

function randomBetween(random: () => number, min: number, max: number) {
	return random() * (max - min) + min;
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
	const stars = useMemo(() => {
		const random = createSeededRandom(hashString(`${className}|${color}|${glow}`));

		return Array.from({ length: STAR_COUNT }).map((_, index) => {
			const isWhite = random() < 0.25;
			return {
				key: `${index}-${Math.round(randomBetween(random, 0, 1000))}`,
				left: `${randomBetween(random, 0, 100).toFixed(2)}%`,
				delay: `${randomBetween(random, 0, 18).toFixed(2)}s`,
				duration: `${randomBetween(random, 12, 24).toFixed(2)}s`,
				size: `${randomBetween(random, 1.5, 2).toFixed(2)}px`,
				opacity: randomBetween(random, 0.8, 1).toFixed(2),
				color: isWhite ? '#fff' : color,
				glow: isWhite ? false : glow
			};
		});
	}, [className, color, glow]);

	return (
		<>
			<style jsx>{`
				@keyframes star-up {
					0% {
						transform: translateY(0);
						opacity: 1;
					}
					100% {
						transform: translateY(-100vh);
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
				{stars.map((star) => (
					<span
						key={star.key}
						className="absolute rounded-full animate-star-up"
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
