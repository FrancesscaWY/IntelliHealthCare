export interface SelectOption {
  label: string;
  value: string;
}

const mock = {
  title: "新增用户信息",
  basicSectionTitle: "基础信息",
  otherSectionTitle: "其它信息",
  genderOptions: [
    { label: "男", value: "男" },
    { label: "女", value: "女" },
  ] as SelectOption[],
  ethnicityOptions: [
    { label: "汉族", value: "汉族" },
    { label: "满族", value: "满族" },
    { label: "回族", value: "回族" },
    { label: "苗族", value: "苗族" },
    { label: "壮族", value: "壮族" },
  ] as SelectOption[],
  educationOptions: [
    { label: "小学及以下", value: "小学及以下" },
    { label: "初中", value: "初中" },
    { label: "高中 / 中专", value: "高中 / 中专" },
    { label: "大专", value: "大专" },
    { label: "本科及以上", value: "本科及以上" },
  ] as SelectOption[],
  maritalOptions: [
    { label: "未婚", value: "未婚" },
    { label: "已婚", value: "已婚" },
    { label: "离异", value: "离异" },
    { label: "丧偶", value: "丧偶" },
  ] as SelectOption[],
};

export default mock;
