const mock = {
  title: "新增消息",
  receiverOptions: ["全部用户", "部分用户"] as const,
  sendTimeOptions: ["立即发送", "定时发布"] as const,
  channelOptions: ["系统消息", "短信", "会话消息"] as const,
  selectedUsers: ["高血压重点关怀用户", "4 月新注册用户", "近 30 天未复购用户"],
  selectedProducts: ["春季康复理疗套餐", "居家护理上门服务"],
};

export default mock;
