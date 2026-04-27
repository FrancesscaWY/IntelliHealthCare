<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { favoriteHealthNews, likeHealthNews, listHealthNews, shareHealthNews } from "@/shared/api/content";
import fallbackNewsImage from "@/assets/content/health-lecture-hot.jpg";
import { healthNewsDetailTarget, selectedHealthNewsId } from "@/pages/content/health-news/state";
import { normalizeNewsImages } from "@/shared/utils/healthNewsMedia";
import locationIcon from "@/assets/home/topbar/定位.png";
import scanIcon from "@/assets/home/topbar/二维码.png";
import sectionImage from "@/assets/home/sections/img.png";
import {
  getHomeDashboard,
  type HomeDashboardArticle,
  type HomeDashboardServiceEntry,
} from "@/shared/api/home";
import { addSearchHistory, getGlobalSearch } from "@/shared/api/search";
import { saveGlobalSearchState } from "@/shared/search/session";
import FloatingAssistant from "./FloatingAssistant.vue";
import mock from "./mock";

const props = defineProps<PageComponentProps>();
const searchValue = ref("");
const homeCity = ref(mock.city);
const serviceCards = ref([...mock.services]);
const healthReminder = ref({ ...mock.reminder });
const hotDiseases = ref([...mock.diseases]);
const articles = ref(createFallbackArticles());
const featurePages = [mock.features.slice(0, 4), mock.features.slice(4)];
const activeFeaturePage = ref(0);
const isSubmittingSearch = ref(false);

interface ArticleCardState {
  id: string;
  newsId: string;
  title: string;
  desc: string;
  likes: number;
  stars: number;
  comments: number;
  coverUrl: string | null;
  isLiked: boolean;
  isStarred: boolean;
}

function createArticleState(
  items: Array<{
    id?: string;
    newsId?: string;
    title: string;
    desc: string;
    likes: number;
    stars: number;
    comments: number;
    coverUrl?: string | null;
  }>
): ArticleCardState[] {
  return items.map((item, index) => ({
    ...item,
    id: item.id || item.newsId || `article-${index + 1}`,
    newsId: item.newsId || item.id || `article-${index + 1}`,
    coverUrl: item.coverUrl ?? null,
    isLiked: false,
    isStarred: false,
  }));
}

function createFallbackArticles() {
  return createArticleState(
    mock.articles.map((item, index) => ({
      id: `mock-article-${index + 1}`,
      newsId: `mock-article-${index + 1}`,
      title: item.title,
      desc: item.desc,
      likes: item.likes,
      stars: item.stars,
      comments: item.comments,
      coverUrl: fallbackNewsImage,
    }))
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "\u9996\u9875\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
}

function getSearchErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "搜索失败，请稍后重试";
}

function formatServicePrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) {
    return "";
  }

  return Number.isInteger(price)
    ? `\u00A5${price}\u8D77`
    : `\u00A5${price.toFixed(2)}\u8D77`;
}

function mapServiceEntries(entries: HomeDashboardServiceEntry[]) {
  const serviceCategoryOrder = ["HOME_CARE", "REHAB_THERAPY", "HOME_EXAM"] as const;
  const serviceCardConfigByCategory = {
    HOME_CARE: mock.services[0],
    REHAB_THERAPY: mock.services[1],
    HOME_EXAM: mock.services[2],
  };

  return serviceCategoryOrder.flatMap((category) => {
    const entry = entries.find((item) => item.category === category);

    if (!entry) {
      return [];
    }

    const config = serviceCardConfigByCategory[category];
    return [
      {
        ...config,
        desc: formatServicePrice(entry.price) || config.desc,
      },
    ];
  });
}

function mapRecommendedArticles(items: HomeDashboardArticle[]) {
  return createArticleState(
    items.map((item, index) => ({
      id: item.articleId || `article-${index + 1}`,
      newsId: item.articleId || `article-${index + 1}`,
      title: item.title,
      desc: item.summary || mock.articles[index]?.desc || "",
      likes: mock.articles[index]?.likes ?? 0,
      stars: mock.articles[index]?.stars ?? 0,
      comments: mock.articles[index]?.comments ?? 0,
      coverUrl: item.coverUrl || fallbackNewsImage,
    }))
  );
}

