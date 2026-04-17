import avatarImage from '@/assets/community/activities/people.png'

const mock = {
  profile: {
    avatar: avatarImage,
    name: '笑看人生',
    level: 'Lv3',
    stats: [
      { value: '154', label: '关注' },
      { value: '24', label: '收藏' },
      { value: '384', label: '点赞' },
      { value: '1254', label: '足迹' },
    ],
    healthCards: [
      { key: 'heart', label: '心率', value: '97', unit: 'bpm', tone: 'green' },
      { key: 'steps', label: '步数', value: '1578', unit: '步', tone: 'pink' },
      { key: 'water', label: '饮水', value: '8', unit: '杯', tone: 'blue' },
    ],
  },
  orderEntry: { label: '我的订单', desc: '家政护理、康复理疗、上门体检', pageId: 'orders/rehab-therapy' },
  menus: [
    { key: 'coupon', label: '优惠券', icon: 'coupon' },
    { key: 'points', label: '积分', icon: 'points' },
    { key: 'activity', label: '我参加的活动', icon: 'star' },
    { key: 'review', label: '我的评价', icon: 'comment' },
    { key: 'support', label: '帮助与支持', icon: 'help' },
    { key: 'settings', label: '设置', icon: 'setting' },
  ],
  tabs: [
    { key: 'home', label: '首页', pageId: 'home/dashboard' },
    { key: 'circle', label: '生活圈', pageId: 'community/circle' },
    { key: 'publish', label: '', pageId: 'community/publish' },
    { key: 'message', label: '消息', pageId: 'home/message' },
    { key: 'mine', label: '我的', pageId: 'home/mine' },
  ],
}

export default mock
