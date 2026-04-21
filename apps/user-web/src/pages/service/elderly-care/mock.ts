export type FilterKey = 'popular' | 'rating' | 'price'

export interface ElderlyCareItem {
  id: number
  name: string
  subtitle: string
  tags: string[]
  price: number
  rating: number
  distance: string
  beds: number
}

const mock = {
  filters: [
    { key: 'popular', label: '人气' },
    { key: 'rating', label: '评分' },
    { key: 'price', label: '价格' },
  ] as Array<{ key: FilterKey; label: string }>,
  institutions: [
    {
      id: 1,
      name: '青松颐养中心',
      subtitle: '医养结合 · 适老化护理',
      tags: ['医养结合', '康复护理'],
      price: 5200,
      rating: 4.9,
      distance: '1.8km',
      beds: 36,
    },
    {
      id: 2,
      name: '暖阳长者公寓',
      subtitle: '社区型照护 · 家庭式陪伴',
      tags: ['半自理照护', '营养餐'],
      price: 4600,
      rating: 4.8,
      distance: '2.4km',
      beds: 28,
    },
    {
      id: 3,
      name: '云栖康养院',
      subtitle: '康养评估 · 慢病管理',
      tags: ['慢病管理', '认知训练'],
      price: 6800,
      rating: 5.0,
      distance: '3.1km',
      beds: 18,
    },
    {
      id: 4,
      name: '瑞和养老之家',
      subtitle: '全天候护理 · 安全陪护',
      tags: ['24h护理', '适老设施'],
      price: 5900,
      rating: 4.7,
      distance: '4.0km',
      beds: 42,
    },
    {
      id: 5,
      name: '星河颐居院',
      subtitle: '花园环境 · 文娱活动',
      tags: ['文娱活动', '花园院区'],
      price: 6300,
      rating: 4.9,
      distance: '4.6km',
      beds: 21,
    },
    {
      id: 6,
      name: '安宁护理院',
      subtitle: '专业护理 · 失能照护',
      tags: ['失能照护', '基础医疗'],
      price: 7200,
      rating: 4.8,
      distance: '5.2km',
      beds: 15,
    },
  ] as ElderlyCareItem[],
}

export default mock