async function loadDashboard() {
  try {
    const dashboard = await getHomeDashboard();
    const nextServiceCards = mapServiceEntries(dashboard.serviceEntries);

    homeCity.value = dashboard.city || mock.city;
    serviceCards.value = nextServiceCards.length ? nextServiceCards : [...mock.services];
    healthReminder.value = dashboard.healthReminder
      ? {
          ...mock.reminder,
          title: dashboard.healthReminder.title,
          detail: dashboard.healthReminder.content,
        }
      : {
          ...mock.reminder,
          title: "\u5065\u5EB7\u63D0\u9192",
          detail: "\u6682\u672A\u751F\u6210\u4ECA\u65E5\u63D0\u9192",
        };
    hotDiseases.value = dashboard.hotDiseases.map((item) => item.title);
    articles.value = dashboard.recommendedArticles.length
      ? mapRecommendedArticles(dashboard.recommendedArticles)
      : createFallbackArticles();
  } catch (error) {
    props.showToast(getErrorMessage(error));
  }
}

const navIconMarkup: Record<string, string> = {
  home: `
    <path d="M7.3 18.2 24 5.2l16.7 13v20a2.5 2.5 0 0 1-2.5 2.5h-8.9V29.2H18.7v11.5H9.8a2.5 2.5 0 0 1-2.5-2.5v-20Z" />
  `,
  circle: `
    <circle cx="24" cy="24" r="14.2" />
    <path d="m29.7 14.3-3.6 10.4-10.4 3.6 3.6-10.4 10.4-3.6Z" />
    <circle cx="24" cy="24" r="2.2" />
  `,
  message: `
    <path d="M38.3 22.2c0 7.1-6.15 12.75-14.3 12.75-1.8 0-3.55-.3-5.1-.85l-8.45 4.45 2.45-7.25c-2.05-2.3-3.2-5.4-3.2-9.1 0-7.1 6.15-12.75 14.3-12.75S38.3 15.1 38.3 22.2Z" />
  `,
  mine: `
    <circle cx="24" cy="16.7" r="7.3" />
    <path d="M10.2 39.2c1.45-7.3 6.05-11.2 13.8-11.2s12.35 3.9 13.8 11.2" />
  `,
};

function getNavIconMarkup(key: string) {
  return navIconMarkup[key] || navIconMarkup.home;
}

function getNavGradientId(key: string) {
  return `tab-gradient-${key}`;
}

function syncFeaturePage(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const pageIndex = Math.round(target.scrollLeft / target.clientWidth);
  activeFeaturePage.value = Math.min(featurePages.length - 1, Math.max(0, pageIndex));
}

const featureIconColors: Record<string, readonly [string, string]> = {
  chart: ["#35cfa4", "#a8efdc"],
  device: ["#6b70ee", "#bbbffd"],
  medicine: ["#efc84f", "#ffe6a6"],
  meal: ["#4f84ff", "#a5c8ff"],
  book: ["#f36e70", "#ffb7b1"],
  archive: ["#45c89c", "#9ee8d2"],
  activity: ["#7478f0", "#bdc0fb"],
  news: ["#f0c85b", "#ffe5a1"],
  building: ["#2f78ef", "#9bc8ff"],
  video: ["#f36b68", "#ffb3ad"],
  bowl: ["#42d2ad", "#a8f0dd"],
  test: ["#7277ee", "#bdc1fb"],
};

