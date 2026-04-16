import peopleImage from '@/assets/community/activities/people.png'
import peopleTwoImage from '@/assets/community/activities/people2.png'
import avatarLiu from '@/assets/content/avatar-liu.jpg'
import avatarWang from '@/assets/content/avatar-wang.jpg'
import circleMock from '../circle/mock'

export interface CommentItem {
  id: number
  author: string
  avatar: string
  time: string
  content: string
  likes: number
}

const comments: Record<number, CommentItem[]> = {
  1: [
      {
        id: 1,
        author: '小厨房日记',
        avatar: peopleTwoImage,
        time: '刚刚',
        content: '这几道菜看起来很家常，最喜欢这种不用太复杂也很好吃的分享。',
        likes: 23,
      },
      {
        id: 2,
        author: '清栀',
        avatar: avatarWang,
        time: '2分钟前',
        content: '第二张青菜颜色太舒服了，感觉晚饭有灵感了。',
        likes: 12,
      },
      {
        id: 3,
        author: '菜菜先生',
        avatar: peopleImage,
        time: '4分钟前',
        content: '调味很简单，主要是蒜末和一点点生抽，老人也能吃得清爽。',
        likes: 31,
      },
  ],
  2: [
      {
        id: 1,
        author: '晚霞收藏家',
        avatar: peopleImage,
        time: '3分钟前',
        content: '这个落日颜色好温柔，散步的时候遇到这样的天真的很治愈。',
        likes: 18,
      },
      {
        id: 2,
        author: '电影少女',
        avatar: avatarLiu,
        time: '6分钟前',
        content: '第一张很有氛围，像夏天傍晚的片尾。',
        likes: 9,
      },
  ],
  3: [
      {
        id: 1,
        author: '栗然Dto',
        avatar: avatarWang,
        time: '5分钟前',
        content: '沿路风景最适合慢慢拍，不赶路的时候才能看到这些细节。',
        likes: 16,
      },
  ],
  4: [
      {
        id: 1,
        author: '清栀',
        avatar: peopleImage,
        time: '8分钟前',
        content: '看起来清爽又下饭，家常菜就是最安心。',
        likes: 20,
      },
  ],
  5: [
      {
        id: 1,
        author: '摄影大赛助手',
        avatar: peopleTwoImage,
        time: '12分钟前',
        content: '这组照片很适合参赛，光线和主题都很完整。',
        likes: 35,
      },
  ],
}

const mock = {
  posts: circleMock.posts,
  comments,
}

export default mock
