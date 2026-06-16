import { normalizePageId } from "@ihc/page-core/runtime";
import type { PageEntry } from "@ihc/page-core/types";
import manifestEntries from "./pages.manifest.json";

export const userPageManifest = manifestEntries as PageEntry[];

const pageEntriesById = new Map<string, PageEntry>();
const pageEntriesByRoute = new Map<string, PageEntry>();

for (const entry of userPageManifest) {
  const normalizedPageId = normalizePageId(entry.id);
  pageEntriesById.set(normalizedPageId, entry);
  pageEntriesByRoute.set(normalizeRoutePath(entry.route), entry);
}

export function normalizeRoutePath(path = "") {
  const normalizedPath = normalizePageId(path);
  return normalizedPath ? `/${normalizedPath}` : "/";
}

export function getPageEntryById(pageId: string) {
  return pageEntriesById.get(normalizePageId(pageId)) || null;
}

export function getPageEntryByRoutePath(path: string) {
  return pageEntriesByRoute.get(normalizeRoutePath(path)) || null;
}

export function resolveRoutePathByPageId(pageId: string) {
  return getPageEntryById(pageId)?.route || "";
}
