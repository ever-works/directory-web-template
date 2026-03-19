import { NAME_LIMITS } from "@/constants/profile-button.constants";
import type { ThemeColors, RoleLabel, PresenceStatus } from "@/types/profile-button.types";

/**
 * Formats display name intelligently based on length and word count
 */
export const formatDisplayName = (name: string): string => {
  if (!name) return "User";
  
  // If name is short, display as is
  if (name.length <= NAME_LIMITS.MAX_DISPLAY_LENGTH) return name;
  
  // Split name into words
  const words = name.split(' ').filter(word => word.length > 0);
  
  // If single word, truncate it
  if (words.length === 1) {
    return name.substring(0, NAME_LIMITS.TRUNCATE_LENGTH) + '...';
  }
  
  // If two words, keep them
  if (words.length === 2) {
    return words.join(' ');
  }
  
  // If more than two words, take the first two
  return words.slice(0, 2).join(' ') + '...';
};

/**
 * Gets user initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return "U";
  
  const words = name.split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Gets display role based on admin status
 */
export const getDisplayRole = (isAdmin: boolean): RoleLabel => {
  return isAdmin ? "Admin" : "User";
};

/**
 * Gets online status (currently hardcoded, could be dynamic in future)
 */
export const getOnlineStatus = (): PresenceStatus => {
  return "online";
};

/**
 * Builds stable, URL-safe profile path with proper encoding
 */
export const getProfilePath = (user: { 
  username?: string; 
  clientProfile?: { username?: string }; 
  email?: string | null; 
} | null): string => {
  const username =
    user?.username ||
    user?.clientProfile?.username ||
    (user?.email ? user.email.split("@")[0] : undefined) ||
    "profile";
  
  return `/client/profile/${encodeURIComponent(username)}`;
};

/**
 * Gets current theme colors for logout overlay
 */
export const getThemeColors = (): ThemeColors => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  return {
    background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
    cardBg: isDark 
      ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    cardShadow: isDark 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
    spinnerBorder: isDark ? '#374151' : '#e5e7eb',
    titleColor: isDark ? '#f9fafb' : '#1f2937',
    textColor: isDark ? '#9ca3af' : '#6b7280'
  };
};
