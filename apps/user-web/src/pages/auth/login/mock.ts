import qqIcon from "@/assets/login/qq.png";
import taobaoIcon from "@/assets/login/tb.png";
import weiboIcon from "@/assets/login/vb.png";
import wechatIcon from "@/assets/login/wx.png";
import alipayIcon from "@/assets/login/zfb.png";

const mock = {
  brandName: "智诊康养",
  thirdPartyOptions: [
    { key: "alipay", label: "支付宝", icon: alipayIcon },
    { key: "taobao", label: "淘宝", icon: taobaoIcon },
    { key: "wechat", label: "微信", icon: wechatIcon },
    { key: "qq", label: "QQ", icon: qqIcon },
    { key: "weibo", label: "微博", icon: weiboIcon },
  ],
};

export default mock;
