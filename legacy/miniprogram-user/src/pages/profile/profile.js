const { loadProfilePosts } = require("../../utils/profile-post");

const PROFILE = {
  name: "笑看人生",
  region: "桂花小区 · 72岁",
  motto: "爱散步、爱拍照，也喜欢把社区里的热闹日常记录下来。",
  stats: [
    { key: "posts", label: "动态", value: 0 },
    { key: "followers", label: "粉丝", value: 128 },
    { key: "likes", label: "获赞", value: 496 }
  ]
};

const BASE_POSTS = [
  {
    id: "profile-default-1",
    author: "笑看人生",
    date: "4月18日",
    title: "晨练结束的小满足",
    content: "今天和老朋友一起在社区花园晨练，空气很好，顺路买了新鲜的水果，准备回家做一份清爽早餐。",
    images: [],
    likes: 32,
    comments: 6
  },
  {
    id: "profile-default-2",
    author: "笑看人生",
    date: "4月15日",
    title: "社区义诊报名成功",
    content: "下周准备去参加社区义诊活动，顺便帮邻居也预约了一下，希望大家都能按时做检查。",
    images: [],
    likes: 21,
    comments: 4
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
    profile: PROFILE,
    posts: [],
    tabItems: TAB_ITEMS,
    activeTab: "mine",
    feedCount: BASE_POSTS.length
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

    this.refreshPosts();
  },

  onShow() {
    this.refreshPosts();
  },

  refreshPosts() {
    const app = getApp();
    const latestProfilePost = app && app.globalData ? app.globalData.latestProfilePost : null;
    const publishedPosts = loadProfilePosts();
    const mergedPublishedPosts = latestProfilePost
      ? [latestProfilePost, ...publishedPosts.filter((item) => item.id !== latestProfilePost.id)]
      : publishedPosts;
    const posts = [...mergedPublishedPosts, ...BASE_POSTS];
    const stats = PROFILE.stats.map((item) => {
      if (item.key !== "posts") {
        return item;
      }

      return {
        ...item,
        value: posts.length
      };
    });

    this.setData({
      profile: {
        ...PROFILE,
        stats
      },
      posts,
      feedCount: posts.length
    });
  },

  handlePendingAction(event) {
    const { label } = event.currentTarget.dataset;

    wx.showToast({
      title: `${label}功能待接入`,
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

    if (key === "mine") {
      return;
    }

    wx.showToast({
      title: `${label}功能待接入`,
      icon: "none"
    });
  }
});
