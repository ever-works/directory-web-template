import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getProfilePath, getDisplayRole, getOnlineStatus } from "@/utils/profile-button.utils";
import type { ExtendedUser, RoleLabel, PresenceStatus } from "@/types/profile-button.types";

export type UseUserUtilsResult = {
  user: ExtendedUser | null;
  profilePath: string;
  isAdmin: boolean;
  displayRole: RoleLabel;
  onlineStatus: PresenceStatus;
  isLoading: boolean;
};

export function useUserUtils(): UseUserUtilsResult {
  const { user, isLoading } = useCurrentUser();

  // Memoize user data processing
  const userData = useMemo(() => {
    if (!user) return null;

    const profilePath = getProfilePath(user);
    const isAdmin = user.isAdmin === true;
    const displayRole = getDisplayRole(isAdmin);
    const onlineStatus = getOnlineStatus();

    return {
      user,
      profilePath,
      isAdmin,
      displayRole,
      onlineStatus,
    };
  }, [user]);

  const result = useMemo(() => ({
    user: userData?.user ?? null,
    profilePath: userData?.profilePath ?? getProfilePath(null),
    isAdmin: userData?.isAdmin ?? false,
    displayRole: userData?.displayRole ?? "User",
    onlineStatus: userData?.onlineStatus ?? "online",
    isLoading,
  }), [userData, isLoading]);

  return result;
}
