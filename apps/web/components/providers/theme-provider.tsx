'use client';

import { PropsWithChildren } from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <NextThemeProvider
      enableSystem={true}
      attribute="class"
      defaultTheme="system"
    >
      {children}
    </NextThemeProvider>
  );
} 