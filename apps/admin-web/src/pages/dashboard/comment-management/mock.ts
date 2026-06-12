export interface CommentManagementRow {
  id: string;
  orderId?: string;
  orderNo: string;
  productCode: string;
  title: string;
  image: string;
  serviceType: string;
  rating: number;
  buyerName: string;
  buyerPhone: string;
  buyerAvatar: string;
  reviewedAt: string;
  isVisible: boolean;
  isPinned: boolean;
  reviewText: string;
  replyText: string;
  gallery: string[];
}

const cleaningImage = "/api/v1/assets/demo/services/service-cleaning.jpg";
const rehabImage = "/api/v1/assets/demo/services/service-rehab.png";
const medicalImage = "/api/v1/assets/demo/services/service-home-visit.png";

const avatarA = "/api/v1/assets/demo/avatars/avatar-1.jpg";
const avatarB = "/api/v1/assets/demo/staff/staff-1.png";
const avatarC = "/api/v1/assets/demo/staff/staff-2.png";
const avatarD = "/api/v1/assets/demo/avatars/avatar-4.jpg";

const mock = {
  title: "评价管理",
  serviceTypes: ["全部类型", "家政护工", "康复理疗", "上门体检"],
  ratingOptions: ["全部评分", "5星", "4星", "3星", "2星及以下"],
  pinOptions: ["全部", "已置顶", "未置顶"],
  rows: [
    {
      id: "comment-2400126673",
      orderNo: "2400126673",
      productCode: "QJ-FW-2201",
      title: "日常清洁 2小时 1人上门深度保洁",
      image: cleaningImage,
      serviceType: "家政护工",
      rating: 5,
      buyerName: "笑看人生",
      buyerPhone: "19288664488",
      buyerAvatar: avatarA,
      reviewedAt: "2026-04-20 16:28:32",
      isVisible: true,
      isPinned: true,
      reviewText:
        "阿姨准时到达，厨房油污和阳台角落处理得很干净，服务过程细致，整体体验很满意。",
      replyText: "感谢您的认可，已将您的偏好同步给服务团队，后续安排会继续保持同样标准。",
      gallery: [cleaningImage],
    },
    {
      id: "comment-2400126675",
      orderNo: "2400126675",
      productCode: "QJ-FW-2203",
      title: "日常清洁 2小时 1人上门深度保洁",
      image: cleaningImage,
      serviceType: "家政护工",
      rating: 3,
      buyerName: "赵女士",
      buyerPhone: "13855214420",
      buyerAvatar: avatarB,
      reviewedAt: "2026-04-21 14:05:18",
      isVisible: false,
      isPinned: false,
      reviewText:
        "卧室和客厅整理得不错，但厨房台面边角清洁不到位，已经联系客服继续跟进处理。",
      replyText: "已安排售后专员回访，问题处理完成后会第一时间同步结果。",
      gallery: [cleaningImage, medicalImage],
    },
    {
      id: "comment-2400126676",
      orderNo: "2400126676",
      productCode: "KF-XL-1107",
      title: "康复训练 上门评估与基础理疗服务",
      image: rehabImage,
      serviceType: "康复理疗",
      rating: 5,
      buyerName: "王小倩",
      buyerPhone: "13688664488",
      buyerAvatar: avatarC,
      reviewedAt: "2026-04-22 10:16:42",
      isVisible: true,
      isPinned: true,
      reviewText:
        "康复师沟通很耐心，会先说明动作要点再开始训练，家属也能听懂后续在家如何配合。",
      replyText: "感谢反馈，我们已记录您的训练节奏偏好，后续复访会优先安排熟悉情况的康复师。",
      gallery: [rehabImage],
    },
    {
      id: "comment-2400126672",
      orderNo: "2400126672",
      productCode: "QJ-FW-2202",
      title: "日常清洁 2小时 1人上门深度保洁",
      image: cleaningImage,
      serviceType: "家政护工",
      rating: 4,
      buyerName: "陈思敏",
      buyerPhone: "13733448829",
      buyerAvatar: avatarD,
      reviewedAt: "2026-04-19 18:40:25",
      isVisible: true,
      isPinned: false,
      reviewText:
        "整体效率不错，客厅和卫生间清洁比较到位，希望下次能提前十分钟电话确认上门时间。",
      replyText: "已备注您的联系偏好，后续服务会在上门前主动电话确认。",
      gallery: [],
    },
    {
      id: "comment-2400126671",
      orderNo: "2400126671",
      productCode: "KF-PG-3301",
      title: "上门康复评估与日常训练指导",
      image: rehabImage,
      serviceType: "康复理疗",
      rating: 2,
      buyerName: "林先生",
      buyerPhone: "13900231458",
      buyerAvatar: avatarB,
      reviewedAt: "2026-04-18 09:22:41",
      isVisible: false,
      isPinned: false,
      reviewText:
        "评估说明比较简略，对训练动作的注意点解释不够细，希望后续服务内容可以更明确一些。",
      replyText: "",
      gallery: [rehabImage],
    },
    {
      id: "comment-2400126674",
      orderNo: "2400126674",
      productCode: "TJ-JK-5102",
      title: "上门基础健康检测与报告解读",
      image: medicalImage,
      serviceType: "上门体检",
      rating: 4,
      buyerName: "周晓兰",
      buyerPhone: "13599881234",
      buyerAvatar: avatarA,
      reviewedAt: "2026-04-17 11:08:54",
      isVisible: true,
      isPinned: false,
      reviewText:
        "检测流程比较顺畅，报告解读也清楚，如果能再补充一些后续饮食建议会更好。",
      replyText: "感谢建议，后续体检服务会同步附上基础健康管理提醒。",
      gallery: [medicalImage],
    },
  ] satisfies CommentManagementRow[],
};

export default mock;
