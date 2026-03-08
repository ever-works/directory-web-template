import { useState, useRef, useEffect, useCallback } from "react";

export function useProfileMenu() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setIsProfileMenuOpen(false);
      // Restore focus to trigger button
      buttonRef.current?.focus();
    }
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsProfileMenuOpen(false);
      // Restore focus to trigger button
      buttonRef.current?.focus();
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (isProfileMenuOpen && typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [isProfileMenuOpen, handleClickOutside]);

  // Close menu with Escape key
  useEffect(() => {
    if (isProfileMenuOpen && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleEscape);
      }
    };
  }, [isProfileMenuOpen, handleEscape]);

  const toggleMenu = useCallback(() => {
    setIsProfileMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsProfileMenuOpen(false);
    // Restore focus to trigger button
    buttonRef.current?.focus();
  }, []);

  return {
    isProfileMenuOpen,
    menuRef,
    buttonRef,
    toggleMenu,
    closeMenu,
  };
}
