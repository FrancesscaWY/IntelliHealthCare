import serviceImage from '@/assets/service/home-care/homeservice.png'
import staffOneImage from '@/assets/service/home-care-detail/staff-1.png'
import staffTwoImage from '@/assets/service/home-care-detail/staff-2.png'
import staffThreeImage from '@/assets/service/home-care-detail/staff-3.png'

export interface DetailRow {
  label: string
  value: string
}

export interface StaffItem {
  id: number
  name: string
  badge: string
  description: string
  image: string
}

export interface ReviewItem {
  id: number
  name: string
  meta: string
  score: string
  content: string
}

const mock = {
  image: serviceImage,
  title: '日常清洁 2小时1人急速清洁全程质保',
  price: '300.00',
  discount: '8.5折',
  rating: '5.0',
  ratingCount: 2000,
  serviceContent: [
    { label: '适用场景', value: '房间' },
    { label: '适用面积', value: '≤50m²' },
    {
      label: '适用范围',
      value: '包括清洁地面、家具、门窗、厨房和卫生间等区域。清洁人员会使用专业的清洁工具和化学药剂，确保各个区域都达到清洁、卫生和整洁的标准。',
    },
    { label: '超时费用', value: '60元/小时' },
  ] as DetailRow[],
  staff: [
    {
      id: 1,
      name: '王小晴',
      badge: '金牌家政',
      description: '擅长日常保洁与厨房清洁，服务细致耐心，能快速整理重点区域。',
      image: staffOneImage,
    },
    {
      id: 2,
      name: '李雅雯',
      badge: '金牌家政',
      description: '专注家庭清洁、衣物整理和卫生间养护，流程规范，沟通温和。',
      image: staffTwoImage,
    },
    {
      id: 3,
      name: '陈思宁',
      badge: '金牌家政',
      description: '熟悉地面、家具和门窗清洁，经验丰富，注重细节和服务效率。',
      image: staffThreeImage,
    },
  ] as StaffItem[],
  detail: '选择一家专业的保洁公司或个人提供日常保洁服务，可以确保清洁效果和服务质量，让客户省心、省时、省力。',
  notice: [
    { label: '有效期', value: '购买后60天内有效' },
    { label: '预约规则', value: '请按时消费，预约后服务前2小时内可退' },
  ] as DetailRow[],
  reviews: [
    {
      id: 1,
      name: '王强',
      meta: '2天前 北京',
      score: '5.0',
      content: '非常满意日常保洁服务，清洁人员非常专业、认真，服务态度非常好。',
    },
    {
      id: 2,
      name: '王强',
      meta: '2天前 北京',
      score: '5.0',
      content: '非常满意日常保洁服务，清洁人员非常专业、认真，服务态度非常好。',
    },
  ] as ReviewItem[],
}

export default mock
