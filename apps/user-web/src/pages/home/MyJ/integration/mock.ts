export type IntegrationTabKey = "income" | "expense";

export interface IntegrationRecord {
  id: string;
  type: IntegrationTabKey;
  title: string;
  time: string;
  amount: string;
}

const mock = {
  title: "我的积分",
  currentPoints: 3090,
  detailTitle: "积分明细",
  tabs: [
    { key: "income", label: "收入" },
    { key: "expense", label: "支出" },
  ] as Array<{ key: IntegrationTabKey; label: string }>,
  records: [
    { id: "income-1", type: "income", title: "订单完成积分", time: "2023-02-30 10:08:09", amount: "+100" },
    { id: "income-2", type: "income", title: "订单完成积分", time: "2023-02-28 10:08:09", amount: "+100" },
    { id: "income-3", type: "income", title: "订单完成积分", time: "2023-02-26 10:08:09", amount: "+100" },
    { id: "income-4", type: "income", title: "订单完成积分", time: "2023-02-24 10:08:09", amount: "+100" },
    { id: "income-5", type: "income", title: "订单完成积分", time: "2023-02-22 10:08:09", amount: "+100" },
    { id: "income-6", type: "income", title: "订单完成积分", time: "2023-02-20 10:08:09", amount: "+100" },
    { id: "expense-1", type: "expense", title: "积分兑换优惠券", time: "2023-02-18 09:18:09", amount: "-80" },
    { id: "expense-2", type: "expense", title: "积分兑换体检折扣", time: "2023-02-16 13:28:09", amount: "-120" },
    { id: "expense-3", type: "expense", title: "积分兑换上门护理券", time: "2023-02-14 08:38:09", amount: "-200" },
  ] as IntegrationRecord[],
};

export default mock;
