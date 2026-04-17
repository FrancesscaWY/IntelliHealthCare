import type { Component } from "vue";
import { normalizePageId } from "@ihc/page-core/runtime";

const pageModules = import.meta.glob("../pages/**/Page.vue");

export async function loadPageComponent(pageId: string): Promise<Component | null> {
  const normalizedPageId = normalizePageId(pageId);
  const modulePath = `../pages/${normalizedPageId}/Page.vue`;
  const loader = pageModules[modulePath] as undefined | (() => Promise<{ default: Component }>);

  if (!loader) {
    return null;
  }

  const module = await loader();
  return module.default;
}
