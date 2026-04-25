import type {
  PublishedContentGalleryItem,
  PublishedContentReference,
} from "./content-metadata";

const PEXELS_IMAGE_BASE_URL = "https://images.pexels.com/photos";

function buildPexelsImageUrl(photoId: string) {
  return `${PEXELS_IMAGE_BASE_URL}/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
}

type CuratedLectureMedia = {
  coverUrl: string;
  videoUrl: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceDescription: string | null;
  sourcePublishedAt: string | null;
  watchUrl: string | null;
  watchLabel: string | null;
  readingMinutes: number | null;
  imageAlt: string | null;
  gallery: PublishedContentGalleryItem[];
  references: PublishedContentReference[];
};

const curatedLectureMediaById: Record<string, CuratedLectureMedia> = {
  lecture_bp_manage: {
    coverUrl: buildPexelsImageUrl("8088856"),
    videoUrl:
      "https://videos.pexels.com/video-files/8088985/8088985-uhd_2732_1440_24fps.mp4",
    sourceName: "央视网",
    sourceUrl: "https://news.cctv.com/2023/10/08/ARTIYL5x8otjzdVlWtJ8y6wZ231008.shtml",
    sourceTitle: "【够科普】99秒！教您测量血压的正确方法",
    sourceDescription:
      "央视网在全国高血压日发布的中文科普短视频，聚焦家庭血压测量方法、测量次数与注意事项。",
    sourcePublishedAt: "2023-10-08",
    watchUrl: "https://news.cctv.com/2023/10/08/ARTIYL5x8otjzdVlWtJ8y6wZ231008.shtml",
    watchLabel: "查看央视原始视频",
    readingMinutes: 2,
    imageAlt: "央视网高血压日科普视频中的家庭血压测量画面",
    gallery: [
      {
        url: buildPexelsImageUrl("8088856"),
        alt: "两位长者在家中检查血压",
        caption: "家庭测压类讲堂需要把设备、姿势和测量时机讲清楚，用户才能真正照着做。",
        credit: "Pexels / cottonbro studio",
      },
    ],
    references: [
      {
        title: "【够科普】99秒！教您测量血压的正确方法",
        url: "https://news.cctv.com/2023/10/08/ARTIYL5x8otjzdVlWtJ8y6wZ231008.shtml",
        sourceName: "央视网",
      },
      {
        title: "基层医疗卫生机构高血压防治管理标准（WS/T 872—2025）",
        url: "https://www.nhc.gov.cn/fzs/c100048/202509/2f3f7cce449145f8b361e70b3ed4ae9a/files/WS%20T%20872%E2%80%942025-20250930105429913.pdf",
        sourceName: "国家卫生健康委员会",
      },
    ],
  },
  lecture_rehab_train: {
    coverUrl: buildPexelsImageUrl("775417"),
    videoUrl:
      "https://videos.pexels.com/video-files/4806686/4806686-uhd_2560_1440_30fps.mp4",
    sourceName: "World Health Organization",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/ageing-and-health",
    sourceTitle: "Ageing and health",
    sourceDescription:
      "WHO fact sheet on ageing, common health conditions and healthy ageing response.",
    sourcePublishedAt: null,
    watchUrl: "https://www.who.int/news-room/fact-sheets/detail/ageing-and-health",
    watchLabel: "查看原始资料",
    readingMinutes: 7,
    imageAlt: "长者在户外步行保持活动能力",
    gallery: [
      {
        url: buildPexelsImageUrl("775417"),
        alt: "两位长者在公园步道上慢走",
        caption: "维持步行、转移和基础活动能力，是健康老龄化管理里最需要长期守住的功能底线。",
        credit: "Pexels / Matthias Zomer",
      },
    ],
    references: [
      {
        title: "Ageing and health",
        url: "https://www.who.int/news-room/fact-sheets/detail/ageing-and-health",
        sourceName: "World Health Organization",
      },
      {
        title: "Healthy Aging: MedlinePlus",
        url: "https://medlineplus.gov/healthyaging.html",
        sourceName: "MedlinePlus",
      },
    ],
  },
  lecture_nutrition: {
    coverUrl: buildPexelsImageUrl("11583653"),
    videoUrl:
      "https://videos.pexels.com/video-files/8107720/8107720-uhd_1440_2732_25fps.mp4",
    sourceName: "MedlinePlus",
    sourceUrl: "https://medlineplus.gov/healthyaging.html",
    sourceTitle: "Healthy Aging: MedlinePlus",
    sourceDescription:
      "Healthy lifestyle and chronic condition management can help people live more independently later in life.",
    sourcePublishedAt: null,
    watchUrl: "https://medlineplus.gov/healthyaging.html",
    watchLabel: "查看原始资料",
    readingMinutes: 6,
    imageAlt: "健康早餐与水果搭配场景",
    gallery: [
      {
        url: buildPexelsImageUrl("11583653"),
        alt: "摆放在桌面的水果燕麦早餐",
        caption: "把可持续的早餐搭配、蔬果摄入和慢病饮食节奏放进同一周计划，更容易长期执行。",
        credit: "Pexels / Ella Olsson",
      },
    ],
    references: [
      {
        title: "Healthy Aging: MedlinePlus",
        url: "https://medlineplus.gov/healthyaging.html",
        sourceName: "MedlinePlus",
      },
      {
        title: "Nutrition | MedlinePlus",
        url: "https://medlineplus.gov/nutrition.html",
        sourceName: "MedlinePlus",
      },
    ],
  },
};

const curatedLectureIdBySlug: Record<string, string> = {
  "guide-home-blood-pressure-monitoring": "lecture_bp_manage",
  "guide-healthy-ageing-functional-ability": "lecture_rehab_train",
  "guide-healthy-ageing-lifestyle-routine": "lecture_nutrition",
};

export function resolveCuratedLectureMedia(lecture: {
  id?: string | null;
  slug?: string | null;
}) {
  const byId = lecture.id ? curatedLectureMediaById[lecture.id] : undefined;
  if (byId) {
    return byId;
  }

  const bySlug =
    lecture.slug && curatedLectureIdBySlug[lecture.slug]
      ? curatedLectureMediaById[curatedLectureIdBySlug[lecture.slug]!]
      : undefined;

  return bySlug ?? null;
}
