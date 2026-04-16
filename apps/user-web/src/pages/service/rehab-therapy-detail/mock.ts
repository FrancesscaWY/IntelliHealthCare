import rehabImage from '@/assets/service/home-care/img.png'
import staffOneImage from '@/assets/service/home-care-detail/staff-1.png'
import staffTwoImage from '@/assets/service/home-care-detail/staff-2.png'
import staffThreeImage from '@/assets/service/home-care-detail/staff-3.png'

export interface DetailRow {
  label: string
  value: string
}

export interface FlowItem {
  id: number
  label: string
  icon: 'medical' | 'evaluate' | 'plan' | 'location'
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
  image: rehabImage,
  title: '脑中风术后康复理疗套餐',
  price: '1990.00',
  discount: '8.5折',
  rating: '5.0',
  ratingCount: 2000,
  flow: [
    { id: 1, label: '预约服务', icon: 'medical' },
    { id: 2, label: '上门评估', icon: 'evaluate' },
    { id: 3, label: '制定康复计划', icon: 'plan' },
    { id: 4, label: '预约服务', icon: 'location' },
  ] as FlowItem[],
  serviceContent: [
    { label: '治疗方法', value: '运动疗法' },
    { label: '疗程', value: '12次' },
    {
      label: '适用人群',
      value: '脑中风手术并希望通过康复诊疗来改善身体功能和生活质量的患者。',
    },
  ] as DetailRow[],
  staff: [
    {
      id: 1,
      name: '周明远',
      badge: '康复治疗师',
      description: '擅长脑卒中术后康复训练，重视动作评估和循序渐进的功能恢复。',
      image: staffOneImage,
    },
    {
      id: 2,
      name: '林安琪',
      badge: '康复治疗师',
      description: '专注运动疗法与日常活动能力训练，沟通耐心，方案执行细致。',
      image: staffTwoImage,
    },
    {
      id: 3,
      name: '陈嘉宁',
      badge: '康复治疗师',
      description: '熟悉家庭康复场景，能根据患者状态调整训练强度和节奏。',
      image: staffThreeImage,
    },
  ] as StaffItem[],
  detail: '治疗师会根据患者身体状态进行上门评估，制定阶段性康复计划，并通过关节活动、肌力训练和平衡训练帮助提升日常生活能力。',
  notice: [
    { label: '有效期', value: '购买后90天内有效' },
    { label: '预约规则', value: '请提前24小时预约，服务前2小时内可申请改期' },
  ] as DetailRow[],
  reviews: [
    {
      id: 1,
      name: '张先生',
      meta: '2天前 上海',
      score: '5.0',
      content: '治疗师很专业，评估后给了清晰的训练计划，家人配合起来也更放心。',
    },
    {
      id: 2,
      name: '李女士',
      meta: '5天前 北京',
      score: '5.0',
      content: '上门康复服务很细致，每次训练后都会说明注意事项，整体体验很好。',
    },
  ] as ReviewItem[],
}

export default mock
