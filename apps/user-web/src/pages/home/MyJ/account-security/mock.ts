import qqIcon from "@/assets/login/qq.png";
import taobaoIcon from "@/assets/login/tb.png";
import weiboIcon from "@/assets/login/vb.png";
import wechatIcon from "@/assets/login/wx.png";
import alipayIcon from "@/assets/login/zfb.png";

const mock = {
  title: "账号与安全",
  phone: "+86 192***6686",
  passwordLabel: "修改密码",
  socialTitle: "绑定社交账号",
  socials: [
    { key: "wechat", label: "微信", status: "未绑定", icon: wechatIcon },
    { key: "alipay", label: "支付宝", status: "未绑定", icon: alipayIcon },
    { key: "taobao", label: "淘宝", status: "未绑定", icon: taobaoIcon },
    { key: "qq", label: "QQ", status: "未绑定", icon: qqIcon },
    { key: "weibo", label: "微博", status: "未绑定", icon: weiboIcon },
  ],
};

export default mock;

