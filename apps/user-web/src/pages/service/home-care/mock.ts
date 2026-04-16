import homeServiceImage from '@/assets/service/home-care/homeservice.png'
import recomedationimage from '@/assets/service/home-care/home.png'

export interface ServiceItem {
    id: number
    name: string
    type: string
}

export interface CareItem {
    id: number
    title: string
    desc?: string
    image: string
    price: number
    oldPrice?: number
    sales?: number
    category: string
}

export interface CountdownData {
    hour: string
    minute: string
    second: string
}

const mock = {

    serviceList : [
        { id: 1, name: '生活照料', type: 'life' },
        { id: 2, name: '临床护理', type: 'medical' },
        { id: 3, name: '康复护理', type: 'rehab' },
        { id: 4, name: '心理关怀', type: 'mental' },
        { id: 5, name: '上门做饭', type: 'cooking' },
        { id: 6, name: '健康管理', type: 'health' },
        { id: 7, name: '陪同就医', type: 'accompany' },
        { id: 8, name: '日常清洁', type: 'clean' },
    ],

    discountList: [
        {
            id: 1,
            title: '康复护理 老年腰肌劳损推拿按摩',
            image: homeServiceImage,
            price: 100,
            oldPrice: 200,
            category: '测试',
        },
        {
            id: 2,
            title: '康复护理 老年腰肌劳损推拿按摩',
            image: homeServiceImage,
            price: 100,
            oldPrice: 200,
            category: '测试',
        },
        {
            id: 3,
            title: '康复护理 老年腰肌劳损推拿按摩',
            image: homeServiceImage,
            price: 100,
            oldPrice: 200,
            category: '测试',
        },
    ],

    recommendList: [
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '这是一个测试描述',
            image: recomedationimage,
            price: 88,
            sales: 10,
            category: '测试',
        },
    ],

    countdown: {
        hour: '01',
        minute: '00',
        second: '00',
    },
}

export default mock
