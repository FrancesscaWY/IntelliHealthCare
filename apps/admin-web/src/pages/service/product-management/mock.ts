const houseImage = "/api/v1/assets/demo/services/service-home-care.png";
const examImage = "/api/v1/assets/demo/services/service-home-visit.png";
const rehabImage = "/api/v1/assets/demo/services/service-rehab.png";

const commonMeta = {
  updater: "李明明",
  updatedAt: "2024-10-09 10:09:09",
} as const;

const mock = {
  title: "商品管理",
  lineOptions: [
    { key: "housekeeping", label: "家政护理" },
    { key: "exam", label: "上门体检" },
    { key: "rehab", label: "康复理疗" },
  ],
  statusOptions: ["全部状态", "已上架", "已下架", "草稿"],
  lineConfigs: {
    housekeeping: {
      categoryLabel: "分类",
      categoryOptions: ["请选择", "生活照料", "清洁服务", "营养照护"],
      rows: Array.from({ length: 5 }, (_, index) => ({
        id: `house-${index + 1}`,
        title: "日常清洁 2小时1人急速清洁全程质保",
        code: "323009000",
        category: "生活照料",
        price: "300.00",
        status: "已上架",
        image: houseImage,
        ...commonMeta,
      })),
    },
    exam: {
      categoryLabel: "分类",
      categoryOptions: ["请选择", "日常检查", "专项筛查", "深度体检"],
      rows: Array.from({ length: 5 }, (_, index) => ({
        id: `exam-${index + 1}`,
        title: "常规血脂检测",
        code: "323009000",
        category: "日常检查",
        price: "300.00",
        status: "已上架",
        image: examImage,
        ...commonMeta,
      })),
    },
    rehab: {
      categoryLabel: "标签",
      categoryOptions: [],
      rows: Array.from({ length: 5 }, (_, index) => ({
        id: `rehab-${index + 1}`,
        title: "脑中风术后康复理疗套餐",
        code: "323009000",
        tags: ["脑血管疾病", "运动疗法"],
        price: "1990.00",
        status: "已上架",
        image: rehabImage,
        ...commonMeta,
      })),
    },
  },
} as const;

export default mock;
