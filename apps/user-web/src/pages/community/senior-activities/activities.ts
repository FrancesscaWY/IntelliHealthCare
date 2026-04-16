import blossomImage from "@/assets/community/activities/cherry-blossom-activity.jpg";
import beachImage from "@/assets/community/activities/beach-walk-activity.jpg";
import pondImage from "@/assets/community/activities/cherry-pond-detail.jpg";
import { createDefaultComments } from "../../content/comment-mock";

export type SeniorActivityTabKey = "hot" | "latest";

export type SeniorActivityItem = {
  id: string;
  title: string;
  type: string;
  typeKey: "culture" | "outdoor";
  status: string;
  statusKey: "upcoming" | "ongoing";
  time: string;
  location: string;
  price: string;
  image: string;
  publishDate: string;
  dateRange: string;
  signUpDeadline: string;
  detailImage: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
  stats: {
    likes: number;
    stars: number;
    comments: number;
  };
  comments: ReturnType<typeof createDefaultComments>;
};

const sharedPhotographySections = [
  {
    title: "作品征集：",
    paragraphs: [
      "参赛者需提交自己拍摄的摄影作品，内容可涵盖小区风光、人物、生活场景等，展现桂花小区的美好与温馨。",
    ],
  },
  {
    title: "作品展示：",
    paragraphs: [
      "所有参赛作品将在桂花小区社区文化活动中心进行展示，供居民们观赏交流。",
      "评选颁奖：大赛将邀请专业评委对参赛作品进行评选，并设立多个奖项，以表彰优秀作品和摄影人才。",
    ],
  },
  {
    title: "奖项设置：",
    paragraphs: [
      "金奖：1名，奖金2000元及荣誉证书；",
      "银奖：2名，奖金各1000元及荣誉证书；",
      "铜奖：3名，奖金各500元及荣誉证书；",
      "优秀奖：若干名，精美礼品及荣誉证书。",
    ],
  },
  {
    title: "",
    paragraphs: [
      "我们诚挚邀请桂花小区的老年朋友们积极参与本次摄影大赛，用镜头记录生活的美好，展现自己的摄影才华。同时，也欢迎广大居民前来观赏作品，共同感受光影的魅力。让我们携手共进，为桂花小区的文化生活增添更多色彩。",
    ],
  },
];

const sharedOutdoorSections = [
  {
    title: "活动介绍：",
    paragraphs: [
      "春日海边徒步活动面向社区长者开放，由志愿者陪同步行，沿海岸线设置多个休息点和补给点，兼顾安全与舒适。",
    ],
  },
  {
    title: "活动安排：",
    paragraphs: [
      "集合后统一热身，按小组出发，沿步道完成约3公里的慢节奏步行，中途安排拍照、观景和拉伸环节。",
      "活动结束后将在服务站发放纪念贴纸和饮用水，帮助长者放松恢复。",
    ],
  },
  {
    title: "温馨提醒：",
    paragraphs: [
      "建议穿着防滑运动鞋和轻便外套，随身携带常用药品；如遇大风或降雨天气，活动将顺延并提前通知。",
    ],
  },
];

export const seniorActivitiesByTab: Record<SeniorActivityTabKey, SeniorActivityItem[]> = {
  hot: [
    {
      id: "activity-photography",
      title: "桂花小区老年摄影大赛火热进行中",
      type: "文化娱乐",
      typeKey: "culture",
      status: "进行中",
      statusKey: "ongoing",
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      price: "20元",
      image: blossomImage,
      publishDate: "2024年1月13日",
      dateRange: "2024.04.01-2024.04.26",
      signUpDeadline: "2024.03.28",
      detailImage: pondImage,
      sections: sharedPhotographySections,
      stats: {
        likes: 1001,
        stars: 210,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
    {
      id: "activity-photo-salon",
      title: "春日花影随手拍交流沙龙",
      type: "文化娱乐",
      typeKey: "culture",
      status: "未开始",
      statusKey: "upcoming",
      time: "2024.04.20~2024.05.06",
      location: "桂花社区活动室",
      price: "免费",
      image: blossomImage,
      publishDate: "2024年1月18日",
      dateRange: "2024.04.20-2024.05.06",
      signUpDeadline: "2024.04.18",
      detailImage: pondImage,
      sections: sharedPhotographySections,
      stats: {
        likes: 268,
        stars: 86,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
    {
      id: "activity-photo-exhibit",
      title: "社区摄影作品布展志愿招募",
      type: "文化娱乐",
      typeKey: "culture",
      status: "未开始",
      statusKey: "upcoming",
      time: "2024.04.22~2024.05.08",
      location: "海滨文化广场",
      price: "10元",
      image: blossomImage,
      publishDate: "2024年1月20日",
      dateRange: "2024.04.22-2024.05.08",
      signUpDeadline: "2024.04.20",
      detailImage: pondImage,
      sections: sharedPhotographySections,
      stats: {
        likes: 195,
        stars: 74,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
  ],
  latest: [
    {
      id: "activity-seaside-walk",
      title: "春日海边徒步",
      type: "户外运动",
      typeKey: "outdoor",
      status: "进行中",
      statusKey: "ongoing",
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      price: "20元",
      image: beachImage,
      publishDate: "2024年1月19日",
      dateRange: "2024.04.16-2024.05.02",
      signUpDeadline: "2024.04.12",
      detailImage: beachImage,
      sections: sharedOutdoorSections,
      stats: {
        likes: 320,
        stars: 96,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
    {
      id: "activity-coast-walk",
      title: "滨海慢走打卡活动",
      type: "户外运动",
      typeKey: "outdoor",
      status: "进行中",
      statusKey: "ongoing",
      time: "2024.04.18~2024.05.04",
      location: "海天步道南段",
      price: "15元",
      image: beachImage,
      publishDate: "2024年1月21日",
      dateRange: "2024.04.18-2024.05.04",
      signUpDeadline: "2024.04.14",
      detailImage: beachImage,
      sections: sharedOutdoorSections,
      stats: {
        likes: 288,
        stars: 82,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
    {
      id: "activity-morning-walk",
      title: "晨光海风健步团",
      type: "户外运动",
      typeKey: "outdoor",
      status: "进行中",
      statusKey: "ongoing",
      time: "2024.04.19~2024.05.05",
      location: "银沙滩东入口",
      price: "免费",
      image: beachImage,
      publishDate: "2024年1月22日",
      dateRange: "2024.04.19-2024.05.05",
      signUpDeadline: "2024.04.15",
      detailImage: beachImage,
      sections: sharedOutdoorSections,
      stats: {
        likes: 246,
        stars: 70,
        comments: 6,
      },
      comments: createDefaultComments(),
    },
  ],
};

export const seniorActivityTabs: Array<{ key: SeniorActivityTabKey; label: string }> = [
  { key: "hot", label: "最热" },
  { key: "latest", label: "最新" },
];

export function getSeniorActivityById(id: string) {
  for (const tab of Object.values(seniorActivitiesByTab)) {
    const matched = tab.find((item) => item.id === id);

    if (matched) {
      return matched;
    }
  }

  return seniorActivitiesByTab.hot[0];
}
