import type { Component } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";

const pageModules = import.meta.glob([
  "../pages/**/Page.vue",
  "!../pages/onboarding/intro/Page.vue",
  "!../pages/auth/login/Page.vue",
  "!../pages/auth/real-name/Page.vue",
  "!../pages/home/dashboard/Page.vue",
]);
const eagerEntryPageModules = import.meta.glob(
  "../pages/{onboarding/intro,auth/login,auth/real-name,home/dashboard}/Page.vue",
  { eager: true },
) as Record<string, { default: Component }>;
const componentCache = new Map<string, Component | null>();
const loadingCache = new Map<string, Promise<Component | null>>();

for (const [modulePath, module] of Object.entries(eagerEntryPageModules)) {
  const pageId = normalizePageId(modulePath.replace("../pages/", "").replace("/Page.vue", ""));
  componentCache.set(pageId, module.default);
}

export function peekPageComponent(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);
  if (!componentCache.has(normalizedPageId)) {
    return undefined;
  }

  return componentCache.get(normalizedPageId) || null;
}

export async function loadPageComponent(pageId: string): Promise<Component | null> {
  const normalizedPageId = normalizePageId(pageId);
  if (componentCache.has(normalizedPageId)) {
    return componentCache.get(normalizedPageId) || null;
  }

  const cachedLoading = loadingCache.get(normalizedPageId);
  if (cachedLoading) {
    return cachedLoading;
  }

  const modulePath = `../pages/${normalizedPageId}/Page.vue`;
  const loader = pageModules[modulePath] as undefined | (() => Promise<{ default: Component }>);

  if (!loader) {
    componentCache.set(normalizedPageId, null);
    return null;
  }

  const loadingTask = loader()
    .then((module) => {
      const component = module.default;
      componentCache.set(normalizedPageId, component);
      return component;
    })
    .finally(() => {
      loadingCache.delete(normalizedPageId);
    });

  loadingCache.set(normalizedPageId, loadingTask);
  return loadingTask;
}

export function preloadPageComponents() {
  for (const modulePath of Object.keys(pageModules)) {
    const pageId = normalizePageId(modulePath.replace("../pages/", "").replace("/Page.vue", ""));
    void loadPageComponent(pageId);
  }
}
