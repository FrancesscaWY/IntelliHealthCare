import type { GlobalSearchItem } from "@/shared/api/search";

const SEARCH_STATE_KEY = "ihc-home-search-state";

export interface GlobalSearchState {
  keyword: string;
  list: GlobalSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function saveGlobalSearchState(state: GlobalSearchState) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state));
}

export function readGlobalSearchState() {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SEARCH_STATE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as GlobalSearchState;
  } catch {
    window.sessionStorage.removeItem(SEARCH_STATE_KEY);
    return null;
  }
}

export function clearGlobalSearchState() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(SEARCH_STATE_KEY);
}
