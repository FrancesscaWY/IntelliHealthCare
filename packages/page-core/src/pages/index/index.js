const slides = [
  {
    key: "archive",
    title: "健康档案",
    desc: "多维度健康信息，实时记录老人健康状况"
  },
  {
    key: "nursing",
    title: "家政护理",
    desc: "贴心上门服务，多种护理服务可供选择"
  },
  {
    key: "data",
    title: "健康数据",
    desc: "设备互联，实现健康数据实时检测"
  },
  {
    key: "exam",
    title: "上门体检",
    desc: "多种体检项目，在线查看体检报告与解读"
  }
];

Page({
  data: {
    current: 0,
    slides,
    statusBarHeight: 20
  },

  onLoad() {
    let statusBarHeight = 20;

    try {
      const systemInfo = wx.getSystemInfoSync();
      statusBarHeight = systemInfo.statusBarHeight || 20;
    } catch (error) {
      statusBarHeight = 20;
    }

    this.setData({
      statusBarHeight
    });
  },

  handleSwiperChange(event) {
    this.setData({
      current: event.detail.current
    });
  },

  handleSkip() {
    wx.navigateTo({
      url: "/pages/login/login"
    });
  },

  handleExperience() {
    wx.navigateTo({
      url: "/pages/login/login"
    });
  }
});
