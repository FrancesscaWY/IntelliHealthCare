import circleIcon from "@/assets/home/nav/circle.png";
import homeIcon from "@/assets/home/nav/home.png";
import meIcon from "@/assets/home/nav/me.png";
import newsIcon from "@/assets/home/nav/news.png";
import careIcon from "@/assets/home/sections/\u5bb6\u653f.png";
import examIcon from "@/assets/home/sections/\u4f53\u68c0.png";
import rehabIcon from "@/assets/home/sections/\u5eb7\u590d.png";

const mock = {
  city: "上海",
  searchTags: ["高血压", "冠心病", "如何控制血糖"],
  services: [
    { key: "care", title: "家政护理", desc: "快速上门服务", icon: careIcon, pageId: "service/home-care" },
    { key: "rehab", title: "康复理疗", desc: "全套护理方案", icon: rehabIcon, pageId: "service/rehab-therapy" },
    { key: "exam", title: "上门体检", desc: "专业医师团队", icon: examIcon, pageId: "service/home-exam" },
  ],
  features: [
    { title: "健康数据", icon: "chart", pageId: "health/health-data" },
    { title: "设备中心", icon: "device", pageId: "health/device-center" },
    { title: "用药信息", icon: "medicine", pageId: "health/medication-info" },
    { title: "健康膳食", icon: "meal", pageId: "health/diet-plan" },
    { title: "疾病宝典", icon: "book", pageId: "content/disease-guide" },
    { title: "健康档案", icon: "archive", pageId: "healthdocs/health-records" },
    { title: "老年活动", icon: "activity", pageId: "community/senior-activities" },
    { title: "健康资讯", icon: "news", pageId: "content/health-news" },
    { title: "养老机构", icon: "building", pageId: "service/elderly-care" },
    { title: "健康讲堂", icon: "video", pageId: "content/health-lecture" },
    { title: "饮食记录", icon: "bowl", pageId: "" },
    { title: "健康自测", icon: "test", pageId: "health/self-test" },
  ],
  reminder: {
    label: "健康\n提醒",
    title: "用药提醒",
    detail: "服药时间：06：30  卡托普利  2片",
  },
  diseases: ["白内障", "高血压", "中风", "阿尔兹海默症", "糖尿病", "心率不齐"],
  articles: [
    {
      id: "blood-sugar-guide-1",
      title: "老年人如何控制血糖？",
      desc: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
      likes: 1001,
      stars: 210,
      comments: 6,
    },
    {
      id: "blood-sugar-guide-2",
      title: "老年人如何控制血糖？",
      desc: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法：",
      likes: 1001,
      stars: 210,
      comments: 6,
    },
  ],
  tabs: [
    { key: "home", label: "首页", pageId: "home/dashboard", icon: homeIcon },
    { key: "circle", label: "生活圈", pageId: "community/circle", icon: circleIcon },
    { key: "publish", label: "", pageId: "community/publish" },
    { key: "message", label: "消息", pageId: "home/message", icon: newsIcon },
    { key: "mine", label: "我的", pageId: "home/mine", icon: meIcon },
  ],
};

export default mock;
