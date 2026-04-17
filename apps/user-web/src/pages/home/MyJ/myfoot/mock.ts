import cherryBlossomActivityImage from "@/assets/community/activities/cherry-blossom-activity.jpg";
import homeCareDetailImage from "@/assets/service/home-care/homeservice.png";

export interface BaseFootprintRecord {
  id: string;
  image: string;
  title: string;
  viewedAt: string;
  timelineTime: string;
}

export interface ServiceFootprint extends BaseFootprintRecord {
  type: "service";
  price: string;
  pageId: "service/home-care-detail";
}

export interface ActivityFootprint extends BaseFootprintRecord {
  type: "activity";
  time: string;
  location: string;
  fee: string;
  pageId: "community/senior-activity-detail";
  activityId: string;
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
      image: homeCareDetailImage,
      price: "¥300",
      viewedAt: "2024-05-02T11:30:00",
      timelineTime: "11:30",
      pageId: "service/home-care-detail",
    },
    {
      id: "activity-photo-1",
      type: "activity",
      title: "桂花小区老年摄影大赛火热报名中",
      image: cherryBlossomActivityImage,
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      fee: "20元",
      viewedAt: "2024-05-01T10:20:00",
      timelineTime: "10:20",
      pageId: "community/senior-activity-detail",
      activityId: "activity-photography",
    },
    {
      id: "service-clean-2",
      type: "service",
      title: "日常清洁 2小时1人急速清洁全程质保",
      image: homeCareDetailImage,
      price: "¥300",
      viewedAt: "2024-04-30T09:40:00",
      timelineTime: "09:40",
      pageId: "service/home-care-detail",
    },
    {
      id: "activity-photo-2",
      type: "activity",
      title: "桂花小区老年摄影大赛火热报名中",
      image: cherryBlossomActivityImage,
      time: "2024.04.16~2024.05.02",
      location: "第一海水浴场",
      fee: "20元",
      viewedAt: "2024-04-28T08:50:00",
      timelineTime: "08:50",
      pageId: "community/senior-activity-detail",
      activityId: "activity-photography",
    },
  ] as FootprintRecord[],
};

export default mock;
