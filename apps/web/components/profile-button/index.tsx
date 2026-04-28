"use client";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { Avatar } from "../header/avatar";
import { cn } from "@/lib/utils";
import { useProfileMenu } from "@/hooks/use-profile-menu";
import { useLogoutOverlay } from "@/hooks/use-logout-overlay";
import { useUserUtils } from "@/hooks/use-user-utils";
import { SIZES, MENU_STYLES } from "@/constants/profile-button.constants";
import { getInitials } from "@/utils/profile-button.utils";
import type { ExtendedUser, PresenceStatus } from "@/types/profile-button.types";

// Lazy load the ProfileMenu component for better performance
const loadProfileMenu = () => import("./profile-menu");
const ProfileMenu = lazy(loadProfileMenu);

// Loading fallback for lazy-loaded component
const MenuLoadingFallback = () => (
  <div className={cn(
    MENU_STYLES.LOADING_FALLBACK.base,
    MENU_STYLES.LOADING_FALLBACK.background,
    MENU_STYLES.LOADING_FALLBACK.border
  )}>
    <div className="px-5 py-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-white/8 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
          <div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse w-3/4"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse"></div>
        <div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm animate-pulse w-2/3"></div>
      </div>
    </div>
  </div>
);

// Memoized loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className={MENU_STYLES.SKELETON.container}>
    <div className={cn(MENU_STYLES.SKELETON.avatar)}></div>
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

// Memoized avatar component with admin indicator
const ProfileAvatar = memo(({
  user,
  isAdmin,
  onlineStatus = "online",
}: {
  user: ExtendedUser;
  isAdmin: boolean;
  onlineStatus?: PresenceStatus;
}) => (
  <div className={MENU_STYLES.AVATAR.container}>
    <Avatar
      src={user?.image}
      alt={user?.name || "User"}
      fallback={getInitials(user?.name || "User")}
      size={SIZES.AVATAR_SM}
      className={cn(MENU_STYLES.AVATAR.image)}
    />
    {/* Online status indicator */}
    <div
      className={cn(
        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0a0a0a]",
        onlineStatus === "online"   ? "bg-green-500 shadow-green-500/50 shadow-xs"  :
        onlineStatus === "away"     ? "bg-yellow-500 shadow-yellow-500/50 shadow-xs" :
        onlineStatus === "busy"     ? "bg-red-500 shadow-red-500/50 shadow-xs"    :
        onlineStatus === "offline"  ? "bg-gray-400"   : "bg-green-500 shadow-green-500/50 shadow-xs"
      )}
      title={`Status: ${onlineStatus}`}
    />
    {isAdmin && (
      <div
        className={cn(MENU_STYLES.AVATAR.adminBadge)}
        title="Admin"
      >
        <Crown className="w-2.5 h-2.5 text-white" />
      </div>
    )}
  </div>
));

ProfileAvatar.displayName = "ProfileAvatar";

// Memoized button component
const ProfileButtonTrigger = memo(({ 
  buttonRef, 
  isProfileMenuOpen, 
  toggleMenu, 
  user, 
  isAdmin,
  onlineStatus,
  onMouseEnter,
  onFocus,
  openUserMenuLabel,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  isProfileMenuOpen: boolean;
  toggleMenu: () => void;
  user: ExtendedUser;
  isAdmin: boolean;
  onlineStatus?: PresenceStatus;
  onMouseEnter: () => void;
  onFocus: () => void;
  openUserMenuLabel: string;
}) => (
  <button
    ref={buttonRef}
    type="button"
    className={cn(MENU_STYLES.BUTTON.base, "cursor-pointer")}
    id="user-menu-button"
    aria-expanded={isProfileMenuOpen}
    aria-haspopup="menu"
    aria-controls="profile-menu"
    onClick={toggleMenu}
    onMouseEnter={onMouseEnter}
    onFocus={onFocus}
  >
    <span className="sr-only">{openUserMenuLabel}</span>
    <ProfileAvatar user={user} isAdmin={isAdmin} onlineStatus={onlineStatus} />
  </button>
));

ProfileButtonTrigger.displayName = "ProfileButtonTrigger";

function ProfileButton() {
  const t = useTranslations();
  const { isProfileMenuOpen, menuRef, buttonRef, toggleMenu, closeMenu } = useProfileMenu();
  const { handleLogout, isLoggingOut } = useLogoutOverlay();
  const { user, profilePath, isAdmin, displayRole, onlineStatus, isLoading } = useUserUtils();
  const warnedRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Custom close handler that respects navigation state
  const handleMenuClose = () => {
    if (!isNavigating) {
      closeMenu();
    }
  };

  // Navigation state handler to be passed to menu
  const handleNavigationStart = () => {
    setIsNavigating(true);
  };

  const handleNavigationEnd = () => {
    setIsNavigating(false);
    closeMenu();
  };

  const handleMenuLogout = async () => {
    closeMenu();
    await handleLogout();
  };

  // Warn once when user data is incomplete (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (isLoading) return; // don't warn while data is still fetching
    if (warnedRef.current) return;
    if (user && (!user.email || !user.name)) {
      console.warn('User data incomplete:', user);
      warnedRef.current = true;
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative ml-3" role="none">
      <div>
        <ProfileButtonTrigger
          buttonRef={buttonRef}
          isProfileMenuOpen={isProfileMenuOpen}
          toggleMenu={toggleMenu}
          user={user}
          isAdmin={isAdmin}
          onlineStatus={onlineStatus}
          onMouseEnter={loadProfileMenu}
          onFocus={loadProfileMenu}
          openUserMenuLabel={t("header.OPEN_USER_MENU")}
        />
      </div>

      {/* Add backdrop for better UX when menu is open */}
      {isProfileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 opacity-0"
          onClick={handleMenuClose}
          aria-hidden="true"
        />
      )}

      {isProfileMenuOpen && (
        <Suspense fallback={<MenuLoadingFallback />}>
          <ProfileMenu
            isOpen={isProfileMenuOpen}
            menuRef={menuRef}
            user={user}
            profilePath={profilePath}
            displayRole={displayRole}
            onlineStatus={onlineStatus}
            onItemClick={handleMenuClose}
            onNavigationStart={handleNavigationStart}
            onNavigationEnd={handleNavigationEnd}
            isNavigating={isNavigating}
            onLogout={handleMenuLogout}
            logoutText={t("settings.LOGOUT")}
            logoutDescription={t("settings.LOGOUT_DESC")}
          />
        </Suspense>
      )}

      {/* Full screen loading overlay with backdrop blur - render as portal */}
      {isNavigating && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-9999999 bg-black/50 backdrop-blur-xs flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}>
          <div className="bg-white dark:bg-white/5 rounded-lg p-8 shadow-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">{t("common.LOADING_GENERIC")}</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isLoggingOut && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-9999999 bg-black/55 backdrop-blur-xs flex items-center justify-center"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999999 }}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="bg-white dark:bg-white/5 rounded-lg p-8 shadow-2xl min-w-[280px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 dark:border-red-400 mx-auto mb-4"></div>
              <p className="text-gray-900 dark:text-gray-100 font-semibold">{t("settings.LOGOUT")}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{t("settings.LOGOUT_DESC")}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Export memoized component for better performance
export default memo(ProfileButton);
