import medicalExamIllustration from "@/assets/onboarding/体检.png";
import housekeepingIllustration from "@/assets/onboarding/家政.png";
import healthDataIllustration from "@/assets/onboarding/健康数据.png";
import homeVisitIllustration from "@/assets/onboarding/上门.png";

const mock = {
  slides: [
    {
      key: "archive",
      title: "健康档案",
      descLines: ["多维度健康信息，实时记录老人健康状况"],
      image: medicalExamIllustration,
      imageAlt: "健康档案插画",
    },
    {
      key: "housekeeping",
      title: "家政护理",
      descLines: ["贴心上门服务，多种护理服务可供选择"],
      image: housekeepingIllustration,
      imageAlt: "家政护理插画",
    },
    {
      key: "data",
      title: "健康数据",
      descLines: ["设备互联，实现健康数据实时检测"],
      image: healthDataIllustration,
      imageAlt: "健康数据插画",
    },
    {
      key: "home-exam",
      title: "上门体检",
      descLines: ["多种体检项目，在线看体检报告，", "提供报告解读"],
      image: homeVisitIllustration,
      imageAlt: "上门体检插画",
    },
  ],
};

export default mock;
