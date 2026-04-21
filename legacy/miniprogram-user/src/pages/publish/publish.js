const { prependProfilePost } = require("../../utils/profile-post");

function navigateToProfile() {
  wx.reLaunch({
    url: "/pages/profile/profile",
    fail: () => {
      wx.navigateTo({
        url: "/pages/profile/profile",
        fail: () => {
          wx.showToast({
            title: "跳转失败",
            icon: "none"
          });
        }
      });
    }
  });
}

Page({
  data: {
    statusBarHeight: 20,
    title: "",
    content: "",
    images: []
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

  handleClose() {
    const pages = getCurrentPages();

    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({
      url: "/pages/circle/circle"
    });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: event.detail.value
    });
  },

  handleChooseImage() {
    const currentCount = this.data.images.length;

    wx.chooseImage({
      count: 6 - currentCount,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths).slice(0, 6)
        });
      }
    });
  },

  handlePublish() {
    const { title, content, images } = this.data;

    if (!title.trim()) {
      wx.showToast({
        title: "请输入标题",
        icon: "none"
      });
      return;
    }

    if (!content.trim()) {
      wx.showToast({
        title: "请输入内容",
        icon: "none"
      });
      return;
    }

    const now = new Date();
    const nextPost = {
      id: `published-${Date.now()}`,
      author: "笑看人生",
      date: `${now.getMonth() + 1}月${now.getDate()}日`,
      title: title.trim(),
      content: content.trim(),
      images,
      likes: 0,
      comments: 0
    };

    try {
      const app = getApp();

      if (app && app.globalData) {
        app.globalData.latestProfilePost = nextPost;
      }

      prependProfilePost(nextPost);
    } catch (error) {
      console.error("save profile post failed", error);
    }

    wx.showToast({
      title: "发布成功",
      icon: "success"
    });

    setTimeout(() => {
      navigateToProfile();
    }, 300);
  }
});
