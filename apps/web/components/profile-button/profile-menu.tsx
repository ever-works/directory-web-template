import { memo } from "react";
import { cn } from "@/lib/utils";
import { ExtendedUser, RoleLabel, PresenceStatus } from "@/types/profile-button.types";
import { MENU_STYLES } from "@/constants/profile-button.constants";
import ProfileHeader from "./profile-header";
import MenuItems from "./menu-items";
import LogoutButton from "./logout-button";

interface ProfileMenuProps {
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  user: ExtendedUser | null;
  profilePath: string;
  displayRole: RoleLabel;
  onlineStatus: PresenceStatus;
  onItemClick: () => void;
  onNavigationStart?: () => void;
  onNavigationEnd?: () => void;
  isNavigating?: boolean;
  onLogout: () => void | Promise<void>;
  logoutText: string;
  logoutDescription?: string;
}

function ProfileMenu({
  isOpen,
  menuRef,
  user,
  profilePath,
  displayRole,
  onlineStatus,
  onItemClick,
  onNavigationStart,
  onNavigationEnd,
  isNavigating,
  onLogout,
  logoutText,
  logoutDescription,
}: ProfileMenuProps) {
  if (!isOpen || !user) return null;


  return (
    <div
      ref={menuRef}
      id="profile-menu"
      className={cn(
        MENU_STYLES.CONTAINER.base,
        MENU_STYLES.CONTAINER.background,
        MENU_STYLES.CONTAINER.border,
        MENU_STYLES.CONTAINER.animation,
        "max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain" // Ensure menu doesn't exceed viewport height and can scroll
      )}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="user-menu-button"
    >
      <ProfileHeader
        user={user}
        displayRole={displayRole}
        onlineStatus={onlineStatus}
      />

      <MenuItems
        user={user}
        profilePath={profilePath}
        onItemClick={onItemClick}
        onNavigationStart={onNavigationStart}
        onNavigationEnd={onNavigationEnd}
        isNavigating={isNavigating}
      />

      {/* Separator */}
      <div className="border-t border-gray-100/50 dark:border-white/6"></div>

      <LogoutButton onLogout={onLogout} logoutText={logoutText} logoutDescription={logoutDescription} />
    </div>
  );
}

// Export memoized component for better performance
export default memo(ProfileMenu);
