"use client";
import Image from 'next/image';

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
