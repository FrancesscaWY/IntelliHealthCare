const avatar =
  "https://images.pexels.com/photos/6129501/pexels-photo-6129501.jpeg?auto=compress&cs=tinysrgb&w=240";

const rows = Array.from({ length: 8 }, (_, index) => ({
  id: `report-${index + 1}`,
  uploadedAt: "2024-03-24 10:23",
  userName: "笑看人生",
  avatar,
  reportName: "常规血脂检查",
  reportType: "体检报告",
  source: "后台上传",
  uploader: "李明明",
  ticketNo: "GD20241009013",
  reportDate: "2024-03-24",
}));

const mock = {
  title: "报告管理",
  reportTypes: ["全部类型", "体检报告", "检验报告", "影像报告"],
  rows,
};

export default mock;
