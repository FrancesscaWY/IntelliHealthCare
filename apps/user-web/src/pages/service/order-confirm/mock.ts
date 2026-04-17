import serviceImage from '@/assets/service/daily-clean/cleaning-card.png'
import examImage from '@/assets/service/home-care/img_2.png'
import rehabImage from '@/assets/service/home-care/img.png'

const mock = {
  service: {
    title: '日常清洁 2小时1人急速清洁全程质保',
    price: 600,
    image: serviceImage,
  },
  price: {
    total: 600,
    coupon: -20,
    subtotal: 580,
  },
  services: {
    homeCare: {
      title: '日常清洁 2小时1人急速清洁全程质保',
      price: 600,
      image: serviceImage,
    },
    rehab: {
      title: '脑中风术后康复理疗套餐',
      price: 1990,
      image: rehabImage,
    },
    exam: {
      title: '老年人 基础套餐一',
      price: 399,
      image: examImage,
    },
  },
  prices: {
    homeCare: {
      total: 600,
      coupon: -20,
      subtotal: 580,
    },
    rehab: {
      total: 1990,
      coupon: -100,
      subtotal: 1890,
    },
    exam: {
      total: 399,
      coupon: -20,
      subtotal: 379,
    },
  },
  booking: {
    address: '徐汇区黎梅花园88栋3单元101',
    time: '2024-03-23 10:00',
    phone: '19256784886',
  },
  notice: [
    { label: '有效期', value: '购买后60天内有效' },
    { label: '预约规则', value: '请按时消费，预约后服务前2小时内可退' },
  ],
}

export default mock
