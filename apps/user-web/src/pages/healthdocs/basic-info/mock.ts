export type BasicInfoOption = {
  label: string;
  value: string;
};

export type BasicInfoField = {
  key: string;
  label: string;
  type: "text" | "tel" | "date" | "number" | "select" | "avatar";
  required?: boolean;
  placeholder?: string;
  suffix?: string;
  options?: BasicInfoOption[];
};

const mock = {
  title: "基础信息",
  groups: [
    [
      { key: "avatar", label: "头像", type: "avatar", placeholder: "请上传头像" },
      { key: "name", label: "真实姓名", type: "text", required: true, placeholder: "请输入真实姓名" },
      { key: "idCard", label: "身份证号", type: "text", required: true, placeholder: "请输入身份证号" },
      {
        key: "gender",
        label: "性别",
        type: "select",
        required: true,
        placeholder: "请选择性别",
        options: [
          { label: "男", value: "男" },
          { label: "女", value: "女" },
        ],
      },
      { key: "birthday", label: "出生日期", type: "date", required: true, placeholder: "请选择出生日期" },
      { key: "phone", label: "联系电话", type: "tel", required: true, placeholder: "请输入联系电话" },
      { key: "address", label: "家庭住址", type: "text", placeholder: "请输入家庭住址" },
    ],
    [
      { key: "height", label: "身高", type: "number", placeholder: "请输入身高", suffix: "cm" },
      { key: "weight", label: "体重", type: "number", placeholder: "请输入体重", suffix: "kg" },
      { key: "nativePlace", label: "籍贯", type: "text", placeholder: "请输入籍贯" },
      {
        key: "ethnicity",
        label: "民族",
        type: "select",
        placeholder: "请选择您的民族",
        options: [
          { label: "汉族", value: "汉族" },
          { label: "回族", value: "回族" },
          { label: "满族", value: "满族" },
          { label: "苗族", value: "苗族" },
        ],
      },
      {
        key: "education",
        label: "文化程度",
        type: "select",
        placeholder: "请选择您的文化程度",
        options: [
          { label: "小学", value: "小学" },
          { label: "初中", value: "初中" },
          { label: "高中", value: "高中" },
          { label: "大专", value: "大专" },
          { label: "本科", value: "本科" },
          { label: "研究生", value: "研究生" },
        ],
      },
      {
        key: "maritalStatus",
        label: "婚姻状况",
        type: "select",
        placeholder: "请选择您的婚姻状况",
        options: [
          { label: "未婚", value: "未婚" },
          { label: "已婚", value: "已婚" },
          { label: "离异", value: "离异" },
          { label: "丧偶", value: "丧偶" },
        ],
      },
      { key: "occupation", label: "职业", type: "text", placeholder: "请输入您的职业" },
      { key: "emergencyName", label: "紧急联系人姓名", type: "text", placeholder: "输入姓名" },
      { key: "emergencyPhone", label: "紧急联系人电话", type: "tel", placeholder: "输入电话" },
    ],
  ] as BasicInfoField[][],
};

export default mock;
