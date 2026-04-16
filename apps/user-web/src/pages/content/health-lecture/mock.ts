import hotImageAsset from "@/assets/content/health-lecture-hot.jpg";
import latestImageAsset from "@/assets/content/health-lecture-latest.jpg";

export interface LectureCard {
  id: string;
  title: string;
  imageUrl: string;
  likes: number;
  stars: number;
  comments: number;
}

export type LectureTabKey = "hot" | "latest";

const hotImage = hotImageAsset;
const latestImage = latestImageAsset;

const mock: {
  title: string;
  tabs: Array<{ key: LectureTabKey; label: string }>;
  cards: Record<LectureTabKey, LectureCard[]>;
} = {
  title: "健康讲堂",
  tabs: [
    { key: "hot", label: "最热" },
    { key: "latest", label: "最新" },
  ],
  cards: {
    hot: [
      {
        id: "hot-1",
        title: "老年人如何科学合理地补充维生素？",
        imageUrl: hotImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "hot-2",
        title: "老年人如何科学合理地补充维生素？",
        imageUrl: hotImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "hot-3",
        title: "老年人如何科学合理地补充维生素？",
        imageUrl: hotImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
    ] satisfies LectureCard[],
    latest: [
      {
        id: "latest-1",
        title: "老年人如何预防骨质疏松？",
        imageUrl: latestImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "latest-2",
        title: "老年人如何预防骨质疏松？",
        imageUrl: latestImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      {
        id: "latest-3",
        title: "老年人如何预防骨质疏松？",
        imageUrl: latestImage,
        likes: 1001,
        stars: 210,
        comments: 6,
      },
    ] satisfies LectureCard[],
  },
};

export default mock;