const featureIconMarkup: Record<string, string> = {
  chart: `
    <path d="M15.2 4.5a11.5 11.5 0 1 0 11.5 11.5H15.2V4.5Z" />
    <path d="M17.7 4.8v8.7h8.7a10.7 10.7 0 0 0-8.7-8.7Z" opacity=".62" />
  `,
  device: `
    <rect x="6" y="4.8" width="20" height="7.3" rx="1.5" />
    <rect x="6" y="13.5" width="20" height="7.3" rx="1.5" opacity=".86" />
    <rect x="6" y="22.2" width="20" height="5" rx="1.5" opacity=".64" />
    <circle cx="10" cy="8.45" r="1.15" fill="#fff" opacity=".95" />
    <circle cx="10" cy="17.15" r="1.15" fill="#fff" opacity=".9" />
  `,
  medicine: `
    <path d="M11 4.4h10v4.1H11z" />
    <path d="M9.2 8.5h13.6v18.3a1.9 1.9 0 0 1-1.9 1.9h-9.8a1.9 1.9 0 0 1-1.9-1.9V8.5Z" opacity=".9" />
    <rect x="14.7" y="15" width="2.6" height="8.1" rx=".6" fill="#fff" opacity=".9" />
    <rect x="12.25" y="17.75" width="7.5" height="2.6" rx=".6" fill="#fff" opacity=".9" />
  `,
  meal: `
    <path d="M6.4 15.2h19.2v2.1c0 5-4.1 9.1-9.1 9.1h-1c-5 0-9.1-4.1-9.1-9.1v-2.1Z" />
    <rect x="8" y="27.1" width="16" height="2" rx="1" opacity=".52" />
    <rect x="8.8" y="4.6" width="2.2" height="7.2" rx="1.1" transform="rotate(10 9.9 8.2)" />
    <rect x="15" y="3.8" width="2.2" height="8" rx="1.1" transform="rotate(10 16.1 7.8)" />
    <rect x="21.2" y="4.6" width="2.2" height="7.2" rx="1.1" transform="rotate(10 22.3 8.2)" />
  `,
  book: `
    <path d="M8.3 6.1h15.4a1.8 1.8 0 0 1 1.8 1.8v17.8H9.1a2.6 2.6 0 0 1-2.6-2.6V7.9a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M6.5 22.8c0-1.4 1.2-2.6 2.6-2.6h16.4v5.5H9.1a2.9 2.9 0 0 1-2.6-2.9Z" opacity=".56" />
    <rect x="11" y="10.3" width="8.9" height="2.2" rx="1.1" fill="#fff" opacity=".92" />
  `,
  archive: `
    <path d="M9 4.8h11.2l5 5v17.4H9a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2Z" />
    <path d="M20.2 4.8v5h5" fill="#fff" opacity=".36" />
    <rect x="11.6" y="12.5" width="8.8" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    <rect x="11.6" y="17.7" width="8.8" height="2.2" rx="1.1" fill="#fff" opacity=".72" />
    <circle cx="23.6" cy="24.2" r="2.9" fill="#fff" opacity=".58" />
  `,
  activity: `
    <circle cx="10.8" cy="11.1" r="4" />
    <circle cx="22.2" cy="12" r="3.4" opacity=".82" />
    <path d="M4.8 27.2c.55-5.2 3.1-8.2 7.4-8.2 2.6 0 4.55 1.1 5.85 3.2-1.1 1.2-1.9 2.9-2.4 5H4.8Z" />
    <path d="M18.3 27.2c.75-4.05 2.85-6.45 6.2-6.45 1.15 0 2.1.23 2.85.72-1.2 2.6-3.7 4.7-7.45 5.73h-1.6Z" opacity=".7" />
    <path d="M21.9 18.3c2.4-.25 4.1-1.4 5.2-3.5.2 2.55-1 4.25-3.65 5.1-.55-.7-1.05-1.2-1.55-1.6Z" fill="#fff" opacity=".62" />
  `,
  news: `
    <path d="M6.8 9h18.4v13.2a4.3 4.3 0 0 1-4.3 4.3H11.1a4.3 4.3 0 0 1-4.3-4.3V9Z" />
    <path d="M4.2 12.6h4v9.5a4 4 0 0 1-4 4v-13.5Z" opacity=".64" />
    <path d="M23.8 12.6h4v13.5a4 4 0 0 1-4-4v-9.5Z" opacity=".64" />
    <rect x="11.5" y="13.4" width="9" height="2.1" rx="1.05" fill="#fff" opacity=".72" />
    <rect x="11.5" y="18.3" width="9" height="2.1" rx="1.05" fill="#fff" opacity=".55" />
  `,
  building: `
    <path d="M7 5.7h12.3v22H7z" />
    <path d="M18.2 12.3h7v15.4h-7z" opacity=".68" />
    <rect x="10" y="9.6" width="3.4" height="3.2" rx=".6" fill="#fff" opacity=".86" />
    <rect x="10" y="16.2" width="3.4" height="3.2" rx=".6" fill="#fff" opacity=".68" />
    <rect x="21" y="18" width="2.2" height="7" rx=".6" fill="#fff" opacity=".48" />
    <rect x="5.2" y="27.1" width="22.2" height="1.8" rx=".9" opacity=".45" />
  `,
  video: `
    <path d="M7 7.1h14.3a2 2 0 0 1 2 2v13.8a2 2 0 0 1-2 2H7z" />
    <path d="M23.3 12.2 28 9.3v13.4l-4.7-2.9v-7.6Z" opacity=".62" />
    <path d="M13.2 12.2v7.6l6-3.8-6-3.8Z" fill="#fff" opacity=".9" />
  `,
  bowl: `
    <path d="M6.1 16.1h19.8v2.2a8.8 8.8 0 0 1-8.8 8.8h-2.2a8.8 8.8 0 0 1-8.8-8.8v-2.2Z" />
    <rect x="8.4" y="27.6" width="15.2" height="1.9" rx=".95" opacity=".55" />
    <rect x="9" y="5" width="2.2" height="7.4" rx="1.1" transform="rotate(12 10.1 8.7)" />
    <rect x="15" y="3.9" width="2.2" height="8.6" rx="1.1" transform="rotate(12 16.1 8.2)" />
    <rect x="21" y="5" width="2.2" height="7.4" rx="1.1" transform="rotate(12 22.1 8.7)" />
  `,
  test: `
    <path d="M10.1 5.6h12.7a2 2 0 0 1 2 2v20H10.1z" />
    <path d="M7.2 8.4h5.1v19.2H7.2z" opacity=".66" />
    <path d="M20.1 8.1h4.7l2.2 19.5h-5.1L20.1 8.1Z" opacity=".56" />
    <rect x="12.7" y="11.6" width="4" height="4" rx=".7" fill="#fff" opacity=".75" />
    <rect x="12.7" y="20" width="4" height="4" rx=".7" fill="#fff" opacity=".58" />
  `,
};

