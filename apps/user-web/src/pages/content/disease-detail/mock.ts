const mock = {
  navTitle: "疾病详情",
  diseaseName: "2型糖尿病",
  summary: "2型糖尿病常与胰岛素抵抗、体重增加和生活方式有关，需要长期管理。",
  tags: ["内分泌科", "慢病管理", "长期随访"],
  quickFacts: [
    { label: "常见症状", value: "口渴、多尿" },
    { label: "建议科室", value: "内分泌科" },
    { label: "治疗重点", value: "饮食+运动+药物" }
  ],
  sections: [
    {
      title: "症状",
      content: "常见表现包括口渴、多尿、疲倦和视物模糊。"
    },
    {
      title: "病因",
      content: "常与胰岛素抵抗、遗传因素、久坐和饮食结构不合理有关。"
    },
    {
      title: "预防",
      content: "建议控制体重、减少高糖饮食并规律监测血糖。"
    },
    {
      title: "治疗",
      content: "通常需要饮食运动干预，并结合口服降糖药和定期复查。"
    }
  ]
};

export default mock;
