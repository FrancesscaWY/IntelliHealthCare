import { request } from "@/shared/api/client";

export interface GlobalSearchItem {
  targetType: "service" | "article" | "disease" | "activity";
  targetId: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
}

export interface GlobalSearchResponse {
  list: GlobalSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface SearchHistoryItem {
  id: string;
  keyword: string;
  targetType: string | null;
  createdAt: string | null;
}

export interface SearchHistoryCreateResponse {
  id: string;
  keyword: string;
}

export interface SearchHotTagItem {
  keyword: string;
  rank: number;
  hotScore: number;
}

const pendingHistoryCreates = new Map<string, Promise<SearchHistoryCreateResponse>>();

function normalizeSearchKeyword(keyword: string) {
  return keyword.trim().toLocaleLowerCase();
}

function dedupeSearchHistory(items: SearchHistoryItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const normalizedKeyword = normalizeSearchKeyword(item.keyword);

    if (!normalizedKeyword || seen.has(normalizedKeyword)) {
      return false;
    }

    seen.add(normalizedKeyword);
    return true;
  });
}

export function getGlobalSearch(keyword: string, page = 1, pageSize = 10) {
  const searchParams = new URLSearchParams({
    keyword,
    page: String(page),
    pageSize: String(pageSize)
  });

  return request<GlobalSearchResponse>(`/app/search/global?${searchParams.toString()}`, {
    auth: true
  });
}

export function getSearchHotTags() {
  return request<SearchHotTagItem[]>("/app/search/hot-tags", {
    auth: true
  });
}

export function getSearchHistory() {
  return request<SearchHistoryItem[]>("/app/search/history", {
    auth: true
  }).then(dedupeSearchHistory);
}

export function addSearchHistory(keyword: string) {
  const trimmedKeyword = keyword.trim();
  const normalizedKeyword = normalizeSearchKeyword(trimmedKeyword);

  if (!normalizedKeyword) {
    return Promise.resolve({
      id: "",
      keyword: trimmedKeyword
    });
  }

  const pendingRequest = pendingHistoryCreates.get(normalizedKeyword);

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = (async () => {
    const histories = await getSearchHistory();
    const matchedHistory = histories.find((item) => normalizeSearchKeyword(item.keyword) === normalizedKeyword);

    if (matchedHistory) {
      return {
        id: matchedHistory.id,
        keyword: matchedHistory.keyword
      };
    }

    return request<SearchHistoryCreateResponse>("/app/search/history", {
      method: "POST",
      auth: true,
      body: {
        keyword: trimmedKeyword
      }
    });
  })().finally(() => {
    pendingHistoryCreates.delete(normalizedKeyword);
  });

  pendingHistoryCreates.set(normalizedKeyword, nextRequest);
  return nextRequest;
}

export function clearSearchHistory() {
  return request<{ cleared: boolean }>("/app/search/history", {
    method: "DELETE",
    auth: true
  });
}
