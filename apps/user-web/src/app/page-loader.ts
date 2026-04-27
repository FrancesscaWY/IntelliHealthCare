import type { Component } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";

const pageModules = import.meta.glob("../pages/**/Page.vue");
const componentCache = new Map<string, Component | null>();
const loadingCache = new Map<string, Promise<Component | null>>();
const prefetchQueue: string[] = [];
const queuedPrefetchPageIds = new Set<string>();
let prefetchScheduled = false;

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

function runWhenIdle(callback: () => void) {
  if (typeof window === "undefined") {
    return;
  }

  const requestIdle = window.requestIdleCallback;

  if (typeof requestIdle === "function") {
    requestIdle(() => callback(), { timeout: 900 });
    return;
  }

  window.setTimeout(callback, 120);
}

function drainPrefetchQueue() {
  prefetchScheduled = false;
  const nextPageId = prefetchQueue.shift();

  if (!nextPageId) {
    return;
  }

  queuedPrefetchPageIds.delete(nextPageId);
  void loadRoutePageComponent(nextPageId).finally(() => {
    if (prefetchQueue.length > 0) {
      schedulePrefetchDrain();
    }
  });
}

function schedulePrefetchDrain() {
  if (prefetchScheduled || prefetchQueue.length === 0) {
    return;
  }

  prefetchScheduled = true;
  runWhenIdle(drainPrefetchQueue);
}

export function prefetchRoutePageComponent(
  pageId: string,
  options: { immediate?: boolean } = {}
) {
  const normalizedPageId = normalizePageId(pageId);

  if (
    !normalizedPageId ||
    componentCache.has(normalizedPageId) ||
    loadingCache.has(normalizedPageId)
  ) {
    return;
  }

  const modulePath = `../pages/${normalizedPageId}/Page.vue`;
  if (!pageModules[modulePath]) {
    componentCache.set(normalizedPageId, null);
    return;
  }

  if (options.immediate) {
    queuedPrefetchPageIds.delete(normalizedPageId);
    void loadRoutePageComponent(normalizedPageId).catch(() => undefined);
    return;
  }

  if (queuedPrefetchPageIds.has(normalizedPageId)) {
    return;
  }

  queuedPrefetchPageIds.add(normalizedPageId);
  prefetchQueue.push(normalizedPageId);
  schedulePrefetchDrain();
}

export function prefetchRoutePageComponents(pageIds: string[]) {
  for (const pageId of pageIds) {
    prefetchRoutePageComponent(pageId);
  }
}
