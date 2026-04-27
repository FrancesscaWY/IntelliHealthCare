import { computed, shallowRef } from "vue";
import { currentAdminAuthSession } from "@/shared/auth/session";

export const DEFAULT_ADMIN_AVATAR_URL = "/api/v1/assets/curated/avatars/li-yuan.jpg";
export const DEFAULT_ADMIN_DISPLAY_NAME = "运营管理员";

const profileAvatarUrl = shallowRef("");
const profileDisplayName = shallowRef("");

export const currentAdminAvatarUrl = computed(() => profileAvatarUrl.value || DEFAULT_ADMIN_AVATAR_URL);

export const currentAdminDisplayName = computed(() => {
  const sessionName = currentAdminAuthSession.value?.user.realName || "";
  return profileDisplayName.value || sessionName || DEFAULT_ADMIN_DISPLAY_NAME;
});

export function updateCurrentAdminProfile(profile: {
  avatarUrl?: string | null;
  name?: string | null;
  realName?: string | null;
}) {
  if (profile.avatarUrl !== undefined) {
    profileAvatarUrl.value = profile.avatarUrl ? String(profile.avatarUrl) : "";
  }

  const displayName = profile.name ?? profile.realName;
  if (displayName !== undefined) {
    profileDisplayName.value = displayName ? String(displayName) : "";
  }
}
