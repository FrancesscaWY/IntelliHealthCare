import type { HomeCareOrderStatus } from "./store";

export type HomeCareOrderTab = {
  key: "all" | HomeCareOrderStatus;
  label: string;
};

const mock = {
  servicePhone: "400-860-2218",
  tabs: [
    { key: "all", label: "全部" },
    { key: "pending_payment", label: "待付款" },
    { key: "awaiting_accept", label: "待接单" },
    { key: "awaiting_service", label: "待服务" },
    { key: "completed", label: "待评价" },
  ] as HomeCareOrderTab[],
};

export default mock;
