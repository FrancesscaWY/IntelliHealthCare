const mock = {
  phone: "19256784886",
  genderOptions: ["男", "女"],
  birthdayDefault: "2017-04-04",
  birthdayMin: "1900-01-01",
  birthdayMax: "2026-04-13",
  fields: [
    { key: "realName", label: "真实姓名", required: true, placeholder: "请填写您的真实姓名", type: "input" },
    { key: "idCard", label: "身份证号", required: true, placeholder: "请填写您的身份证号", type: "input" },
    { key: "gender", label: "性别", required: true, placeholder: "请选择您的性别", type: "picker" },
    { key: "birthday", label: "出生日期", required: true, placeholder: "请选择您的出生日期", type: "picker" },
    { key: "phone", label: "联系电话", required: true, placeholder: "", type: "readonly" },
    { key: "address", label: "家庭住址", required: false, placeholder: "请填写目前的家庭住址", type: "input" },
  ],
};

export default mock;
