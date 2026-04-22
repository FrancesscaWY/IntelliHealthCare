export type MemberTagTone = "mint" | "peach" | "lavender" | "gold";

export interface MemberTag {
  label: string;
  tone: MemberTagTone;
}

export interface MemberItem {
  id: string;
  nickname: string;
  realName: string;
  phone: string;
  registeredAt: string;
  tags: MemberTag[];
  avatarAccent: string;
  avatarShadow: string;
}

const mock = {
  title: "全部用户",
  summary: "用户标签筛选、注册时间过滤与用户档案卡片管理。",
  tagOptions: ["高血压", "糖尿病", "多次购买", "重点关注", "康复训练", "睡眠异常"],
  members: [
    {
      id: "202409000001",
      nickname: "笑看人生",
      realName: "王强",
      phone: "19233664486",
      registeredAt: "2024-10-09 10:09:09",
      tags: [
        { label: "高血压", tone: "mint" },
        { label: "糖尿病", tone: "peach" },
        { label: "多次购买", tone: "lavender" },
      ],
      avatarAccent: "#9ca2aa",
      avatarShadow: "#31363d",
    },
    {
      id: "202409000002",
      nickname: "平安岁月",
      realName: "李芳",
      phone: "18620336618",
      registeredAt: "2024-10-12 14:18:22",
      tags: [
        { label: "重点关注", tone: "gold" },
        { label: "康复训练", tone: "mint" },
      ],
      avatarAccent: "#8f959d",
      avatarShadow: "#424850",
    },
    {
      id: "202409000003",
      nickname: "静水流深",
      realName: "陈静",
      phone: "17786553210",
      registeredAt: "2024-10-15 08:26:45",
      tags: [
        { label: "糖尿病", tone: "peach" },
        { label: "多次购买", tone: "lavender" },
      ],
      avatarAccent: "#9a9aa0",
      avatarShadow: "#4b4b53",
    },
    {
      id: "202409000004",
      nickname: "晨光熹微",
      realName: "赵明",
      phone: "13966542118",
      registeredAt: "2024-10-18 17:42:31",
      tags: [
        { label: "高血压", tone: "mint" },
        { label: "睡眠异常", tone: "gold" },
      ],
      avatarAccent: "#858d96",
      avatarShadow: "#2f3740",
    },
    {
      id: "202409000005",
      nickname: "清风徐来",
      realName: "周燕",
      phone: "15322887450",
      registeredAt: "2024-10-21 11:33:07",
      tags: [
        { label: "康复训练", tone: "mint" },
        { label: "多次购买", tone: "lavender" },
      ],
      avatarAccent: "#9b9692",
      avatarShadow: "#4c4640",
    },
    {
      id: "202409000006",
      nickname: "知足常乐",
      realName: "孙莉",
      phone: "18850091237",
      registeredAt: "2024-10-24 09:20:56",
      tags: [
        { label: "重点关注", tone: "gold" },
        { label: "糖尿病", tone: "peach" },
      ],
      avatarAccent: "#91999f",
      avatarShadow: "#374047",
    },
    {
      id: "202409000007",
      nickname: "温故知新",
      realName: "吴江",
      phone: "13166549802",
      registeredAt: "2024-10-26 15:06:13",
      tags: [
        { label: "高血压", tone: "mint" },
        { label: "多次购买", tone: "lavender" },
      ],
      avatarAccent: "#90959a",
      avatarShadow: "#30353a",
    },
    {
      id: "202409000008",
      nickname: "安然自在",
      realName: "刘敏",
      phone: "18599003412",
      registeredAt: "2024-10-29 13:15:39",
      tags: [
        { label: "睡眠异常", tone: "gold" },
        { label: "康复训练", tone: "mint" },
      ],
      avatarAccent: "#96908c",
      avatarShadow: "#47413d",
    },
  ] as MemberItem[],
};

export default mock;
