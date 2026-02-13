"use client";
import Image from 'next/image';
import { useContainerWidth } from '@/components/ui/container';

type DecorativeBgProps = {
  className?: string;
  reverse?: boolean;
};

export default function DecorativeBg({ className = '', reverse = false }: DecorativeBgProps) {
  // When reversed we rotate the whole decorative block so it mirrors vertically.
  // We also adjust the top margin to avoid pulling content unexpectedly.
  const rootClasses = `overflow-hidden h-[30dvh] ${reverse ? '-mt-72' : '-mt-40'} -z-10 relative ${
    reverse ? 'rotate-180' : ''
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

        <div className="w-[95rem] h-[82rem] rounded-full bg-[#6209bb]/90 blur-3xl z-10 absolute left-1/2 -translate-x-1/2 -bottom-[81rem] dark:opacity-25 opacity-10 animate-bg-cycle motion-reduce:animate-none"></div>
      </div>
    </div>
  );
}

export function DotBgsible({ className = '', reverse = false }: { className?: string; reverse?: boolean }) {
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === 'fluid';
  const rootClasses = `absolute h-[20dvh] left-1/2 -translate-x-1/2 ${isFluid ? 'w-3/5' : 'w-5/6'} ${
    reverse ? 'rotate-180 -top-0' : 'bottom-0'
  } ${className}`.trim();

  return (
    <div className={rootClasses}>
      <div className="w-full h-full mx-auto relative flex items-end justify-center">
        <Image
          src="/bg-pattern.png"
          alt="Decorative pattern"
          fill
          className="z-20 filter brightness-0 dark:brightness-200"
        />
      </div>
    </div>
  );
}
