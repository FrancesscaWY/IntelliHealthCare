import detailImage from "@/assets/content/health-lecture-detail.jpg";
import detailVideo from "@/assets/content/health-lecture-detail.mp4";
import latestImage from "@/assets/content/health-lecture-latest.jpg";
import { createDefaultComments } from "../comment-mock";

const mock = {
  heroImage: detailImage,
  videoUrl: detailVideo,
  title: "老年人如何科学合理地补充维生素？",
  publishText: "2024年8月24日 11:45 发布 7000播放",
  summary:
    "老年人补充维生素是一个重要的健康维护措施，由于老年人身体机能的下降，包括牙齿咀嚼力度和消化功能的降低，容易导致维生素的缺乏。",
  tags: ["#老年健康", "#健康饮食"],
  stats: {
    likes: 1001,
    stars: 210,
    comments: 6,
  },
  comments: createDefaultComments(),
  recommendationTitle: "推荐视频",
  recommendation: {
    id: "recommend-1",
    title: "老年人如何预防骨质疏松？",
    imageUrl: latestImage,
    likes: 1001,
    stars: 210,
    comments: 6,
  },
};

export default mock;