function getFeatureIconColors(icon: string) {
  return featureIconColors[icon] || featureIconColors.chart;
}

function getFeatureGradientId(icon: string) {
  return `feature-gradient-${icon}`;
}

function getFeatureIconMarkup(icon: string) {
  return featureIconMarkup[icon] || featureIconMarkup.chart;
}

function openSearchPage() {
  props.navigation.navigateTo("home/search");
}

function openPage(pageId: string, label?: string) {
  if (!pageId) {
    props.showToast(`${label || "该功能"}待接入`);
    return;
  }

  props.navigation.navigateTo(pageId);
}

function applyTag(tag: string) {
  searchValue.value = tag;
  void submitSearch(tag);
}

async function submitSearch(keyword = searchValue.value) {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword) {
    openSearchPage();
    return;
  }

  if (isSubmittingSearch.value) {
    return;
  }

  try {
    isSubmittingSearch.value = true;
    searchValue.value = normalizedKeyword;

    const result = await getGlobalSearch(normalizedKeyword, 1, 10);
    saveGlobalSearchState({
      keyword: normalizedKeyword,
      list: result.list,
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      hasMore: result.hasMore
    });
    void addSearchHistory(normalizedKeyword).catch(() => undefined);
    openSearchPage();
  } catch (error) {
    props.showToast(getSearchErrorMessage(error));
  } finally {
    isSubmittingSearch.value = false;
  }
}

function showAction(label: string) {
  props.showToast(`${label}功能待接入`);
}

function openAssistantPanel() {
  props.navigation.navigateTo("home/assistant-chat");
}

function openHealthNewsDetail(newsId: string, target: "default" | "comments" = "default") {
  selectedHealthNewsId.value = newsId;
  healthNewsDetailTarget.value = target;
  props.navigation.navigateTo("content/health-news-detail");
}

function applyFallbackImage(event: Event) {
  const target = event.target as HTMLImageElement | null;

  if (!target || target.dataset.fallbackApplied === "true") {
    return;
  }

  target.dataset.fallbackApplied = "true";
  target.src = fallbackNewsImage;
}

async function loadHealthNews() {
  try {
    const response = await listHealthNews({
      page: 1,
      pageSize: 3,
      sort: "LATEST"
    });

    if (response.list.length === 0) {
      articles.value = createFallbackArticles();
      return;
    }

    articles.value = response.list.map((item, index) => ({
      id: item.id || item.newsId || `article-${index + 1}`,
      newsId: item.newsId || item.id || `article-${index + 1}`,
      title: item.title,
      desc: item.summary || "暂无资讯摘要",
      likes: item.likesCount ?? 0,
      stars: item.favoritesCount ?? 0,
      comments: item.commentsCount ?? 0,
      coverUrl:
        item.coverUrl ||
        normalizeNewsImages(
          item.newsId || item.id || `article-${index + 1}`,
          item.title,
          Array.isArray(item.images) ? item.images : [],
          item.coverUrl
        )[0] ||
        fallbackNewsImage,
      isLiked: false,
      isStarred: false,
    }));
  } catch {
    articles.value = createFallbackArticles();
  }
}

async function recordArticleShare(articleId: string) {
  const targetArticle = articles.value.find((item) => item.id === articleId);

  if (!targetArticle) {
    return;
  }

  if (targetArticle.newsId.startsWith("mock-article-")) {
    showAction("分享");
    return;
  }

  try {
    await shareHealthNews(targetArticle.newsId);
    props.showToast("分享记录已更新");
  } catch {
    props.showToast("分享失败，请稍后再试");
  }
}

