import feedMain from "@/assets/home/profile/feed-main.jpg";
import feedThumb1 from "@/assets/home/profile/feed-thumb-1.jpg";
import feedThumb2 from "@/assets/home/profile/feed-thumb-2.jpg";
import type { ProfilePost } from "./published-post";

const posts: ProfilePost[] = [
  {
    id: "bookstore",
    author: "笑看人生",
    date: "1月4日",
    content:
      "一路进书店，仿佛走进了另一个世界。书架上琳琅满目的书籍，让我眼花缭乱，不知道该从哪一本开始看起。感谢书店提供这样一个宁静的阅读空间，让我有机会与书为伴，感受知识的力量。我相信，无论年岁多大，阅读都是一种最好的自我提升和享受生活的方式。",
    likes: 1001,
    favorites: 210,
    comments: 6,
    gallery: [
      { src: feedMain, position: "center" },
      { src: feedThumb1, position: "center" },
      { src: feedThumb2, position: "center" },
    ],
  },
  {
    id: "chess",
    author: "笑看人生",
    date: "1月2日",
    content: "今天在社区活动室下了两盘象棋，节奏慢下来以后，心也跟着稳了。和老朋友边下边聊，比赢棋更让人开心。",
    likes: 286,
    favorites: 64,
    comments: 12,
    gallery: [],
  },
];

const mock = {
  profile: {
    name: "笑看人生",
    region: "IP归属地：上海",
    motto: "我是笑看人生，一个热爱下棋与阅读的探索者。生活因棋与书而精彩，我因热爱而前行。",
    gender: "male",
    stats: [
      { label: "关注", value: "24" },
      { label: "粉丝", value: "333" },
      { label: "获赞", value: "6006" },
    ],
  },
  feedCount: 200,
  posts,
};

export default mock;
