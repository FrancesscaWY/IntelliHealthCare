import avatarLiu from "@/assets/content/avatar-liu.jpg?inline";
import avatarMe from "@/assets/content/avatar-me.jpg?inline";
import avatarWang from "@/assets/content/avatar-wang.jpg?inline";
import avatarZhao from "@/assets/content/avatar-zhao.jpg?inline";
import { getUserAuthSession } from "@/shared/auth/session";
import { loadUserProfileState } from "@/pages/home/profile/profile-store";

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

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

export function getCurrentUserCommentProfile() {
  const profileState = loadUserProfileState();
  const session = getUserAuthSession();

  const nickname = profileState.nickname?.trim();
  const realName = session?.user.realName?.trim() || "";
  const phone = session?.user.phone?.trim() || "";

  return {
    author: realName || nickname || (phone ? maskPhone(phone) : "我"),
    avatarUrl: profileState.avatarUrl || avatarMe,
    city: "未知"
  };
}

export const currentUserCommentProfile = getCurrentUserCommentProfile();

export function createDefaultComments(): ContentComment[] {
  return [
    {
      id: "comment-1",
      author: "刘小卉",
      avatarUrl: avatarLiu,
      time: "2天前",
      city: "北京",
      content: "这段讲得很清楚，家里人照着记录血压和服药时间会更方便。",
      likes: 8,
      liked: false,
      isMine: false
    },
    {
      id: "comment-2",
      author: "王强",
      avatarUrl: avatarWang,
      time: "1小时前",
      city: "上海",
      content: "建议很实用，准备给长辈按这个方法试试看。",
      likes: 3,
      liked: false,
      isMine: false
    },
    {
      id: "comment-3",
      author: "赵丽雅",
      avatarUrl: avatarZhao,
      time: "刚刚",
      city: "杭州",
      content: "如果后面能再补充家庭陪护的注意事项就更好了。",
      likes: 1,
      liked: false,
      isMine: false
    }
  ];
}
