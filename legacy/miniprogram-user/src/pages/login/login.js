const THIRD_PARTY_OPTIONS = [
  { key: "alipay", short: "支", label: "支付宝" },
  { key: "taobao", short: "淘", label: "淘宝" },
  { key: "wechat", short: "微", label: "微信" },
  { key: "qq", short: "Q", label: "QQ" },
  { key: "weibo", short: "博", label: "微博" }
];

Page({
  data: {
    brandName: "智诊康养",
    loginMode: "password",
    phone: "",
    password: "",
    code: "",
    agreed: true,
    statusBarHeight: 20,
    thirdPartyOptions: THIRD_PARTY_OPTIONS
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

  handleBack() {
    const pages = getCurrentPages();

    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }

    wx.redirectTo({
      url: "/pages/index/index"
    });
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      [field]: event.detail.value
    });
  },

  toggleLoginMode() {
    const nextMode = this.data.loginMode === "password" ? "code" : "password";

    this.setData({
      loginMode: nextMode
    });
  },

  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  handleForgetPassword() {
    wx.showToast({
      title: "忘记密码功能待接入",
      icon: "none"
    });
  },

  handleGetCode() {
    if (!this.data.phone) {
      wx.showToast({
        title: "请先输入手机号",
        icon: "none"
      });
      return;
    }

    wx.showToast({
      title: "验证码已发送",
      icon: "none"
    });
  },

  handleLogin() {
    const { phone, password, code, loginMode, agreed } = this.data;

    if (!agreed) {
      wx.showToast({
        title: "请先同意隐私政策",
        icon: "none"
      });
      return;
    }

    if (!phone) {
      wx.showToast({
        title: "请输入手机号",
        icon: "none"
      });
      return;
    }

    if (loginMode === "password" && !password) {
      wx.showToast({
        title: "请输入密码",
        icon: "none"
      });
      return;
    }

    if (loginMode === "code" && !code) {
      wx.showToast({
        title: "请输入验证码",
        icon: "none"
      });
      return;
    }

    wx.showToast({
      title: "登录成功",
      icon: "success",
      duration: 1200
    });

    setTimeout(() => {
      wx.reLaunch({
        url: "/pages/home/home"
      });
    }, 500);
  },

  handleThirdPartyLogin(event) {
    const { label } = event.currentTarget.dataset;

    wx.showToast({
      title: `${label}登录成功`,
      icon: "success",
      duration: 1200
    });

    setTimeout(() => {
      wx.reLaunch({
        url: "/pages/home/home"
      });
    }, 500);
  },

  handlePolicyTap() {
    wx.showToast({
      title: "隐私政策页面待补充",
      icon: "none"
    });
  }
});
