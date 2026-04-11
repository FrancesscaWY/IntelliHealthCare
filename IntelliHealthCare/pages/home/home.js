const SEARCH_TAGS = ["高血压", "冠心病", "如何控制血糖"];

const SERVICE_CARDS = [
  {
    key: "nursing",
    title: "家政护理",
    desc: "快速上门服务",
    iconText: "护"
  },
  {
    key: "rehab",
    title: "康复理疗",
    desc: "全套护理方案",
    iconText: "疗"
  },
  {
    key: "exam",
    title: "上门体检",
    desc: "专业医师团队",
    iconText: "检"
  }
];

const FEATURE_ITEMS = [
  { key: "data", title: "健康数据", iconText: "数", colorClass: "mint" },
  { key: "device", title: "设备中心", iconText: "设", colorClass: "violet" },
  { key: "medicine", title: "用药信息", iconText: "药", colorClass: "amber" },
  { key: "disease", title: "疾病宝典", iconText: "病", colorClass: "coral" },
  { key: "archive", title: "健康档案", iconText: "档", colorClass: "teal" },
  { key: "activity", title: "老年活动", iconText: "乐", colorClass: "lavender" },
  { key: "consult", title: "健康咨询", iconText: "询", colorClass: "gold" },
  { key: "institution", title: "养老机构", iconText: "养", colorClass: "sky" },
  { key: "lecture", title: "健康讲堂", iconText: "讲", colorClass: "peach" },
  { key: "diet", title: "饮食记录", iconText: "食", colorClass: "green" },
  { key: "selftest", title: "健康自测", iconText: "测", colorClass: "indigo" }
];

const DISEASE_LIST = ["白内障", "高血压", "中风", "阿尔兹海默症", "糖尿病", "心率不齐"];

const ARTICLES = [
  {
    key: "sugar",
    title: "老年人如何控制血糖？",
    desc: "控制血糖对于维持健康的生活方式和预防糖尿病等疾病至关重要。以下是一些控制血糖的方法。",
    stats: { likes: 1001, stars: 210, comments: 6 },
    images: [
      { label: "饮食", className: "img-one" },
      { label: "理疗", className: "img-two" },
      { label: "水果", className: "img-three" }
    ]
  },
  {
    key: "pressure",
    title: "春季如何做好血压管理？",
    desc: "换季时血压更容易波动，规律监测、饮食清淡、适度运动和按时用药都很重要。",
    stats: { likes: 886, stars: 168, comments: 12 },
    images: [
      { label: "监测", className: "img-four" },
      { label: "运动", className: "img-five" },
      { label: "膳食", className: "img-six" }
    ]
  }
];

const TAB_ITEMS = [
  { key: "home", label: "首页", iconText: "首" },
  { key: "circle", label: "生活圈", iconText: "圈" },
  { key: "publish", label: "", iconText: "+" },
  { key: "message", label: "消息", iconText: "消" },
  { key: "mine", label: "我的", iconText: "我" }
];

Page({
  data: {
    statusBarHeight: 20,
    currentIp: "192.168.1.108",
    searchValue: "",
    searchTags: SEARCH_TAGS,
    serviceCards: SERVICE_CARDS,
    featureItems: FEATURE_ITEMS,
    diseaseList: DISEASE_LIST,
    articles: ARTICLES,
    tabItems: TAB_ITEMS,
    activeTab: "home"
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

  handleSearchInput(event) {
    this.setData({
      searchValue: event.detail.value
    });
  },

  handleSearchConfirm() {
    const keyword = this.data.searchValue || "搜索内容";

    wx.showToast({
      title: `${keyword}功能待接入`,
      icon: "none"
    });
  },

  handleTagTap(event) {
    const { keyword } = event.currentTarget.dataset;

    this.setData({
      searchValue: keyword
    });

    wx.showToast({
      title: `已选中${keyword}`,
      icon: "none"
    });
  },

  handleScanDevice() {
    wx.scanCode({
      onlyFromCamera: false,
      success: () => {
        wx.showToast({
          title: "设备添加成功",
          icon: "success"
        });
      },
      fail: () => {
        wx.showToast({
          title: "扫码已取消",
          icon: "none"
        });
      }
    });
  },

  handleServiceTap(event) {
    const { title } = event.currentTarget.dataset;

    wx.showToast({
      title: `${title}功能待接入`,
      icon: "none"
    });
  },

  handleFeatureTap(event) {
    const { title } = event.currentTarget.dataset;

    wx.showToast({
      title: `${title}功能待接入`,
      icon: "none"
    });
  },

  handleMoreDisease() {
    wx.showToast({
      title: "更多疾病内容待接入",
      icon: "none"
    });
  },

  handleDiseaseTap(event) {
    const { name } = event.currentTarget.dataset;

    wx.showToast({
      title: `${name}详情待接入`,
      icon: "none"
    });
  },

  handleArticleAction(event) {
    const { action } = event.currentTarget.dataset;

    wx.showToast({
      title: `${action}功能待接入`,
      icon: "none"
    });
  },

  handleTabTap(event) {
    const { key, label } = event.currentTarget.dataset;

    if (key === "circle") {
      wx.redirectTo({
        url: "/pages/circle/circle"
      });
      return;
    }

    if (key === "publish") {
      wx.navigateTo({
        url: "/pages/publish/publish"
      });
      return;
    }

    this.setData({
      activeTab: key
    });

    wx.showToast({
      title: `${label}功能待接入`,
      icon: "none"
    });
  }
});
