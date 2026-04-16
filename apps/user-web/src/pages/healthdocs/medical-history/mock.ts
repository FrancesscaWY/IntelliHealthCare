export type HealthInfoOption = {
  label: string;
  value: string;
};

export type HealthInfoField = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "record";
  placeholder?: string;
  suffix?: string;
  options?: HealthInfoOption[];
};

export type HealthInfoGroup = {
  title: string;
  hint?: string;
  fields: HealthInfoField[];
};

const mock = {
  title: "健康信息",
  groups: [
    {
      title: "身体数据",
      hint: "完善基础健康指标",
      fields: [
        { key: "height", label: "身高", type: "number", placeholder: "请输入身高", suffix: "cm" },
        { key: "weight", label: "体重", type: "number", placeholder: "请输入体重", suffix: "kg" },
        {
          key: "bloodType",
          label: "血型",
          type: "select",
          placeholder: "请选择血型",
          options: [
            { label: "A 型", value: "A" },
            { label: "B 型", value: "B" },
            { label: "AB 型", value: "AB" },
            { label: "O 型", value: "O" },
            { label: "不详", value: "unknown" },
          ],
        },
        {
          key: "rhType",
          label: "RH阴性",
          type: "select",
          placeholder: "请选择 RH 信息",
          options: [
            { label: "否", value: "no" },
            { label: "是", value: "yes" },
            { label: "不详", value: "unknown" },
          ],
        },
        {
          key: "chronicDisease",
          label: "慢性病",
          type: "select",
          placeholder: "请选择慢性病情况",
          options: [
            { label: "无", value: "none" },
            { label: "高血压", value: "hypertension" },
            { label: "糖尿病", value: "diabetes" },
            { label: "高血脂", value: "hyperlipidemia" },
            { label: "其他", value: "other" },
          ],
        },
      ],
    },
    {
      title: "生活习惯",
      hint: "记录日常生活方式",
      fields: [
        {
          key: "sleepQuality",
          label: "睡眠质量",
          type: "select",
          placeholder: "请选择睡眠质量",
          options: [
            { label: "良好", value: "good" },
            { label: "一般", value: "normal" },
            { label: "较差", value: "poor" },
          ],
        },
        {
          key: "smokingFrequency",
          label: "吸烟频率",
          type: "select",
          placeholder: "请选择吸烟频率",
          options: [
            { label: "从不", value: "never" },
            { label: "偶尔", value: "occasionally" },
            { label: "经常", value: "often" },
            { label: "已戒烟", value: "quit" },
          ],
        },
        {
          key: "drinkingFrequency",
          label: "饮酒频率",
          type: "select",
          placeholder: "请选择饮酒频率",
          options: [
            { label: "从不", value: "never" },
            { label: "偶尔", value: "occasionally" },
            { label: "每周", value: "weekly" },
            { label: "频繁", value: "frequently" },
          ],
        },
        {
          key: "exerciseFrequency",
          label: "运动频率",
          type: "select",
          placeholder: "请选择运动频率",
          options: [
            { label: "很少", value: "rarely" },
            { label: "每周 1-2 次", value: "weekly_1_2" },
            { label: "每周 3-5 次", value: "weekly_3_5" },
            { label: "几乎每天", value: "daily" },
          ],
        },
        {
          key: "dietPreference",
          label: "饮食偏好",
          type: "select",
          placeholder: "请选择饮食偏好",
          options: [
            { label: "清淡均衡", value: "light" },
            { label: "高蛋白", value: "protein" },
            { label: "偏甜", value: "sweet" },
            { label: "偏咸", value: "salty" },
            { label: "辛辣", value: "spicy" },
          ],
        },
      ],
    },
    {
      title: "健康史",
      hint: "补充重要健康记录",
      fields: [
        { key: "medicalHistory", label: "既往病史", type: "record", placeholder: "请输入既往病史记录" },
        { key: "familyHistory", label: "家族遗传史", type: "record", placeholder: "请输入家族遗传史记录" },
        { key: "allergyHistory", label: "过敏史", type: "record", placeholder: "请输入过敏史记录" },
        { key: "visitHistory", label: "就诊史", type: "record", placeholder: "请输入就诊史记录" },
      ],
    },
  ] as HealthInfoGroup[],
};

export default mock;
