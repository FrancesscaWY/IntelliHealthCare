import homeServiceImage from "@/assets/service/home-care/homeservice.png";
import homeCareImage from "@/assets/service/home-care/home.png";
import cookImage from "@/assets/service/home-care/img_1.png";
import cleanImage from "@/assets/service/home-care/img_3.png";
import elderImage from "@/assets/service/home-care/img_5.png";
import applianceImage from "@/assets/service/home-care/img_7.png";

const mock = {
  title: "项目推荐",
  projects: [
    {
      id: "clean-2h",
      name: "上门清洁 2小时1人",
      desc: "适合日常居家保洁，覆盖客厅、卧室、厨房等基础区域。",
      image: homeCareImage,
    },
    {
      id: "range-hood-clean",
      name: "油烟机深度清洗",
      desc: "拆洗油烟机滤网和重油污区域，适合厨房油污较重的家庭。",
      image: applianceImage,
    },
    {
      id: "elder-care",
      name: "生活照料 陪护服务",
      desc: "协助老人完成日常照护、起居陪伴和基础健康观察。",
      image: elderImage,
    },
    {
      id: "home-cooking",
      name: "上门做饭 家庭营养餐",
      desc: "根据家庭口味准备家常餐，适合老人、儿童和工作日家庭。",
      image: cookImage,
    },
    {
      id: "deep-clean",
      name: "全屋大扫除",
      desc: "适合节前整理、搬家后清洁和长期未打扫房间的集中处理。",
      image: cleanImage,
    },
    {
      id: "window-clean",
      name: "玻璃清洁 阳台窗户专项清洗",
      desc: "清洁窗户、窗槽和阳台积尘，让家里采光更清爽。",
      image: homeServiceImage,
    },
  ],
};

export default mock;
