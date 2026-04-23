import examImage from '@/assets/service/home-care/img_11.png'
import examImage1 from '@/assets/service/home-care/img_12.png'
import examImage2 from '@/assets/service/home-care/img_13.png'
import examImage3 from '@/assets/service/home-care/img_14.png'
import examImage4 from '@/assets/service/home-care/img_15.png'
import examImage5 from '@/assets/service/home-care/img_16.png'

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
    title: [
      '老年人基础健康体检套餐',
      '高血压风险筛查套餐',
      '糖尿病居家检测套餐',
      '心血管专项体检套餐',
      '肝肾功能基础筛查套餐',
      '骨密度与关节健康检测',
      '肿瘤标志物初筛套餐',
    ][index],
    price: [399, 299, 329, 499, 369, 289, 599][index],
    image: [examImage, examImage1, examImage2, examImage3, examImage4, examImage5, examImage][index],
  })) as ExamPackage[],
}

export default mock
