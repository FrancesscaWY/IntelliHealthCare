const mock = {
  title: "新增商品信息",
  code: "323009000",
  categoryOptions: ["请选择", "上门体检", "康复理疗", "家政护理", "慢病随访"],
  validityOptions: ["请选择", "7天", "15天", "30天", "90天"],
  parameterOptions: ["检测项目", "适用年龄", "服务说明", "禁忌提示"],
  parameterRows: [
    { id: "param-1", name: "检测项目", value: "", suffix: "", placeholder: "请输入" },
    { id: "param-2", name: "适用年龄", value: "", suffix: "岁", placeholder: "请输入" },
  ],
  sellInfo: {
    price: "",
    strikePrice: "",
    sales: "0",
    commission: "",
    duration: "",
    staffCount: "",
    publishMode: "immediate",
    validity: "请选择",
    bookingRules: "",
  },
} as const;

export default mock;
