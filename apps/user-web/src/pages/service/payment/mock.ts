import alipayIcon from "@/assets/login/zfb.png";
import wechatIcon from "@/assets/login/wx.png";

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  cardNo?: string;
  desc: string;
}

const mock = {
  methods: [
    {
      id: "alipay",
      name: "支付宝",
      icon: alipayIcon,
      desc: "推荐常用支付方式",
    },
    {
      id: "wechat",
      name: "微信支付",
      icon: wechatIcon,
      desc: "适合扫码或零钱支付",
    },
    {
      id: "bank",
      name: "招商银行卡支付",
      cardNo: "*** **** **** 3570",
      desc: "储蓄卡快捷支付",
    },
  ] as PaymentMethod[],
};

export default mock;
