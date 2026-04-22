export type ServiceRecordStatusTone = "pending" | "active" | "cancelled" | "completed";

export type ServiceRecordActionKey = "cancel" | "edit" | "voucher" | "again" | "rehab-report";

export interface ServiceRecordItem {
  id: string;
  title: string;
  status: string;
  statusTone: ServiceRecordStatusTone;
  address: string;
  bookingTime: string;
  applyTime: string;
  staff?: string;
  reviewTime?: string;
  completedTime?: string;
  actions: Array<{
    key: ServiceRecordActionKey;
    label: string;
    type: "ghost" | "primary";
  }>;
}

const mock = {
  title: "服务记录",
  records: [
    {
      id: "record-pending",
      title: "肌力增强训练",
      status: "待审核",
      statusTone: "pending",
      address: "徐汇区黎梅花园88栋3单元101",
      bookingTime: "2024-03-24 10:34:34",
      applyTime: "2024-03-23 10:34:34",
      actions: [
        { key: "cancel", label: "取消预约", type: "ghost" },
        { key: "edit", label: "修改预约信息", type: "ghost" },
      ],
    },
    {
      id: "record-approved",
      title: "肌力增强训练",
      status: "审核通过，待服务",
      statusTone: "active",
      address: "徐汇区黎梅花园88栋3单元101",
      bookingTime: "2024-03-23 10:34:34",
      applyTime: "2024-03-23 10:34:34",
      staff: "王小倩；王伟",
      reviewTime: "2024-03-23 10:34:34",
      actions: [
        { key: "cancel", label: "取消预约", type: "ghost" },
        { key: "voucher", label: "服务券码", type: "primary" },
      ],
    },
    {
      id: "record-cancelled",
      title: "肌力增强训练",
      status: "已取消",
      statusTone: "cancelled",
      address: "徐汇区黎梅花园88栋3单元101",
      bookingTime: "2024-03-24 10:34:34",
      applyTime: "2024-03-23 10:34:34",
      actions: [{ key: "again", label: "再次预约", type: "primary" }],
    },
    {
      id: "record-completed",
      title: "肌力增强训练",
      status: "已完成",
      statusTone: "completed",
      address: "徐汇区黎梅花园88栋3单元101",
      bookingTime: "2024-03-23 10:34:34",
      applyTime: "2024-03-23 10:34:34",
      staff: "王小倩；王伟",
      reviewTime: "2024-03-23 10:34:34",
      completedTime: "2024-03-23 10:34:34",
      actions: [{ key: "rehab-report", label: "康复报告", type: "primary" }],
    },
  ] as ServiceRecordItem[],
};

export default mock;