async function toggleLike(articleId: string) {
  const targetArticle = articles.value.find((item) => item.id === articleId);

  if (!targetArticle) {
    return;
  }

  if (targetArticle.isLiked) {
    props.showToast("已点赞");
    return;
  }

  if (targetArticle.newsId.startsWith("mock-article-")) {
    targetArticle.isLiked = true;
    targetArticle.likes += 1;
    return;
  }

  try {
    await likeHealthNews(targetArticle.newsId);
    targetArticle.isLiked = true;
    targetArticle.likes += 1;
  } catch {
    props.showToast("点赞失败，请稍后再试");
  }
}

async function toggleStar(articleId: string) {
  const targetArticle = articles.value.find((item) => item.id === articleId);

  if (!targetArticle) {
    return;
  }

  if (targetArticle.isStarred) {
    props.showToast("已收藏");
    return;
  }

  if (targetArticle.newsId.startsWith("mock-article-")) {
    targetArticle.isStarred = true;
    targetArticle.stars += 1;
    return;
  }

  try {
    await favoriteHealthNews(targetArticle.newsId);
    targetArticle.isStarred = true;
    targetArticle.stars += 1;
  } catch {
    props.showToast("收藏失败，请稍后再试");
  }
}

onMounted(() => {
  void loadDashboard();
});
</script>

