import type {
  PublishedContentGalleryItem,
  PublishedContentReference,
} from "./content-metadata";

const CURATED_CONTENT_ASSET_BASE = "/api/v1/assets/curated/content";

type CuratedNewsMedia = {
  title: string | null;
  summary: string | null;
  authorName: string | null;
  coverUrl: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceDescription: string | null;
  sourcePublishedAt: string | null;
  readingMinutes: number | null;
  imageAlt: string | null;
  gallery: PublishedContentGalleryItem[];
  references: PublishedContentReference[];
};

const curatedNewsMediaById: Record<string, CuratedNewsMedia> = {
  article_low_salt: {
    title: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    summary:
      "高血压是指动脉内的压力持续偏高。高血压通常很长年没有症状，直到重要脏器受损时才被发现，因此被称为“隐形杀手”。",
    authorName: "默沙东诊疗手册大众版",
    coverUrl: `${CURATED_CONTENT_ASSET_BASE}/article-hypertension-msdmanuals-cn.gif`,
    sourceName: "默沙东诊疗手册大众版",
    sourceUrl:
      "https://www.msdmanuals.cn/home/heart-and-blood-vessel-disorders/high-blood-pressure/high-blood-pressure",
    sourceTitle: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    sourceDescription:
      "高血压——从默沙东诊疗手册 （大众版）了解病因、症状、诊断及治疗。",
    sourcePublishedAt: null,
    readingMinutes: 6,
    imageAlt: "高血压主题配图，展示血压调节相关示意",
    gallery: [
      {
        url: `${CURATED_CONTENT_ASSET_BASE}/article-hypertension-msdmanuals-cn.gif`,
        alt: "高血压主题示意图",
        caption: "高血压是指动脉内的压力持续偏高。",
        credit: "默沙东诊疗手册大众版",
      },
    ],
    references: [
      {
        title: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
        url: "https://www.msdmanuals.cn/home/heart-and-blood-vessel-disorders/high-blood-pressure/high-blood-pressure",
        sourceName: "默沙东诊疗手册大众版",
      },
    ],
  },
  article_fall_prevention: {
    title: "老年人跌倒 - 老年人的健康问题 - 《默沙东诊疗手册大众版》",
    summary:
      "大多数跌倒都发生在有一种或多种疾病影响了身体的活动性或平衡性并且有某种环境危害因素的老年人中。采用预防措施常可预防在家发生跌倒。",
    authorName: "默沙东诊疗手册大众版",
    coverUrl: `${CURATED_CONTENT_ASSET_BASE}/article-falls-msdmanuals-cn.gif`,
    sourceName: "默沙东诊疗手册大众版",
    sourceUrl:
      "https://www.msdmanuals.cn/home/older-people-s-health-issues/falls-in-older-adults/falls-in-older-adults",
    sourceTitle: "老年人跌倒 - 老年人的健康问题 - 《默沙东诊疗手册大众版》",
    sourceDescription:
      "老年人跌倒——从默沙东诊疗手册 （大众版）了解。",
    sourcePublishedAt: null,
    readingMinutes: 5,
    imageAlt: "老年人跌倒主题配图，展示老人使用手杖行走",
    gallery: [
      {
        url: `${CURATED_CONTENT_ASSET_BASE}/article-falls-msdmanuals-cn.gif`,
        alt: "老年人跌倒主题示意图",
        caption: "采用预防措施常可预防在家发生跌倒。",
        credit: "默沙东诊疗手册大众版",
      },
    ],
    references: [
      {
        title: "老年人跌倒 - 老年人的健康问题 - 《默沙东诊疗手册大众版》",
        url: "https://www.msdmanuals.cn/home/older-people-s-health-issues/falls-in-older-adults/falls-in-older-adults",
        sourceName: "默沙东诊疗手册大众版",
      },
    ],
  },
  article_sleep_quality: {
    title: "失眠和白天过度睡眠(EDS) - 脑、脊髓及神经障碍 - 《默沙东诊疗手册大众版》",
    summary:
      "最常见的睡眠相关的问题是失眠和白天过度睡眠。失眠是指难以入睡或保持睡眠、醒得很早，或者睡眠质量失调，导致睡眠不足或无法恢复。",
    authorName: "默沙东诊疗手册大众版",
    coverUrl: `${CURATED_CONTENT_ASSET_BASE}/article-sleep-msdmanuals-cn.jpg`,
    sourceName: "默沙东诊疗手册大众版",
    sourceUrl:
      "https://www.msdmanuals.cn/home/brain-spinal-cord-and-nerve-disorders/sleep-disorders/insomnia-and-excessive-daytime-sleepiness-eds?ruleredirectid=14",
    sourceTitle: "失眠和白天过度睡眠(EDS) - 脑、脊髓及神经障碍 - 《默沙东诊疗手册大众版》",
    sourceDescription:
      "失眠和白天过度睡眠(EDS)——从默沙东诊疗手册 （大众版）了解病因、症状、诊断及治疗。",
    sourcePublishedAt: null,
    readingMinutes: 5,
    imageAlt: "睡眠障碍主题配图，展示睡眠与清醒状态的医学插图",
    gallery: [
      {
        url: `${CURATED_CONTENT_ASSET_BASE}/article-sleep-msdmanuals-cn.jpg`,
        alt: "睡眠障碍主题示意图",
        caption: "最常见的睡眠相关的问题是失眠和白天过度睡眠。",
        credit: "默沙东诊疗手册大众版",
      },
    ],
    references: [
      {
        title: "失眠和白天过度睡眠(EDS) - 脑、脊髓及神经障碍 - 《默沙东诊疗手册大众版》",
        url: "https://www.msdmanuals.cn/home/brain-spinal-cord-and-nerve-disorders/sleep-disorders/insomnia-and-excessive-daytime-sleepiness-eds?ruleredirectid=14",
        sourceName: "默沙东诊疗手册大众版",
      },
    ],
  },
};

const curatedNewsIdBySlug: Record<string, string> = {
  "low-salt-diet-for-seniors": "article_low_salt",
  "home-blood-pressure-routine-for-older-adults": "article_low_salt",
  "home-fall-prevention": "article_fall_prevention",
  "older-adult-fall-prevention-checklist": "article_fall_prevention",
  "sleep-quality-for-elders": "article_sleep_quality",
  "sleep-routine-checklist-for-older-adults": "article_sleep_quality",
};

export function resolveCuratedNewsMedia(article: {
  id?: string | null;
  slug?: string | null;
}) {
  const byId = article.id ? curatedNewsMediaById[article.id] : undefined;
  if (byId) {
    return byId;
  }

  const bySlug =
    article.slug && curatedNewsIdBySlug[article.slug]
      ? curatedNewsMediaById[curatedNewsIdBySlug[article.slug]!]
      : undefined;

  return bySlug ?? null;
}
