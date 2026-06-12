import rehabImage from "@/assets/service/home-care/img.png";
import rehabImage1 from "@/assets/service/home-care/img_1.png";
import rehabImage2 from "@/assets/service/home-care/img_8.png";
import rehabImage3 from "@/assets/service/home-care/img_9.png";
import rehabImage4 from "@/assets/service/home-care/img_10.png";

const mock = {
  title: "项目推荐",
  projects: [
    {
      id: "stroke-rehab",
      name: "脑中风术后康复训练",
      desc: "针对肢体活动受限、平衡能力下降等情况，提供阶段化康复训练。",
      image: rehabImage2,
    },
    {
      id: "neck-relax",
      name: "肩颈疼痛理疗放松",
      desc: "适合久坐、肩颈僵硬和轻度酸痛人群，帮助缓解紧张状态。",
      image: rehabImage3,
    },
    {
      id: "knee-rehab",
      name: "膝关节术后活动度恢复",
      desc: "围绕关节活动度、肌力恢复和日常行走能力进行训练。",
      image: rehabImage4,
    },
    {
      id: "waist-care",
      name: "腰椎劳损居家理疗",
      desc: "适合腰背反复酸胀、久坐不适人群，提供居家放松和护理建议。",
      image: rehabImage,
    },
    {
      id: "gait-training",
      name: "老人平衡步态训练",
      desc: "提升下肢稳定性和平衡能力，降低日常活动中的跌倒风险。",
      image: rehabImage1,
    },
  ],
};

export default mock;
