export interface TimeSlot {
  id: number
  label: string
}

const mock = {
  address: '徐汇区 黎梅花园88栋401',
  monthTitle: '2024 年 01 月',
  weekdays: ['日', '一', '二', '三', '四', '五', '六'],
  days: Array.from({ length: 30 }, (_, index) => index + 1),
  timeSlots: [
    '9:00',
    '9:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
  ].map((label, index) => ({
    id: index + 1,
    label,
  })) as TimeSlot[],
}

export default mock
