import serviceImage from '@/assets/service/daily-clean/cleaning-card.png'
import examImage from '@/assets/service/home-care/img_2.png'
import rehabImage from '@/assets/service/home-care/img.png'

const mock = {
  serviceTabs: [
    { key: 'homeCare', label: '家政护理' },
    { key: 'therapy', label: '康复理疗' },
    { key: 'exam', label: '上门体检' },
  ],
  tabs: [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待付款' },
    { key: 'assessment', label: '待评估' },
    { key: 'service', label: '待服务' },
    { key: 'review', label: '待评价' },
  ],
  ordersByService: {
    homeCare: [
      {
        id: 101,
        status: 'pending',
        statusText: '待付款',
        countdown: '08:15',
        title: '日常清洁 2小时1人急速清洁全程质保',
        price: 600,
        image: serviceImage,
        actions: [
          { key: 'cancel', label: '取消订单', type: 'ghost' },
          { key: 'edit', label: '修改订单信息', type: 'ghost' },
          { key: 'pay', label: '继续支付', type: 'primary' },
        ],
      },
      {
        id: 102,
        status: 'service',
        statusText: '待服务',
        title: '日常清洁 2小时1人急速清洁全程质保',
        price: 600,
        image: serviceImage,
        actions: [
          { key: 'record', label: '服务记录', type: 'ghost' },
          { key: 'book', label: '预约服务', type: 'ghost' },
          { key: 'coupon', label: '服务券码', type: 'primary' },
        ],
      },
    ],
    therapy: [
      {
        id: 1,
        status: 'pending',
        statusText: '待付款',
        countdown: '10:30',
        title: '脑中风术后康复理疗套餐',
        price: 1990,
        image: rehabImage,
        actions: [
          { key: 'cancel', label: '取消订单', type: 'ghost' },
          { key: 'edit', label: '修改订单信息', type: 'ghost' },
          { key: 'pay', label: '继续支付', type: 'primary' },
        ],
      },
      {
        id: 2,
        status: 'assessment',
        statusText: '待评估',
        title: '脑中风术后康复理疗套餐',
        price: 1990,
        image: rehabImage,
        actions: [
          { key: 'cancel', label: '取消订单', type: 'ghost' },
          { key: 'edit', label: '修改订单信息', type: 'ghost' },
          { key: 'coupon', label: '服务券码', type: 'primary' },
        ],
      },
      {
        id: 3,
        status: 'service',
        statusText: '待服务',
        title: '脑中风术后康复理疗套餐',
        price: 1990,
        image: rehabImage,
        actions: [
          { key: 'report', label: '评估报告', type: 'ghost' },
          { key: 'record', label: '服务记录', type: 'ghost' },
          { key: 'book', label: '预约服务', type: 'primary' },
        ],
      },
      {
        id: 4,
        status: 'done',
        statusText: '已完成',
        title: '脑中风术后康复理疗套餐',
        price: 1990,
        image: rehabImage,
        actions: [
          { key: 'record', label: '服务记录', type: 'ghost' },
          { key: 'again', label: '再次购买', type: 'ghost' },
          { key: 'review', label: '去评价', type: 'primary' },
        ],
      },
    ],
    exam: [
      {
        id: 201,
        status: 'assessment',
        statusText: '待评估',
        title: '老年人 基础套餐一',
        price: 399,
        image: examImage,
        actions: [
          { key: 'cancel', label: '取消订单', type: 'ghost' },
          { key: 'edit', label: '修改订单信息', type: 'ghost' },
          { key: 'coupon', label: '服务券码', type: 'primary' },
        ],
      },
      {
        id: 202,
        status: 'done',
        statusText: '已完成',
        title: '老年人 基础套餐一',
        price: 399,
        image: examImage,
        actions: [
          { key: 'record', label: '服务记录', type: 'ghost' },
          { key: 'again', label: '再次购买', type: 'ghost' },
          { key: 'review', label: '去评价', type: 'primary' },
        ],
      },
      {
        id: 203,
        status: 'assessment',
        statusText: '待评估',
        title: '老年人 全面健康体检套餐',
        price: 599,
        image: examImage,
        actions: [
          { key: 'checkup-report', label: '查看报告', type: 'ghost' },
          { key: 'again', label: '再次购买', type: 'ghost' },
          { key: 'review', label: '去评价', type: 'primary' },
        ],
      },
    ],
  },
}

export default mock
