import detailImage from "@/assets/content/health-lecture-detail.jpg";
import detailVideo from "@/assets/content/health-lecture-detail.mp4";
import latestImage from "@/assets/content/health-lecture-latest.jpg";
import { createDefaultComments } from "../comment-mock";

const mock = {
  heroImage: detailImage,
  videoUrl: detailVideo,
  title: "高血压家庭监测与用药管理",
  publishText: "2026年4月20日发布 · 5次播放",
  summary: "讲解如何正确测量家庭血压、识别高值和记录用药依从性。",
  tags: ["#血压管理", "#家庭照护"],
  stats: {
    likes: 1,
    stars: 1,
    comments: 6
  },
  comments: createDefaultComments(),
  recommendationTitle: "推荐视频",
  recommendation: {
    id: "lecture_rehab_train",
    lectureId: "lecture_rehab_train",
    title: "脑卒中术后居家训练常见误区",
    imageUrl: latestImage,
    likes: 1,
    stars: 0,
    comments: 0
  }
};

export default mock;