<template>
  <section class="home-page">
    <main class="home-scroll">
      <header class="home-topbar">
        <button class="location-btn" type="button" @click="openPage('home/location-select', '选择地区')">
          <img class="location-icon" :src="locationIcon" alt="定位" draggable="false" />
          <span>{{ homeCity }}</span>
          <span class="location-caret" aria-hidden="true"></span>
        </button>

      </header>

      <section class="search-wrap">
        <div class="search-box">
          <button class="search-scan-btn" type="button" aria-label="扫一扫" @click="showAction('扫一扫')">
            <img :src="scanIcon" alt="扫一扫" draggable="false" />
          </button>
          <button class="search-field" type="button" @click="openSearchPage">
            <span class="search-placeholder" :class="{ 'search-placeholder--active': searchValue }">
              {{ searchValue || "搜索服务 / 疾病 / 资讯等" }}
            </span>
          </button>
          <button class="search-submit" type="button" @click="submitSearch()">
            {{ isSubmittingSearch ? "搜索中" : "搜索" }}
          </button>
        </div>

        <div class="search-tags">
          <button
            v-for="tag in mock.searchTags"
            :key="tag"
            type="button"
            :class="{ 'search-tag--active': tag === searchValue }"
            @click="applyTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <div class="section-image-box">
          <img :src="sectionImage" alt="" draggable="false" />
        </div>

      </section>


      <section class="service-grid" aria-label="上门服务">
        <button v-for="item in serviceCards" :key="item.key" class="service-card" type="button" @click="openPage(item.pageId, item.title)">
          <span class="service-icon" :class="`service-icon--${item.key}`" aria-hidden="true">
            <img :src="item.icon" :alt="item.title" draggable="false" />
          </span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </button>
      </section>

      <section
        class="feature-panel"
        :class="{ 'feature-panel--expanded': activeFeaturePage === 1 }"
        aria-label="功能导航"
        @scroll="syncFeaturePage"
      >
        <div v-for="(page, pageIndex) in featurePages" :key="pageIndex" class="feature-page" :class="{ 'feature-page--single': pageIndex === 0 }">
          <button v-for="item in page" :key="item.title" class="feature-item" type="button" @click="openPage(item.pageId, item.title)">
            <span class="feature-icon" aria-hidden="true">
              <svg class="feature-svg" viewBox="0 0 32 32" focusable="false">
                <defs>
                  <linearGradient :id="getFeatureGradientId(item.icon)" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" :stop-color="getFeatureIconColors(item.icon)[0]" />
                    <stop offset="100%" :stop-color="getFeatureIconColors(item.icon)[1]" />
                  </linearGradient>
                </defs>
                <g :fill="`url(#${getFeatureGradientId(item.icon)})`" v-html="getFeatureIconMarkup(item.icon)"></g>
              </svg>
            </span>
            <strong>{{ item.title }}</strong>
          </button>
        </div>
      </section>

      <section
        class="reminder-card"
        role="button"
        tabindex="0"
        @click="openPage('health/medication-info', '用药信息')"
        @keydown.enter="openPage('health/medication-info', '用药信息')"
      >
        <div class="reminder-label">
          <span>健康</span>
          <span>提醒</span>
        </div>
        <span class="reminder-divider" aria-hidden="true"></span>
        <div class="reminder-content">
          <strong>
            <span class="bell-icon" aria-hidden="true"></span>
            {{ healthReminder.title }}
          </strong>
          <p>{{ healthReminder.detail }}</p>
        </div>
      </section>

      <section class="disease-section">
        <header class="section-header">
          <h2>疾病宝典</h2>
          <button type="button" @click="openPage('content/disease-guide', '疾病宝典')">
            更多
            <span aria-hidden="true"></span>
          </button>
        </header>

        <div class="disease-list">
          <button v-for="item in hotDiseases" :key="item" type="button" class="disease-pill" @click="openPage('content/disease-guide', item)">
            {{ item }}
          </button>
        </div>

        <div class="article-list">
          <article v-for="item in articles" :key="item.id" class="article-card">
            <section class="article-copy">
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </section>

            <div class="article-cover-wrap">
              <img
                v-if="item.coverUrl"
                class="article-cover"
                :src="item.coverUrl"
                :alt="item.title"
                draggable="false"
              />
              <div v-else class="article-cover article-cover--empty">暂无封面</div>
            </div>

            <footer class="article-actions">
              <button class="article-action article-action--share" type="button" aria-label="鍒嗕韩" @click.stop="recordArticleShare(item.id)">
                <svg class="article-icon article-icon--share" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="18" cy="5" r="2.7" />
                  <circle cx="6" cy="12" r="2.7" />
                  <circle cx="18" cy="19" r="2.7" />
                  <path d="M8.45 10.85 15.55 6.3" />
                  <path d="M8.45 13.15 15.55 17.7" />
                </svg>
              </button>
              <button
                class="article-action article-action--like"
                :class="{ 'article-action--active-like': item.isLiked }"
                type="button"
                @click.stop="toggleLike(item.id)"
              >
                <svg class="article-icon article-icon--heart" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20.8 5.25 14.1C3.55 12.4 2.4 10.85 2.4 8.65 2.4 5.75 4.65 3.6 7.5 3.6c1.65 0 3.15.78 4.5 2.28 1.35-1.5 2.85-2.28 4.5-2.28 2.85 0 5.1 2.15 5.1 5.05 0 2.2-1.15 3.75-2.85 5.45L12 20.8Z" />
                </svg>
                {{ item.likes }}
              </button>
              <button
                class="article-action article-action--star"
                :class="{ 'article-action--active-star': item.isStarred }"
                type="button"
                @click.stop="toggleStar(item.id)"
              >
                <svg class="article-icon article-icon--star" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3.15 2.68 5.43 5.99.87-4.33 4.22 1.02 5.96L12 16.82l-5.36 2.81 1.02-5.96-4.33-4.22 5.99-.87L12 3.15Z" />
                </svg>
                {{ item.stars }}
              </button>
              <button class="article-action article-action--comment" type="button" @click.stop="openHealthNewsDetail(item.newsId, 'comments')">
                <svg class="article-icon article-icon--comment" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.3 11.3c0 4.1-3.55 7.35-8.25 7.35-1.05 0-2.05-.17-2.97-.5L4.2 20.7l1.42-4.18C4.45 15.2 3.8 13.4 3.8 11.3c0-4.1 3.55-7.35 8.25-7.35s8.25 3.25 8.25 7.35Z" />
                </svg>
                {{ item.comments }}
              </button>
            </footer>
          </article>
        </div>
      </section>
    </main>

    <nav class="home-tabbar" aria-label="底部导航">
      <button
        v-for="item in mock.tabs"
        :key="item.key"
        class="tab-item"
        :class="[
          `tab-item--${item.key}`,
          { 'tab-item--active': item.key === 'home', 'tab-item--publish': item.key === 'publish' },
        ]"
        type="button"
        @click="openPage(item.pageId, item.label || '发布')"
      >
        <span v-if="item.key === 'publish'" class="tab-icon tab-icon--publish" aria-hidden="true"></span>
        <span v-else class="tab-image" :class="`tab-image--${item.key}`" aria-hidden="true">
          <svg class="tab-svg" viewBox="0 0 48 48" focusable="false">
            <defs>
              <linearGradient :id="getNavGradientId(item.key)" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#75d6df" />
                <stop offset="100%" stop-color="#7be28e" />
              </linearGradient>
            </defs>
            <g
              :fill="item.key === 'home' ? `url(#${getNavGradientId(item.key)})` : 'none'"
              :stroke="item.key === 'home' ? 'none' : 'currentColor'"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="getNavIconMarkup(item.key)"
            ></g>
          </svg>
        </span>
        <span v-if="item.label" class="tab-label">{{ item.label }}</span>
      </button>
    </nav>

    <FloatingAssistant @open="openAssistantPanel" />
  </section>
</template>

