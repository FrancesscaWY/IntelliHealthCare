import { normalizePageId } from "@ihc/page-core/runtime";
import type { AppMode } from "@ihc/page-core/types";

export function resolveConfig() {
  const searchParams = new URLSearchParams(window.location.search);
  const envPageId = normalizePageId(import.meta.env.VITE_IHC_PAGE_ID || "");
  const queryPageId = normalizePageId(searchParams.get("page") || searchParams.get("pageId") || "");
  const preferredPageId = queryPageId || envPageId;
  const modeToken = searchParams.get("mode") || import.meta.env.VITE_IHC_MODE || "";
  const mode: AppMode = modeToken === "page" || preferredPageId ? "page" : "app";

  return {
    mode,
    preferredPageId,
  };
}
