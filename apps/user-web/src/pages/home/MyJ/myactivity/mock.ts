import { seniorActivitiesByTab, type SeniorActivityItem } from "@/pages/community/senior-activities/activities";

export type MyActivityTabKey = "ongoing" | "upcoming" | "ended";

export interface MyActivityCard {
  id: string;
  sourceActivityId: string;
  title: string;
  type: string;
  typeKey: SeniorActivityItem["typeKey"];
  status: string;
  statusKey: MyActivityTabKey;
  time: string;
  location: string;
  price: string;
  image: string;
}

function buildCard(item: SeniorActivityItem, overrides?: Partial<MyActivityCard>): MyActivityCard {
  return {
    id: overrides?.id || item.id,
    sourceActivityId: overrides?.sourceActivityId || item.id,
    title: overrides?.title || item.title,
    type: overrides?.type || item.type,
    typeKey: overrides?.typeKey || item.typeKey,
    status: overrides?.status || item.status,
    statusKey: overrides?.statusKey || (item.statusKey as "ongoing" | "upcoming"),
    time: overrides?.time || item.time,
    location: overrides?.location || item.location,
    price: overrides?.price || item.price,
    image: overrides?.image || item.image,
  };
}

const hotActivities = seniorActivitiesByTab.hot;
const latestActivities = seniorActivitiesByTab.latest;

const mock = {
  title: "我参加的活动",
  endText: "没有更多了",
  emptyText: "暂无活动记录",
  tabs: [
    { key: "ongoing", label: "进行中" },
    { key: "upcoming", label: "未开始" },
    { key: "ended", label: "已结束" },
  ] as Array<{ key: MyActivityTabKey; label: string }>,
  activities: {
    ongoing: [
      buildCard(hotActivities[0]),
      buildCard(latestActivities[0]),
    ],
    upcoming: [
      buildCard(hotActivities[1]),
      buildCard(hotActivities[2]),
    ],
    ended: [
      buildCard(latestActivities[1], {
        id: "ended-coast-walk",
        status: "已结束",
        statusKey: "ended",
        time: "2024.03.12~2024.03.28",
      }),
      buildCard(latestActivities[2], {
        id: "ended-morning-walk",
        status: "已结束",
        statusKey: "ended",
        time: "2024.03.08~2024.03.22",
      }),
    ],
  } as Record<MyActivityTabKey, MyActivityCard[]>,
};

export default mock;
