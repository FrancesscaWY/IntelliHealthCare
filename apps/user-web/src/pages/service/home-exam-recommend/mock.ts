import examImage from "@/assets/service/home-care/img_11.png";
import examImage1 from "@/assets/service/home-care/img_12.png";
import examImage2 from "@/assets/service/home-care/img_13.png";
import examImage3 from "@/assets/service/home-care/img_14.png";
import examImage4 from "@/assets/service/home-care/img_15.png";
import examImage5 from "@/assets/service/home-care/img_16.png";

const mock = {
  title: "项目推荐",
  projects: [
    {
      id: "senior-basic",
      name: "老年人基础健康体检套餐",
      desc: "覆盖血压、血糖、血脂等基础指标，适合定期居家健康筛查。",
      image: examImage,
    },
    {
      id: "hypertension-screening",
      name: "高血压风险筛查套餐",
      desc: "关注血压波动、心电和基础代谢情况，适合高血压人群复查。",
      image: examImage1,
    },
    {
      id: "diabetes-check",
      name: "糖尿病居家检测套餐",
      desc: "包含血糖、糖化血红蛋白等重点指标，便于长期健康管理。",
      image: examImage2,
    },
    {
      id: "cardio-check",
      name: "心血管专项体检套餐",
      desc: "围绕心电、血脂和心血管风险进行筛查，适合中老年人群。",
      image: examImage3,
    },
    {
      id: "bone-density",
      name: "骨密度与关节健康检测",
      desc: "评估骨量和关节健康状态，适合骨质疏松风险人群。",
      image: examImage4,
    },
    {
      id: "tumor-marker",
      name: "肿瘤标志物初筛套餐",
      desc: "进行基础肿瘤标志物筛查，适合作为年度体检补充项目。",
      image: examImage5,
    },
  ],
};

export default mock;
