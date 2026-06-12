import rehabImage from '@/assets/service/home-care/img.png'
import rehabImage1 from '@/assets/service/home-care/img_1.png'
import rehabImage2 from '@/assets/service/home-care/img_8.png'
import rehabImage3 from '@/assets/service/home-care/img_9.png'
import rehabImage4 from '@/assets/service/home-care/img_10.png'
import rehabImage5 from '@/assets/service/home-care/img_2.png'

export default {
  filters: [
    { key: 'popular', label: '人气' },
    { key: 'sales', label: '销量' },
    { key: 'price', label: '价格' },
  ],
  products: [
    {
      id: 1,
      title: '脑中风术后康复训练',
      image: rehabImage2,
      tags: ['神经康复'],
      price: 1290,
      sales: 86,
    },
    {
      id: 2,
      title: '肩颈疼痛理疗放松',
      image: rehabImage3,
      tags: ['肩颈调理'],
      price: 298,
      sales: 143,
    },
    {
      id: 3,
      title: '膝关节术后活动度恢复',
      image: rehabImage4,
      tags: ['关节康复'],
      price: 860,
      sales: 72,
    },
    {
      id: 4,
      title: '腰椎劳损居家理疗',
      image: rehabImage,
      tags: ['腰背护理'],
      price: 368,
      sales: 128,
    },
    {
      id: 5,
      title: '偏瘫肢体功能训练',
      image: rehabImage5,
      tags: ['肢体训练'],
      price: 1180,
      sales: 65,
    },
    {
      id: 6,
      title: '老人平衡步态训练',
      image: rehabImage1,
      tags: ['步态训练'],
      price: 520,
      sales: 94,
    },
    {
      id: 7,
      title: '产后骨盆修复理疗',
      image: rehabImage3,
      tags: ['产后修复'],
      price: 699,
      sales: 57,
    },
    {
      id: 8,
      title: '手术后基础康复评估',
      image: rehabImage4,
      tags: ['康复评估'],
      price: 399,
      sales: 111,
    },
  ],
}
