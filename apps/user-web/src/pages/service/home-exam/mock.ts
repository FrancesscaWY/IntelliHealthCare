import examImage from '@/assets/service/home-care/img_2.png'

export interface ExamCategory {
  key: string
  label: string
}

export interface ExamPackage {
  id: number
  title: string
  price: number
  image: string
}

const mock = {
  categories: [
    { key: 'regular', label: '常规检查' },
    { key: 'blood', label: '高血压' },
    { key: 'diabetes', label: '糖尿病' },
    { key: 'liver', label: '肝病' },
    { key: 'waist', label: '腰肌劳损' },
    { key: 'heart', label: '心血管疾病' },
    { key: 'bone', label: '骨密度检查' },
    { key: 'tumor', label: '肿瘤标志物' },
  ] as ExamCategory[],
  packages: Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    title: '老年人 基础套餐一',
    price: 399,
    image: examImage,
  })) as ExamPackage[],
}

export default mock
