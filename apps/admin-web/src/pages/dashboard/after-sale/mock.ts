const cleaningImage =
  "https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=320";
const rehabImage =
  "https://images.pexels.com/photos/5793996/pexels-photo-5793996.jpeg?auto=compress&cs=tinysrgb&w=320";

export interface AfterSaleRow {
  orderNo: string;
  afterSaleNo: string;
  title: string;
  image: string;
  paidAmount: string;
  refundAmount: string;
  status: string;
  appliedAt: string;
}

const rows: AfterSaleRow[] = [
  {
    orderNo: "2400126675",
    afterSaleNo: "AS202604220031",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    paidAmount: "300.00",
    refundAmount: "80.00",
    status: "处理中",
    appliedAt: "2026-04-22 09:18:36",
  },
  {
    orderNo: "2400126673",
    afterSaleNo: "AS202604210118",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    paidAmount: "300.00",
    refundAmount: "120.00",
    status: "售后完成",
    appliedAt: "2026-04-21 16:08:12",
  },
  {
    orderNo: "2400126676",
    afterSaleNo: "AS202604200276",
    title: "康复训练 上门评估与基础理疗服务",
    image: rehabImage,
    paidAmount: "599.00",
    refundAmount: "100.00",
    status: "售后关闭",
    appliedAt: "2026-04-20 14:33:09",
  },
  {
    orderNo: "2400126672",
    afterSaleNo: "AS202604220052",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    paidAmount: "300.00",
    refundAmount: "60.00",
    status: "处理中",
    appliedAt: "2026-04-22 10:46:28",
  },
  {
    orderNo: "2400126671",
    afterSaleNo: "AS202604180443",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    paidAmount: "300.00",
    refundAmount: "300.00",
    status: "售后完成",
    appliedAt: "2026-04-18 12:08:41",
  },
  {
    orderNo: "2400126673",
    afterSaleNo: "AS202604170512",
    title: "日常清洁 2小时 1人上门深度保洁",
    image: cleaningImage,
    paidAmount: "300.00",
    refundAmount: "50.00",
    status: "售后关闭",
    appliedAt: "2026-04-17 09:26:55",
  },
];

const mock = {
  title: "售后管理",
  statusTabs: ["全部", "处理中", "售后完成", "售后关闭"],
  rows,
};

export function getAfterSaleRowByNo(afterSaleNo: string) {
  return rows.find((item) => item.afterSaleNo === afterSaleNo);
}

export function upsertAfterSaleRow(row: AfterSaleRow) {
  const existingIndex = rows.findIndex((item) => item.afterSaleNo === row.afterSaleNo);

  if (existingIndex === -1) {
    rows.unshift(row);
    return row;
  }

  rows.splice(existingIndex, 1, row);
  return row;
}

export default mock;
