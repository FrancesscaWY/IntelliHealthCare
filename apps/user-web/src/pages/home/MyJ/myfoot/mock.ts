import cherryBlossomActivityImage from "@/assets/community/activities/cherry-blossom-activity.jpg";
import homeCareImage from "@/assets/service/home-care/home.png";

export interface ServiceFootprint {
  id: string;
  type: "service";
  title: string;
  image: string;
  price: string;
}

export interface ActivityFootprint {
  id: string;
  type: "activity";
  title: string;
  image: string;
  time: string;
  location: string;
  fee: string;
}

export type FootprintRecord = ServiceFootprint | ActivityFootprint;

const mock = {
  title: "我的足迹",
  clearLabel: "清除全部",
  endText: "没有更多了",
  emptyText: "还没有浏览记录",
  records: [
    {
      id: "service-clean-1",
      type: "service",
      title: "日常清洁 2小时1人急速清洁全程质保",
      image: homeCareImage,
      price: "¥300",
    },
    {
      id: "activity-photo-1",
      type: "activity",
      title: "桂花小区老年摄影大赛火热报名中",
      image: cherryBlossomActivityImage,
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      fee: "20元",
    },
    {
      id: "service-clean-2",
      type: "service",
      title: "日常清洁 2小时1人急速清洁全程质保",
      image: homeCareImage,
      price: "¥300",
    },
    {
      id: "activity-photo-2",
      type: "activity",
      title: "桂花小区老年摄影大赛火热报名中",
      image: cherryBlossomActivityImage,
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      fee: "20元",
    },
  ] as FootprintRecord[],
};

export default mock;

