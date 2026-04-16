import cleaningCardImage from '@/assets/service/daily-clean/cleaning-card.png'

export interface CleanServiceItem {
  id: number
  title: string
  price: number
  sales: number
  image: string
}

const serviceTitle = '日常清洁 2小时1人急速清洁全程质保'

const mock = {
  serviceList: Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    title: serviceTitle,
    price: 300,
    sales: 40,
    image: cleaningCardImage,
  })) as CleanServiceItem[],
}

export default mock
