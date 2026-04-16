import beachImage from '@/assets/community/activities/beach-walk-activity.jpg'
import cherryImage from '@/assets/community/activities/cherry-blossom-activity.jpg'
import cookImage from '@/assets/community/activities/cook.png'
import cookTwoImage from '@/assets/community/activities/cook2.png'
import cookThreeImage from '@/assets/community/activities/cook3.png'
import peopleImage from '@/assets/community/activities/people.png'
import peopleTwoImage from '@/assets/community/activities/people2.png'
import sunsetImage from '@/assets/community/activities/sunset.png'
import avatarLiu from '@/assets/content/avatar-liu.jpg'
import avatarMe from '@/assets/content/avatar-me.jpg'
import avatarWang from '@/assets/content/avatar-wang.jpg'
import avatarZhao from '@/assets/content/avatar-zhao.jpg'

const mock = {
  feedTabs: ['关注', '推荐', '最新'],
  topics: [
    {
      id: 1,
      title: '#沿路风景',
      image: beachImage,
      count: '正在加入20.8w',
      tone: 'blue',
    },
    {
      id: 2,
      title: '#晒晒你的美食',
      image: cookImage,
      count: '正在加入3.3w',
      tone: 'yellow',
    },
    {
      id: 3,
      title: '#分享你的落日',
      image: sunsetImage,
      count: '正在加入14.9w',
      tone: 'orange',
    },
    {
      id: 4,
      title: '#摄影大赛',
      image: cherryImage,
      count: '正在加入1.4w',
      tone: 'purple',
    },
  ],
  posts: [
    {
      id: 1,
      author: '菜菜先生',
      badge: 'TANG达人',
      time: '54秒前推荐',
      avatar: peopleImage,
      content: '分享一下喜欢做又简单的菜，今天晚饭刚好有阳光照进厨房。',
      tag: 'TANG达人召令',
      images: [cookImage, cookTwoImage, cookThreeImage],
      comments: 201,
      stars: 88,
      likes: 1010,
      shares: 32,
    },
    {
      id: 2,
      author: '晚风记事',
      badge: '摄影爱好者',
      time: '10分钟前',
      avatar: peopleTwoImage,
      content: '散步时遇到很漂亮的天空，落日把云染成橘色，心情也慢慢安静下来。',
      tag: '分享你的落日',
      images: [sunsetImage, beachImage],
      comments: 96,
      stars: 42,
      likes: 520,
      shares: 18,
    },
    {
      id: 3,
      author: '山路慢行',
      badge: '风景记录员',
      time: '25分钟前',
      avatar: peopleImage,
      content: '今天沿着河边慢慢走，路边的树影和风都刚刚好，随手拍了几张很喜欢。',
      tag: '沿路风景',
      images: [beachImage, cherryImage],
      comments: 74,
      stars: 36,
      likes: 430,
      shares: 21,
    },
    {
      id: 4,
      author: '小厨房日记',
      badge: '美食分享家',
      time: '38分钟前',
      avatar: peopleTwoImage,
      content: '家常菜不用复杂，青菜、豆腐和一点酱汁就能很香，适合晚饭轻轻松松吃。',
      tag: '晒晒你的美食',
      images: [cookTwoImage, cookImage, cookThreeImage],
      comments: 128,
      stars: 59,
      likes: 688,
      shares: 27,
    },
    {
      id: 5,
      author: '镜头里的夏天',
      badge: '摄影达人',
      time: '1小时前',
      avatar: peopleImage,
      content: '参加摄影大赛的第一组照片，想把清晨的光、路边的花和安静的街角都留下来。',
      tag: '摄影大赛',
      images: [cherryImage, sunsetImage, beachImage],
      comments: 156,
      stars: 82,
      likes: 904,
      shares: 44,
    },
  ],
  creators: [
    { id: 1, name: '栗然Dto', avatar: avatarMe },
    { id: 2, name: '清栀', avatar: avatarWang },
    { id: 3, name: '电影少女', avatar: avatarZhao },
    { id: 4, name: '草莓余', avatar: avatarLiu },
    { id: 5, name: '我爱散步', avatar: beachImage },
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
