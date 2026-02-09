"use client";
import Image from 'next/image';

type DecorativeBgProps = {
  className?: string;
};

export default function DecorativeBg({ className = '' }: DecorativeBgProps) {
  return (
    <div className={`overflow-hidden h-[30dvh] -mt-40 -z-10 relative ${className}`}>
      <div className="w-4/6 h-full mx-auto -mt-18 relative flex items-end justify-center">
        <Image
          src="/bg-pattern.png"
          alt="Decorative pattern"
          className="w-full z-20 -mb-20 filter brightness-0 dark:brightness-100"
          width={800}
          height={400}
        />

        <div className="w-[95rem] h-[82rem] rounded-full bg-[#6209bb]/90 blur-3xl z-10 absolute left-1/2 -translate-x-1/2 -bottom-[81rem] dark:opacity-25 opacity-10 animate-bg-cycle motion-reduce:animate-none"></div>
      </div>
    </div>
  );
}
