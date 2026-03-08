import type { RefObject } from "react";
import type { User as NextAuthUser } from "next-auth";

export interface ExtendedUser extends NextAuthUser {
  clientProfile?: {
    username?: string;
  };
}

export interface ThemeColors {
  background: string;
  cardBg: string;
  cardShadow: string;
  border: string;
  spinnerBorder: string;
  titleColor: string;
  textColor: string;
}

export interface ProfileMenuProps {
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  user: ExtendedUser;
  profilePath: string;
  displayRole: RoleLabel;
  onlineStatus: PresenceStatus;
  onItemClick: () => void;
  onLogout: () => void;
  logoutText: string;
  logoutDescription: string;
}

export const PRESENCE_STATUSES = ['online', 'offline', 'away', 'busy'] as const;
export type PresenceStatus = typeof PRESENCE_STATUSES[number];

export const ROLE_LABELS = ['Admin', 'User', 'Client'] as const;
export type RoleLabel = typeof ROLE_LABELS[number];

export interface ProfileHeaderProps {
  user: ExtendedUser;
  displayRole: RoleLabel;
  onlineStatus: PresenceStatus;
}

export interface MenuItemsProps {
  profilePath: string;
  onItemClick: () => void;
}


