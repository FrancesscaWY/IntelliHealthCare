const mock = {
  title: "添加用药信息",
  fields: [
    { key: "name", label: "药品名称", placeholder: "请填写", type: "input" },
    { key: "time", label: "用药时间", placeholder: "请选择", type: "time" },
    { key: "frequency", label: "用药频率", placeholder: "请选择", type: "picker" },
    { key: "unit", label: "单位", placeholder: "请选择", type: "picker" },
    { key: "dose", label: "计量", placeholder: "请填写", type: "input" },
  ],
};

export default mock;
