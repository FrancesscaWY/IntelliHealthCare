import alipayIcon from '@/assets/login/zfb.png'
import wechatIcon from '@/assets/login/wx.png'

export interface PaymentMethod {
  id: string
  name: string
  icon?: string
  cardNo?: string
}

const mock = {
  amount: '580.00',
  remainingTime: '01:06:09',
  methods: [
    {
      id: 'alipay',
      name: '支付宝',
      icon: alipayIcon,
    },
    {
      id: 'wechat',
      name: '微信',
      icon: wechatIcon,
    },
    {
      id: 'bank',
      name: '招商银行卡支付',
      cardNo: '*** **** **** 3570',
    },
  ] as PaymentMethod[],
}

export default mock
