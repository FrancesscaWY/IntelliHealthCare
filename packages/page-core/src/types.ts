export type PageStatus = "implemented" | "in-progress" | "planned";
export type AppMode = "app" | "page";

export interface PageEntry {
  id: string;
  title: string;
  group: string;
  route: string;
  owner: string;
  status: PageStatus;
  summary: string;
  folderPath: string;
  modulePath: string;
  mockPath: string;
  legacySources: string[];
}

export interface NavigationApi {
  navigateTo: (pageId: string) => void;
  redirectTo: (pageId: string) => void;
  reLaunch: (pageId: string) => void;
  navigateBack: () => boolean;
  canGoBack: () => boolean;
  getStack: () => string[];
}

export interface PageComponentProps {
  pageEntry: PageEntry;
  mode: AppMode;
  manifest: PageEntry[];
  navigation: NavigationApi;
  showToast: (message: string) => void;
}

export interface StatusMeta {
  label: string;
  tone: string;
}

export interface BottomTabItem {
  key: string;
  label: string;
  icon: string;
  pageId: string;
}
