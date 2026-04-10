"use client"

import { useSyncExternalStore } from "react"

function subscribeToBreakpoint(breakpoint: number, onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getBreakpointSnapshot(breakpoint: number) {
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches
}

export function useIsMobile(breakpoint = 768) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToBreakpoint(breakpoint, onStoreChange),
    () => getBreakpointSnapshot(breakpoint),
    () => false
  )
}
