import homeServiceImage from '@/assets/service/home-care/homeservice.png'
import recomedationimage from '@/assets/service/home-care/home.png'
import careImage from '@/assets/service/home-care/img.png'
import cookImage from '@/assets/service/home-care/img_1.png'
import examImage from '@/assets/service/home-care/img_2.png'
import cleanImage from '@/assets/service/home-care/img_3.png'
import nannyImage from '@/assets/service/home-care/img_4.png'
import elderImage from '@/assets/service/home-care/img_5.png'
import childImage from '@/assets/service/home-care/img_6.png'
import applianceImage from '@/assets/service/home-care/img_7.png'

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
            title: '油烟机深度清洗 拆洗除重油污',
            image: applianceImage,
            price: 128,
            oldPrice: 198,
            category: '家电清洗',
        },
        {
            id: 2,
            title: '全屋大扫除 4小时2人到家服务',
            image: cleanImage,
            price: 268,
            oldPrice: 398,
            category: '日常清洁',
        },
        {
            id: 3,
            title: '老人生活照料 半日陪护安心看护',
            image: elderImage,
            price: 168,
            oldPrice: 238,
            category: '生活照料',
        },
        {
            id: 4,
            title: '上门做饭 三菜一汤营养搭配',
            image: cookImage,
            price: 99,
            oldPrice: 158,
            category: '上门做饭',
        },
        {
            id: 5,
            title: '接送孩子 上下学定点接送',
            image: childImage,
            price: 79,
            oldPrice: 120,
            category: '家庭协助',
        },
    ],

    recommendList: [
        {
            id: 1,
            title: '上门清洁 2小时1人 极速清洁全程质保',
            desc: '适合日常居家保洁，覆盖客厅、卧室、厨房等基础区域。',
            image: recomedationimage,
            price: 88,
            sales: 126,
            category: '日常清洁',
        },
        {
            id: 2,
            title: '油烟机清洗 厨房重油污专项处理',
            desc: '拆洗滤网、扇叶和外壳，适合厨房长期油污积累家庭。',
            image: applianceImage,
            price: 128,
            sales: 98,
            category: '家电清洗',
        },
        {
            id: 3,
            title: '接送孩子 上下学陪同服务',
            desc: '固定时间接送，支持短时陪伴等待，适合双职工家庭。',
            image: childImage,
            price: 79,
            sales: 64,
            category: '家庭协助',
        },
        {
            id: 4,
            title: '照顾老人 半日生活陪护',
            desc: '协助用餐、散步、简单家务和安全看护，让家人更放心。',
            image: elderImage,
            price: 168,
            sales: 83,
            category: '生活照料',
        },
        {
            id: 5,
            title: '全屋大扫除 深度保洁套餐',
            desc: '适合节前整理、搬家后清洁和长期未打扫房间的集中处理。',
            image: cleanImage,
            price: 268,
            sales: 152,
            category: '日常清洁',
        },
        {
            id: 6,
            title: '上门做饭 家庭营养餐',
            desc: '根据口味和忌口准备家常餐，适合老人、儿童和工作日家庭。',
            image: cookImage,
            price: 99,
            sales: 117,
            category: '上门做饭',
        },
        {
            id: 7,
            title: '保姆临时到家 3小时家庭协助',
            desc: '临时照看、简单整理、取送物品，多场景家庭事务协助。',
            image: nannyImage,
            price: 138,
            sales: 76,
            category: '家庭协助',
        },
        {
            id: 8,
            title: '陪同就医 挂号取药陪诊',
            desc: '协助排队、取号、缴费和取药，适合老人独自就医场景。',
            image: examImage,
            price: 198,
            sales: 91,
            category: '陪同就医',
        },
        {
            id: 9,
            title: '居家整理 衣柜收纳换季整理',
            desc: '衣物分类、换季收纳、柜体整理，让居家空间更清爽。',
            image: careImage,
            price: 158,
            sales: 69,
            category: '日常清洁',
        },
        {
            id: 10,
            title: '玻璃清洁 阳台窗户专项清洗',
            desc: '处理窗槽、玻璃和阳台积尘，适合高频通风家庭。',
            image: homeServiceImage,
            price: 118,
            sales: 104,
            category: '日常清洁',
        },
    ],

    countdown: {
        hour: '01',
        minute: '00',
        second: '00',
    },
}

export default mock
