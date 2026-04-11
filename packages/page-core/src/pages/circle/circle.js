const BANNERS = [
  {
    key: "photo",
    subtitle: "PHOTOGRAPHY CONTEST",
    titleTop: "老 年",
    centerText: "桂花小区 春小",
    titleBottom: "摄 影 大 赛"
  },
  {
    key: "lecture",
    subtitle: "HEALTH SHARING",
    titleTop: "健 康",
    centerText: "社区健康讲堂",
    titleBottom: "知 识 分 享"
  },
  {
    key: "dance",
    subtitle: "COMMUNITY EVENT",
    titleTop: "夕 阳",
    centerText: "康乐广场舞会",
    titleBottom: "舞 会 招 募"
  },
  {
    key: "travel",
    subtitle: "SPRING WALK",
    titleTop: "春 日",
    centerText: "老友公园踏青",
    titleBottom: "徒 步 活 动"
  }
];

const HOT_ACTIVITIES = [
  { key: "walk", title: "春日海边徒步", count: "56人已报名", className: "act-one" },
  { key: "flower", title: "春风赏花活动", count: "38人已报名", className: "act-two" },
  { key: "yoga", title: "清晨舒缓瑜伽", count: "29人已报名", className: "act-three" }
];

const POSTS = {
  hot: [
    {
      key: "neighbor",
      author: "亲如一家",
      date: "1月3日",
      content: "今天，阳光正好，忍不住出门去公园散散步，散步的过程中，我遇到了一位老友，他也是我多年的邻居。我们坐在长椅上，聊起了往事，分享生活的点滴。",
      images: ["post-one", "post-two", "post-three"],
      likes: 86,
      comments: 18
    },
    {
      key: "square",
      author: "银龄时光",
      date: "1月5日",
      content: "社区广场今天特别热闹，大家一起做操、聊天、晒太阳。这样的生活圈活动让人觉得特别温暖，也更愿意走出家门。",
      images: ["post-four", "post-five"],
      likes: 64,
      comments: 10
    }
  ],
  follow: [
    {
      key: "reading",
      author: "安康驿站",
      date: "1月7日",
      content: "今天在活动室参加了读书分享会，大家围绕养生、旅行和退休生活聊了很多，收获满满。",
      images: ["post-six", "post-seven", "post-eight"],
      likes: 43,
      comments: 7
    }
  ]
};

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
    currentBanner: 0,
    banners: BANNERS,
    hotActivities: HOT_ACTIVITIES,
    activeFeedTab: "hot",
    posts: POSTS.hot,
    tabItems: TAB_ITEMS,
    activeTab: "circle"
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

  handleBannerChange(event) {
    this.setData({
      currentBanner: event.detail.current
    });
  },

  handleMoreActivities() {
    wx.showToast({
      title: "更多活动待接入",
      icon: "none"
    });
  },

  handleActivityTap(event) {
    const { title } = event.currentTarget.dataset;

    wx.showToast({
      title: `${title}详情待接入`,
      icon: "none"
    });
  },

  handleFeedTabTap(event) {
    const { tab } = event.currentTarget.dataset;

    this.setData({
      activeFeedTab: tab,
      posts: POSTS[tab]
    });
  },

  handlePostAction(event) {
    const { action } = event.currentTarget.dataset;

    wx.showToast({
      title: `${action}功能待接入`,
      icon: "none"
    });
  },

  handleHeadphoneTap() {
    wx.showToast({
      title: "客服功能待接入",
      icon: "none"
    });
  },

  handleTabTap(event) {
    const { key, label } = event.currentTarget.dataset;

    if (key === "home") {
      wx.redirectTo({
        url: "/pages/home/home"
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
