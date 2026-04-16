import cookImage from '@/assets/community/activities/cook.png'
import cookThreeImage from '@/assets/community/activities/cook3.png'
import peopleImage from '@/assets/community/activities/people.png'
import peopleTwoImage from '@/assets/community/activities/people2.png'
import sunsetImage from '@/assets/community/activities/sunset.png'
import avatarLiu from '@/assets/content/avatar-liu.jpg'

const mock = {
  updates: [
    {
      id: 1,
      author: '晚风记事',
      avatar: peopleTwoImage,
      time: '刚刚',
      action: '赞了你的帖子',
      type: 'like',
      postId: 1,
      postTitle: '分享一下喜欢做又简单的菜',
      postImage: cookImage,
      postExcerpt: '今天晚饭刚好有阳光照进厨房。',
    },
    {
      id: 2,
      author: '电影少女',
      avatar: avatarLiu,
      time: '9分钟前',
      action: '收藏了你的帖子',
      type: 'star',
      postId: 2,
      postTitle: '散步时遇到很漂亮的天空',
      postImage: sunsetImage,
      postExcerpt: '落日把云染成橘色，心情也慢慢安静下来。',
    },
    {
      id: 3,
      author: '菜菜先生',
      avatar: peopleImage,
      time: '28分钟前',
      action: '赞了你的美食分享',
      type: 'like',
      postId: 4,
      postTitle: '家常菜不用复杂',
      postImage: cookThreeImage,
      postExcerpt: '青菜、豆腐和一点酱汁就能很香。',
    },
  ],
}

export default mock
