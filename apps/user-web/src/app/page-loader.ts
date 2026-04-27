import type { Component } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";

const pageModules = import.meta.glob("../pages/**/Page.vue");
const componentCache = new Map<string, Component | null>();
const loadingCache = new Map<string, Promise<Component | null>>();

export function peekRoutePageComponent(pageId: string) {
  const normalizedPageId = normalizePageId(pageId);
  if (!componentCache.has(normalizedPageId)) {
    return undefined;
  }

  return componentCache.get(normalizedPageId) || null;
}

export async function loadRoutePageComponent(pageId: string): Promise<Component | null> {
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
