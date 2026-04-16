import type { BottomTabItem, PageEntry, PageStatus, StatusMeta } from "./types";

export const STATUS_META: Record<PageStatus, StatusMeta> = {
  implemented: {
    label: "已实现",
    tone: "implemented",
  },
  "in-progress": {
    label: "开发中",
    tone: "in-progress",
  },
  planned: {
    label: "待开发",
    tone: "planned",
  },
};

export const bottomTabItems: BottomTabItem[] = [
  { key: "home", label: "首页", icon: "首", pageId: "home/dashboard" },
  { key: "circle", label: "生活圈", icon: "圈", pageId: "community/circle" },
  { key: "publish", label: "发布", icon: "+", pageId: "community/publish" },
  { key: "message", label: "消息", icon: "信", pageId: "home/message" },
  { key: "mine", label: "我的", icon: "我", pageId: "home/mine" },
];

export function normalizePageId(rawPageId = "") {
  return String(rawPageId).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function resolveInitialPage(
  pages: PageEntry[],
  preferredPageId: string,
  pathname: string,
  fallbackPageId = "",
) {
  const normalizedPreferred = normalizePageId(preferredPageId);
  if (normalizedPreferred && pages.some((entry) => entry.id === normalizedPreferred)) {
    return normalizedPreferred;
  }

  const normalizedPath = normalizePageId(pathname);
  if (normalizedPath && pages.some((entry) => entry.id === normalizedPath)) {
    return normalizedPath;
  }

  const normalizedFallback = normalizePageId(fallbackPageId);
  if (normalizedFallback && pages.some((entry) => entry.id === normalizedFallback)) {
    return normalizedFallback;
  }

  return pages.find((entry) => entry.status === "implemented")?.id || pages[0]?.id || "";
}

export function groupPagesByGroup(pages: PageEntry[]) {
  return pages.reduce<Record<string, PageEntry[]>>((groups, entry) => {
    if (!groups[entry.group]) {
      groups[entry.group] = [];
    }

    groups[entry.group].push(entry);
    return groups;
  }, {});
}

export function getStatusMeta(status: PageStatus) {
  return STATUS_META[status] || STATUS_META.planned;
}