<style scoped>
.home-page {
  position: relative;
  width: calc(100% + 36px);
  height: auto;
  min-height: var(--ihc-page-min-height);
  max-height: none;
  margin: -18px 0 -18px -18px;
  background: var(--bg-gradient-strong);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.home-scroll {
  min-height: var(--ihc-page-min-height);
  padding: 22px 22px calc(126px + env(safe-area-inset-bottom, 0px));
}

.home-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.location-btn,
.search-box,
.search-scan-btn,
.search-field,
.search-submit,
.search-tags button,
.service-card,
.feature-item,
.section-header button,
.tab-item {
  border: 0;
  background: transparent;
  color: inherit;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}

.location-icon {
  display: block;
  width: 20px;
  height: 20px;
  object-fit: contain;
  user-select: none;
}

.location-caret {
  width: 7px;
  height: 7px;
  margin-top: -2px;
  border-right: 2px solid var(--text-secondary);
  border-bottom: 2px solid var(--text-secondary);
  transform: rotate(45deg);
  transition: border-color 0.2s ease;
}

.search-wrap {
  margin-top: 24px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  height: 42px;
  padding: 3px 4px 3px 12px;
  border: 2px solid transparent;
  border-radius: var(--radius-full);
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    linear-gradient(96deg, rgba(117, 214, 223, 0.96) 0%, rgba(93, 214, 190, 0.92) 52%, rgba(123, 226, 142, 0.92) 100%) border-box;
  box-shadow: 0 14px 30px rgba(53, 161, 152, 0.12);
  transition: box-shadow 0.2s ease;
}

.search-box:focus-within {
  box-shadow: var(--shadow);
}

.search-scan-btn {
  display: grid;
  flex: 0 0 38px;
  place-items: center;
  width: 38px;
  height: 30px;
  border-right: 1px solid var(--line);
}

.search-scan-btn img {
  display: block;
  width: 30px;
  height: 30px;
  object-fit: contain;
  transform: translateX(-3px);
  user-select: none;
}

.search-field {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 11px;
  text-align: left;
}

.search-placeholder {
  display: block;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-placeholder--active {
  color: var(--text-secondary);
}

.search-submit {
  flex: 0 0 72px;
  height: 30px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
  box-shadow: 0 8px 18px rgba(102, 112, 240, 0.22);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.search-tags {
  display: flex;
  gap: 11px;
  margin-top: 16px;
}

.search-tags button {
  height: 26px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-full);
  background: var(--surface-ghost);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.search-tags button:hover {
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
}

.search-tags button.search-tag--active {
  border-color: var(--brand-light);
  background: var(--brand-ghost);
  color: var(--brand-dark);
}

.section-image-box {
  margin-top: 16px;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
}

.section-image-box img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 12px;
  padding-top: 26px;
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-height: 116px;
  padding: 58px 8px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: all 0.25s ease;
}

.service-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.service-card::before {
  position: absolute;
  top: 10px;
  left: 14px;
  right: 14px;
  height: 48px;
  content: "";
  border-radius: var(--radius-full);
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 76%);
  z-index: -1;
}

.service-card::after {
  position: absolute;
  top: 36px;
  left: 50%;
  width: 52px;
  height: 12px;
  content: "";
  border-radius: 50%;
  background: rgba(42, 58, 74, 0.08);
  filter: blur(6px);
  transform: translateX(-50%) scaleX(0.9);
  z-index: -1;
}

.service-icon {
  position: absolute;
  top: -42px;
  left: 50%;
  display: grid;
  place-items: center;
  width: 82px;
  height: 82px;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
}

.service-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  overflow: visible;
  filter: drop-shadow(0 8px 12px rgba(42, 58, 74, 0.12));
  user-select: none;
}

.service-icon--care {
  top: -11px;
  width: 66px;
  height: 66px;
}

.service-icon--rehab {
  top: -18px;
  width: 70px;
  height: 76px;
}

.service-icon--exam {
  top: -11px;
  width: 53px;
  height: 44px;
}

.service-card strong {
  margin-top: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
}

