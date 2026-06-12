import defaultAvatar from "@/assets/home/profile/avatar.jpg";
import { getCurrentUser, getCurrentUserProfile } from "@/shared/api/auth";
import { updateUserAuthSessionRealNameVerified } from "@/shared/auth/session";

export interface UserProfileState {
  avatarUrl: string;
  avatarFileId: string;
  nickname: string;
  gender: string;
  intro: string;
}

const PROFILE_STORAGE_KEY = "ihc:user-web:profile-state";

const defaultState: UserProfileState = {
  avatarUrl: defaultAvatar,
  avatarFileId: "",
  nickname: "笑看人生",
  gender: "未知",
  intro: ""
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadUserProfileState(): UserProfileState {
  if (!canUseStorage()) {
    return { ...defaultState };
  }

  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfileState>;
    return {
      avatarUrl: parsed.avatarUrl || defaultState.avatarUrl,
      avatarFileId: parsed.avatarFileId || "",
      nickname: parsed.nickname || defaultState.nickname,
      gender: parsed.gender || defaultState.gender,
      intro: parsed.intro || defaultState.intro
    };
  } catch {
    return { ...defaultState };
  }
}

export function saveUserProfileState(nextState: Partial<UserProfileState>) {
  if (!canUseStorage()) {
    return;
  }

  const merged = {
    ...loadUserProfileState(),
    ...nextState
  };

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
}

export function getDefaultUserProfileState() {
  return { ...defaultState };
}

function normalizeGender(value: string | null | undefined) {
  switch (value) {
    case "MALE":
      return "男";
    case "FEMALE":
      return "女";
    default:
      return "未知";
  }
}

function isInvalidNickname(value: string | null | undefined) {
  const text = value?.trim() || "";

  if (!text) {
    return true;
  }

  return /^[?？]+$/.test(text);
}

export async function syncUserProfileStateFromApi() {
  const [currentUser, currentProfile] = await Promise.all([getCurrentUser(), getCurrentUserProfile()]);
  const currentState = loadUserProfileState();
  updateUserAuthSessionRealNameVerified(currentUser.realNameVerified);
  const resolvedNickname = !isInvalidNickname(currentProfile.nickname)
    ? (currentProfile.nickname || "")
    : currentUser.name || currentState.nickname || defaultState.nickname;

  saveUserProfileState({
    avatarUrl: currentProfile.avatar || currentUser.avatar || currentState.avatarUrl || defaultState.avatarUrl,
    nickname: resolvedNickname,
    gender: normalizeGender(currentProfile.gender || currentUser.gender),
    intro: currentState.intro
  });

  return loadUserProfileState();
}
