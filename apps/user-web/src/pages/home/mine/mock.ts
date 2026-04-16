import avatarImage from '@/assets/mine/avatar.jpg'

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
  },
  orders: [
    { key: 'home-care', label: '家政护理', icon: 'home' },
    { key: 'therapy', label: '康复理疗', icon: 'medical' },
    { key: 'exam', label: '上门体检', icon: 'hospital' },
  ],
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
    { key: 'message', label: '消息', pageId: '' },
    { key: 'mine', label: '我的', pageId: 'home/mine' },
  ],
}

export default mock
