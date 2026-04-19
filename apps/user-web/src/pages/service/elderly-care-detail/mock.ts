export interface DetailRow {
  label: string
  value: string
}

export interface ServiceItem {
  title: string
  desc: string
}

export interface ReviewItem {
  id: number
  name: string
  meta: string
  score: string
  content: string
}

const mock = {
  title: '青松颐养中心',
  subtitle: '医养结合 · 适老化护理 · 近社区',
  price: '5200起/月',
  rating: '4.9',
  ratingCount: 860,
  address: '徐汇区桂林路 88 号',
  tags: ['医养结合', '康复护理', '24h看护'],
  baseInfo: [
    { label: '机构类型', value: '综合型养老机构' },
    { label: '收住对象', value: '自理、半自理、失能长者' },
    { label: '可用床位', value: '36张' },
    { label: '探访时间', value: '09:00-18:00' },
  ] as DetailRow[],
  services: [
    {
      title: '生活照护',
      desc: '协助起居、洗漱、用餐、房间整理，建立每日照护记录。',
    },
    {
      title: '健康管理',
      desc: '定期测量血压血糖，跟踪慢病指标，异常情况及时提醒家属。',
    },
    {
      title: '康复训练',
      desc: '提供基础活动能力训练、关节活动和步态辅助练习。',
    },
    {
      title: '文娱陪伴',
      desc: '安排手工、棋牌、书画和节庆活动，提升长者社交体验。',
    },
  ] as ServiceItem[],
  facilities: [
    { label: '房型', value: '单人间、双人间、护理套间' },
    { label: '设施', value: '无障碍通道、护理呼叫、适老卫浴、公共活动区' },
    { label: '餐食', value: '一日三餐两点，可根据慢病情况调整少盐少糖餐' },
  ] as DetailRow[],
  detail:
    '青松颐养中心面向需要长期照护和康复支持的长者，提供居住、护理、健康监测、康复活动与家属沟通服务。机构采用分级照护模式，会在入住前进行身体能力、生活习惯和风险因素评估，再匹配对应护理计划。',
  notice: [
    { label: '预约规则', value: '参观需提前1天预约，可选择工作日或周末时段' },
    { label: '入住评估', value: '正式入住前需进行健康评估，并提供近期体检记录' },
    { label: '费用说明', value: '费用根据房型、护理等级和餐食方案综合确认' },
  ] as DetailRow[],
  reviews: [
    {
      id: 1,
      name: '王女士',
      meta: '3天前 上海',
      score: '5.0',
      content: '护理人员沟通很耐心，参观时介绍得很细，环境也比较安静。',
    },
    {
      id: 2,
      name: '周先生',
      meta: '1周前 上海',
      score: '4.9',
      content: '比较看重健康管理和康复训练，这里记录反馈很及时，家属放心不少。',
    },
  ] as ReviewItem[],
}

export default mock
