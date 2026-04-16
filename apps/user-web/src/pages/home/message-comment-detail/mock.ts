import cookImage from '@/assets/community/activities/cook.png'
import cookTwoImage from '@/assets/community/activities/cook2.png'
import peopleImage from '@/assets/community/activities/people.png'
import peopleTwoImage from '@/assets/community/activities/people2.png'
import avatarWang from '@/assets/content/avatar-wang.jpg'

const mock = {
  updates: [
    {
      id: 1,
      author: '小厨房日记',
      avatar: peopleTwoImage,
      time: '2分钟前',
      action: '回复了你的评论',
      content: '我也喜欢这种简单家常菜，老人小孩都吃得舒服。',
      reply: '调味很简单，主要是蒜末和一点点生抽。',
      postId: 1,
      postTitle: '分享一下喜欢做又简单的菜',
      postImage: cookImage,
      postExcerpt: '今天晚饭刚好有阳光照进厨房。',
    },
    {
      id: 2,
      author: '清栀',
      avatar: avatarWang,
      time: '16分钟前',
      action: '评论了你的帖子',
      content: '第二张青菜颜色太舒服了，感觉晚饭有灵感了。',
      reply: '分享一下喜欢做又简单的菜，今天晚饭刚好有阳光照进厨房。',
      postId: 1,
      postTitle: '厨房里的小确幸',
      postImage: cookTwoImage,
      postExcerpt: '清爽、简单，也能认真吃好一顿饭。',
    },
    {
      id: 3,
      author: '菜菜先生',
      avatar: peopleImage,
      time: '35分钟前',
      action: '提到了你',
      content: '下次一起试试少油版，味道应该也不错。',
      reply: '家常菜不用复杂，适合晚饭轻轻松松吃。',
      postId: 4,
      postTitle: '晚饭轻轻松松吃',
      postImage: cookImage,
      postExcerpt: '青菜、豆腐和一点酱汁就能很香。',
    },
  ],
}

export default mock
