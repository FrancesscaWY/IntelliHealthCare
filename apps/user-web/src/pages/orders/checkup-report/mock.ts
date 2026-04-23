const mock = {
  title: "查看报告",
  hospital: "体检中心",
  reportName: "老年人全面健康体检报告",
  patient: [
    { label: "姓名", value: "JOY" },
    { label: "性别", value: "女" },
    { label: "年龄", value: "65" },
    { label: "体检编号", value: "EX202604240839" },
    { label: "体检日期", value: "2026-04-24" },
    { label: "报告日期", value: "2026-04-24" },
  ],
  metrics: [
    { item: "血压", result: "128/82", unit: "mmHg", reference: "90-140/60-90", status: "正常" },
    { item: "空腹血糖", result: "5.8", unit: "mmol/L", reference: "3.9-6.1", status: "正常" },
    { item: "总胆固醇", result: "5.4", unit: "mmol/L", reference: "<5.20", status: "偏高" },
    { item: "低密度脂蛋白", result: "3.6", unit: "mmol/L", reference: "<3.40", status: "偏高" },
    { item: "血氧饱和度", result: "97", unit: "%", reference: "95-100", status: "正常" },
  ],
  conclusion: "本次体检整体情况稳定，血压、血糖、血氧处于参考范围内。血脂相关指标略高，建议继续控制油脂摄入，增加规律运动，并按医嘱复查。",
  doctor: "王晓倩",
  reviewer: "王伟",
};

export default mock;
