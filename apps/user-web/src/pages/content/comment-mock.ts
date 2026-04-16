import avatarLiu from "@/assets/content/avatar-liu.jpg?inline";
import avatarMe from "@/assets/content/avatar-me.jpg?inline";
import avatarWang from "@/assets/content/avatar-wang.jpg?inline";
import avatarZhao from "@/assets/content/avatar-zhao.jpg?inline";

export interface ContentComment {
  id: string;
  author: string;
  avatarUrl: string;
  time: string;
  city: string;
  content: string;
  replyTo?: string;
  likes: number;
  liked: boolean;
  isMine: boolean;
}

export const currentUserCommentProfile = {
  author: "我",
  avatarUrl: avatarMe,
  city: "上海",
};

export function createDefaultComments(): ContentComment[] {
  return [
    {
      id: "comment-1",
      author: "刘小华",
      avatarUrl: avatarLiu,
      time: "2天前",
      city: "北京",
      content: "从建立规律的作息时间到调整饮食、增加锻炼等多个方面，都为老年人提供了切实可行的改善失眠的方法。特别是强调营造舒适的睡眠环境和调整心态，这些都是容易被忽视但又非常重要的方面。",
      likes: 1001,
      liked: false,
      isMine: false,
    },
    {
      id: "comment-2",
      author: "王强",
      avatarUrl: avatarWang,
      time: "1小时前",
      city: "北京",
      content: "支持！",
      likes: 1001,
      liked: false,
      isMine: false,
    },
    {
      id: "comment-3",
      author: "赵丽珍",
      avatarUrl: avatarZhao,
      time: "2天前",
      city: "北京",
      content: "我们也需要关注老年人的心理需求和生活质量，为他们提供更加全面和人性化的关怀和支持。",
      likes: 1001,
      liked: false,
      isMine: false,
    },
  ];
}
