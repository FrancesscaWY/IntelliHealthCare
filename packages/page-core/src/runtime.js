export const STATUS_META = {
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

const tabItems = [
  { key: "home", label: "首页", icon: "首", pageId: "home/dashboard" },
  { key: "circle", label: "生活圈", icon: "圈", pageId: "community/circle" },
  { key: "publish", label: "", icon: "+", pageId: "community/publish" },
  { key: "message", label: "消息", icon: "消", pageId: "" },
  { key: "mine", label: "我的", icon: "我", pageId: "" },
];

export function normalizePageId(rawPageId = "") {
  return String(rawPageId).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function resolveInitialPage(pages, preferredPageId, pathname, fallbackPageId = "") {
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

export function groupPagesByGroup(pages) {
  return pages.reduce((groups, entry) => {
    if (!groups[entry.group]) {
      groups[entry.group] = [];
    }

    groups[entry.group].push(entry);
    return groups;
  }, {});
}

export function renderStatusChip(status) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return `<span class="status-pill status-pill--${meta.tone}">${meta.label}</span>`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function injectPageStyles(styles) {
  let styleElement = document.querySelector("[data-runtime-page-styles]");

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.setAttribute("data-runtime-page-styles", "true");
    document.head.append(styleElement);
  }

  styleElement.textContent = styles || "";
}

export function showToast(message) {
  let toastRoot = document.querySelector("[data-toast-root]");
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.className = "toast-root";
    toastRoot.setAttribute("data-toast-root", "true");
    document.body.append(toastRoot);
  }

  const toast = document.createElement("div");
  toast.className = "toast-item";
  toast.textContent = message;
  toastRoot.append(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-item--visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("toast-item--visible");
    window.setTimeout(() => {
      toast.remove();
    }, 220);
  }, 1800);
}

export function renderBottomTabBar(activeKey) {
  return `
    <nav class="mobile-tabbar">
      ${tabItems
        .map((item) => {
          const activeClass = item.key === activeKey ? "is-active" : "";
          const centerClass = item.key === "publish" ? "is-center" : "";

          return `
            <button
              class="mobile-tabbar__item ${activeClass} ${centerClass}"
              type="button"
              data-bottom-tab="${item.key}"
              data-page-id="${item.pageId}"
              data-label="${item.label}"
            >
              <span class="mobile-tabbar__icon">${item.icon}</span>
              ${item.label ? `<span class="mobile-tabbar__label">${item.label}</span>` : ""}
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
}

export function bindBottomTabBar(root, { navigate }) {
  root.querySelectorAll("[data-bottom-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.getAttribute("data-page-id");
      const label = button.getAttribute("data-label");

      if (pageId) {
        navigate(pageId);
        return;
      }

      showToast(`${label}功能待接入`);
    });
  });
}

export function createPlaceholderMarkup(pageEntry) {
  return `
    <section class="placeholder-page">
      <article class="placeholder-page__hero">
        <p class="page-eyebrow">${escapeHtml(pageEntry.group.toUpperCase())}</p>
        <h1>${escapeHtml(pageEntry.title)}</h1>
        <p>${escapeHtml(pageEntry.summary)}</p>
      </article>
      <article class="placeholder-page__notice">
        <strong>功能开发中</strong>
        <p>当前页面目录已经预留完成，后续可以直接补充页面结构与交互。</p>
      </article>
    </section>
  `;
}