.service-card small {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.feature-panel {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-padding: 0;
  box-sizing: border-box;
  height: 108px;
  margin-top: 16px;
  padding: 22px 0 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: height 0.22s ease;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.feature-panel--expanded {
  height: 168px;
}

.feature-panel::-webkit-scrollbar {
  display: none;
}

.feature-page {
  flex: 0 0 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  row-gap: 24px;
  align-content: start;
  padding: 0 16px;
  scroll-snap-align: start;
}

.feature-page--single {
  align-content: center;
}

.feature-item {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 0;
}

.feature-item strong {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
}

.feature-svg {
  display: block;
  width: 28px;
  height: 28px;
  overflow: visible;
  filter: drop-shadow(0 3px 5px rgba(42, 58, 74, 0.08));
}

.reminder-card {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 16px;
  padding: 18px 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reminder-card:hover {
  box-shadow: var(--shadow);
}

.reminder-label {
  display: grid;
  gap: 2px;
  min-width: 52px;
  color: #d85b5b;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.reminder-divider {
  width: 2px;
  height: 40px;
  background: var(--line-strong);
  border-radius: 1px;
}

.reminder-content {
  min-width: 0;
}

.reminder-content strong {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}

.bell-icon {
  position: relative;
  width: 14px;
  height: 16px;
  border-radius: 10px 10px 5px 5px;
  background: #d85b5b;
}

.bell-icon::after {
  position: absolute;
  bottom: -5px;
  left: 5px;
  width: 7px;
  height: 4px;
  content: "";
  border-radius: 0 0 999px 999px;
  background: #d85b5b;
}

.reminder-content p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.disease-section {
  margin-top: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h2 {
  margin: 0;
  color: var(--text);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
}

.section-header button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.section-header button span {
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--text-muted);
  border-right: 2px solid var(--text-muted);
  transform: rotate(45deg);
}

.disease-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-top: 20px;
}

.disease-pill {
  min-width: 62px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.disease-pill:hover {
  box-shadow: var(--shadow);
  background: var(--surface-strong);
}

.article-list {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.article-card {
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.article-card:hover {
  box-shadow: var(--shadow);
}

.article-entry {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  color: inherit;
  font: inherit;
}

.article-copy h3 {
  margin: 0;
  color: var(--text);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
}

.article-copy p {
  margin: 14px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.7;
}

.article-cover-wrap {
  margin-top: 14px;
}

.article-cover {
  display: block;
  width: 100%;
  height: 172px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: #f0f4f6;
  user-select: none;
}

.article-cover--empty {
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  border: 1px dashed var(--line-strong);
}

.article-actions {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 20px;
  margin-top: 18px;
}

.article-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: color 0.15s ease;
}

.article-action--share {
  justify-self: start;
}

.article-action--active-like {
  color: #e87476;
}

.article-action--active-star {
  color: #d4a847;
}

.article-icon {
  display: block;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-icon--share {
  width: 20px;
  height: 20px;
}

.article-icon--heart,
.article-icon--star,
.article-icon--comment {
  width: 22px;
  height: 22px;
}

.article-icon--heart path,
.article-icon--star path {
  transition: fill 0.15s ease;
}

.article-action--active-like .article-icon--heart path {
  fill: currentColor;
}

.article-action--active-star .article-icon--star path {
  fill: currentColor;
}

.home-tabbar {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  width: min(402px, 100vw);
  height: calc(72px + env(safe-area-inset-bottom, 0px));
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 -10px 24px rgba(95, 104, 185, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.home-tabbar::before {
  position: absolute;
  top: -28px;
  left: 50%;
  z-index: 0;
  width: 54px;
  height: 54px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 -10px 24px rgba(95, 104, 185, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.tab-item {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 0;
  padding: 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  transform: translateY(-6px);
}

.tab-item--active {
  color: var(--brand);
}

.tab-image {
  display: grid;
  place-items: center;
  width: 38px;
  height: 32px;
}

.tab-svg {
  display: block;
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 3px 6px rgba(42, 58, 74, 0.08));
}

.tab-label {
  margin-top: 2px;
}

.tab-item--publish {
  align-self: start;
  z-index: 2;
  transform: none;
}

.tab-icon--publish {
  position: relative;
  display: block;
  width: 40px;
  height: 40px;
  margin-top: -28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
  box-shadow: 0 14px 24px rgba(53, 161, 152, 0.28);
}

.tab-icon--publish::before,
.tab-icon--publish::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 2px;
  content: "";
  border-radius: 999px;
  background: #ffffff;
  transform: translate(-50%, -50%);
}

.tab-icon--publish::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

@media (min-width: 561px) {
  .home-page {
    height: auto;
    min-height: var(--ihc-page-min-height);
  }
}

@media (max-width: 389px) {
  .home-scroll {
    padding-right: 20px;
    padding-left: 20px;
  }

  .service-grid {
    gap: 10px;
  }

  .service-card strong {
    font-size: 14px;
  }

  .service-card small,
  .reminder-content p {
    font-size: 12px;
  }

  .feature-panel {
    padding-right: 14px;
    padding-left: 14px;
  }

  .feature-item strong {
    font-size: 13px;
  }
}
</style>
