import examImage from '@/assets/service/home-care/img_2.png'
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
  icon: 'calendar' | 'medical' | 'hospital' | 'check'
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
  image: examImage,
  title: '老年人 基础套餐一',
  price: '399.00',
  discount: '8.5折',
  rating: '5.0',
  ratingCount: 2000,
  flow: [
    { id: 1, label: '预约体检', icon: 'calendar' },
    { id: 2, label: '上门采样', icon: 'medical' },
    { id: 3, label: '专业检测', icon: 'hospital' },
    { id: 4, label: '报告解读', icon: 'check' },
  ] as FlowItem[],
  serviceContent: [
    { label: '检查项目', value: '血压、血糖、血常规、肝肾功能、心电图等基础项目' },
    { label: '适用人群', value: '需要居家完成基础健康筛查的老年人和行动不便人群。' },
    { label: '报告时间', value: '体检完成后1-3个工作日出具电子报告' },
    { label: '服务方式', value: '专业医护人员上门采样并提供基础健康咨询。' },
  ] as DetailRow[],
  staff: [
    {
      id: 1,
      name: '赵医生',
      badge: '健康评估师',
      description: '熟悉老年慢病筛查和基础体征评估，服务耐心细致。',
      image: staffOneImage,
    },
    {
      id: 2,
      name: '林护士',
      badge: '上门护士',
      description: '擅长上门采样、血压血糖检测和体检流程沟通。',
      image: staffTwoImage,
    },
    {
      id: 3,
      name: '陈医生',
      badge: '报告解读师',
      description: '可根据体检报告提供清晰易懂的健康建议。',
      image: staffThreeImage,
    },
  ] as StaffItem[],
  detail: '本套餐适合老年人日常基础健康筛查，医护人员会按预约时间上门完成基础体征检测和样本采集，报告生成后提供重点指标解读。',
  notice: [
    { label: '有效期', value: '购买后60天内有效' },
    { label: '预约规则', value: '请提前24小时预约，体检前请保持清淡饮食' },
    { label: '取消规则', value: '预约后服务前2小时内可申请改期或取消' },
  ] as DetailRow[],
  reviews: [
    {
      id: 1,
      name: '王先生',
      meta: '2天前 北京',
      score: '5.0',
      content: '上门体检很方便，医护人员准时到达，检查过程也很细致。',
    },
    {
      id: 2,
      name: '刘女士',
      meta: '5天前 上海',
      score: '5.0',
      content: '报告解读很清楚，适合家里老人定期做基础检查。',
    },
  ] as ReviewItem[],
}

export default mock
