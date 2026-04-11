import {
  createPlaceholderMarkup,
  escapeHtml,
  injectPageStyles,
  normalizePageId,
  resolveInitialPage,
  showToast,
} from "/packages/page-core/src/runtime.js";
import { projectInfo } from "/apps/user-web/src/shared/project-info.js";

const root = document.querySelector("#app");
const config = window.__IHC_CONFIG__ || { mode: "app", pageId: "" };
const manifest = await fetch("/apps/user-web/src/app/pages.manifest.json").then((response) => response.json());
const fallbackPageId = projectInfo.homePageId;
const initialPageId = resolveInitialPage(manifest, config.pageId, "", fallbackPageId);

const state = {
  mode: config.mode === "page" ? "page" : "app",
  pages: manifest,
  stack: initialPageId ? [initialPageId] : [],
};

function hasPage(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  return state.pages.some((entry) => entry.id === normalizedPageId);
}

function getPageEntry(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  return state.pages.find((entry) => entry.id === normalizedPageId);
}

function getActivePage() {
  return getPageEntry(state.stack.at(-1)) || state.pages[0];
}

function setStack(nextStack) {
  const validStack = nextStack.map((pageId) => normalizePageId(pageId)).filter((pageId) => hasPage(pageId));

  if (validStack.length === 0) {
    state.stack = initialPageId ? [initialPageId] : [];
    return;
  }

  state.stack = validStack;
}

function navigate(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  const pageEntry = getPageEntry(normalizedPageId);

  if (!pageEntry) {
    showToast("页面未登记到应用清单");
    return;
  }

  setStack([...state.stack, normalizedPageId]);
  render();
}

const navigation = {
  navigateTo(pageId) {
    navigate(pageId);
  },
  redirectTo(pageId) {
    const normalizedPageId = normalizePageId(pageId);
    const pageEntry = getPageEntry(normalizedPageId);

    if (!pageEntry) {
      showToast("页面未登记到应用清单");
      return;
    }

    const nextStack = state.stack.length > 0 ? [...state.stack.slice(0, -1), normalizedPageId] : [normalizedPageId];
    setStack(nextStack);
    render();
  },
  reLaunch(pageId) {
    const normalizedPageId = normalizePageId(pageId);
    const pageEntry = getPageEntry(normalizedPageId);

    if (!pageEntry) {
      showToast("页面未登记到应用清单");
      return;
    }

    setStack([normalizedPageId]);
    render();
  },
  navigateBack() {
    if (state.stack.length <= 1) {
      return false;
    }

    setStack(state.stack.slice(0, -1));
    render();
    return true;
  },
  canGoBack() {
    return state.stack.length > 1;
  },
  getStack() {
    return [...state.stack];
  },
};

function renderAppShell(activePage) {
  return `
    <main class="app-shell ${state.mode === "page" ? "app-shell--page" : "app-shell--site"}">
      <section class="app-canvas">
        <div class="mobile-page-root" data-preview-root></div>
      </section>
    </main>
  `;
}

async function renderPreview(pageEntry) {
  const previewRoot = root.querySelector("[data-preview-root]");

  if (!previewRoot) {
    return;
  }

  if (!pageEntry.modulePath) {
    injectPageStyles("");
    previewRoot.innerHTML = createPlaceholderMarkup(pageEntry);
    return;
  }

  try {
    const module = await import(pageEntry.modulePath);
    injectPageStyles(module.styles || "");
    previewRoot.innerHTML = "";
    await module.mount({
      root: previewRoot,
      navigation,
      navigate,
      showToast,
      manifest: state.pages,
      mode: state.mode,
      pageEntry,
    });
  } catch (error) {
    injectPageStyles("");
    previewRoot.innerHTML = `
      <section class="placeholder-page">
        <article class="placeholder-page__hero">
        <p class="page-eyebrow">Load Error</p>
        <h1>${escapeHtml(pageEntry.title)}</h1>
        <p>页面模块加载失败，请检查 page.js 是否存在语法错误。</p>
        <p>${escapeHtml(error.message)}</p>
        </article>
      </section>
    `;
  }
}

async function render() {
  const activePage = getActivePage();
  document.title =
    state.mode === "page" ? `${activePage.title} - 单页预览` : `${activePage.title} - ${projectInfo.name}`;
  root.innerHTML = renderAppShell(activePage);

  await renderPreview(activePage);
}

await render();
