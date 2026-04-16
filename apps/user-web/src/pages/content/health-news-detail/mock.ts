import detailImage from "@/assets/content/health-lecture-hot.jpg";
import { createDefaultComments } from "../comment-mock";

const mock = {
  navTitle: "资讯详情",
  title: "老年人如何控制血糖？",
  publishDate: "发布时间：2024年1月13日",
  heroImage: detailImage,
  stats: {
    likes: 1001,
    stars: 210,
    comments: 3,
  },
  paragraphs: [
    "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
    "饮食管理：这是控制血糖的基础。应避免食用高糖、高脂、高盐的食物，如糖果、甜点、油炸食品等。增加蔬菜、水果、全谷类和瘦肉的摄入量，这些食物富含纤维和蛋白质，有助于稳定血糖。同时，控制碳水化合物的摄入量，选择低GI（升糖指数）的食物，有助于减缓血糖升高的速度。",
    "规律运动：运动可以提高身体的代谢率，帮助身体消耗血糖。建议每周进行至少150分钟的中等强度有氧运动，如快走、游泳、骑自行车等。运动前后要注意监测血糖，确保运动安全。",
  ],
  comments: createDefaultComments(),
};

export default mock;
