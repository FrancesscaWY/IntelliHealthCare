import hotImageAsset from "@/assets/content/health-lecture-hot.jpg";
import latestImageAsset from "@/assets/content/health-lecture-latest.jpg";

export interface LectureCard {
  id: string;
  lectureId: string;
  title: string;
  imageUrl: string;
  likes: number;
  stars: number;
  comments: number;
  isLiked: boolean;
  isStarred: boolean;
}

export type LectureTabKey = "hot" | "latest";

const mock: {
  title: string;
  tabs: Array<{ key: LectureTabKey; label: string }>;
  cards: Record<LectureTabKey, LectureCard[]>;
} = {
  title: "健康讲堂",
  tabs: [
    { key: "hot", label: "最热" },
    { key: "latest", label: "最新" }
  ],
  cards: {
    hot: [
      {
        id: "lecture-card-1",
        lectureId: "lecture_bp_manage",
        title: "高血压家庭监测与用药管理",
        imageUrl: hotImageAsset,
        likes: 1,
        stars: 1,
        comments: 6,
        isLiked: false,
        isStarred: false
      },
      {
        id: "lecture-card-2",
        lectureId: "lecture_rehab_train",
        title: "脑卒中术后居家训练常见误区",
        imageUrl: latestImageAsset,
        likes: 1,
        stars: 0,
        comments: 0,
        isLiked: false,
        isStarred: false
      }
    ],
    latest: [
      {
        id: "lecture-card-3",
        lectureId: "lecture_nutrition",
        title: "长者一周营养搭配思路",
        imageUrl: hotImageAsset,
        likes: 0,
        stars: 0,
        comments: 0,
        isLiked: false,
        isStarred: false
      },
      {
        id: "lecture-card-4",
        lectureId: "lecture_bp_manage",
        title: "高血压家庭监测与用药管理",
        imageUrl: latestImageAsset,
        likes: 1,
        stars: 1,
        comments: 6,
        isLiked: false,
        isStarred: false
      }
    ]
  }
};

export default mock;
