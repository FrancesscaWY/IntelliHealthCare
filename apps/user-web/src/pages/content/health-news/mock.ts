import detailImage from "@/assets/content/health-lecture-detail.jpg";
import hotImage from "@/assets/content/health-lecture-hot.jpg";
import latestImage from "@/assets/content/health-lecture-latest.jpg";

export type HealthNewsTabKey = "hot" | "latest";

export interface HealthNewsCard {
  id: string;
  title: string;
  summary: string;
  images: string[];
  likes: number;
  stars: number;
  comments: number;
}

const mock: {
  title: string;
  tabs: Array<{ key: HealthNewsTabKey; label: string }>;
  cards: Record<HealthNewsTabKey, HealthNewsCard[]>;
} = {
  title: "健康资讯",
  tabs: [
    { key: "hot", label: "最热" },
    { key: "latest", label: "最新" },
  ],
  cards: {
    hot: [
      {
        id: "hot-1",
        title: "老年人如何控制血糖？",
        summary: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
        images: [detailImage, hotImage, latestImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "hot-2",
        title: "老年人如何控制血糖？",
        summary: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
        images: [detailImage, hotImage, latestImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "hot-3",
        title: "老年人如何控制血糖？",
        summary: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
        images: [detailImage, hotImage, latestImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
    ],
    latest: [
      {
        id: "latest-1",
        title: "老年人失眠怎么办？",
        summary: "老年人失眠是一个常见的问题，可能由多种因素引起，包括生理变化、心理压力、生活习惯和环境因素等。针对…",
        images: [detailImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "latest-2",
        title: "老年人失眠怎么办？",
        summary: "老年人失眠是一个常见的问题，可能由多种因素引起，包括生理变化、心理压力、生活习惯和环境因素等。针对…",
        images: [detailImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "latest-3",
        title: "老年人失眠怎么办？",
        summary: "老年人失眠是一个常见的问题，可能由多种因素引起，包括生理变化、心理压力、生活习惯和环境因素等。针对…",
        images: [detailImage],
        likes: 1001,
        stars: 210,
        comments: 6,
      },
    ],
  },
};

export default mock;
