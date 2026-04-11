import type { ComponentType } from "react";

export type AppId = "user-mobile" | "admin-console";
export type PageStatus = "planned" | "in-progress" | "ready";

export interface PrototypeReference {
  reference: string;
  notes: string[];
}

export interface PageSpec {
  id: string;
  app: AppId;
  module: string;
  route: string;
  title: string;
  navLabel: string;
  description: string;
  owner: string;
  status: PageStatus;
  prototype: PrototypeReference;
}

export interface MockScenario<TData = Record<string, unknown>> {
  id: string;
  label: string;
  description: string;
  data: TData;
}

export interface PageRenderContext<TData = Record<string, unknown>> {
  mode: "page" | "app";
  scene: MockScenario<TData>;
}

export interface PageModule<TData = Record<string, unknown>> {
  spec: PageSpec;
  scenes: MockScenario<TData>[];
  Component: ComponentType<PageRenderContext<TData>>;
}

export function definePageModule<TData>(pageModule: PageModule<TData>) {
  return pageModule;
}

export function sortPageModules<TData>(pageModules: PageModule<TData>[]) {
  return [...pageModules].sort((left, right) => {
    const moduleCompare = left.spec.module.localeCompare(right.spec.module);
    if (moduleCompare !== 0) {
      return moduleCompare;
    }

    return left.spec.title.localeCompare(right.spec.title);
  });
}

export function getDefaultScene<TData>(pageModule: PageModule<TData>): MockScenario<TData> {
  const scene = pageModule.scenes[0];

  if (scene) {
    return scene;
  }

  return {
    id: "default",
    label: "默认场景",
    description: "页面未定义 mock 场景。",
    data: {} as TData,
  };
}

