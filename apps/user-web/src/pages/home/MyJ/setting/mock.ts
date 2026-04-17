export interface SettingItem {
  key: string;
  label: string;
  pageId?: string;
}

export interface SettingGroup {
  id: string;
  items: SettingItem[];
}

const mock = {
  title: "设置",
  logoutLabel: "退出账号",
  groups: [
    {
      id: "account",
      items: [
        { key: "profile", label: "个人资料", pageId: "home/MyJ/profile-info" },
        { key: "security", label: "账号与安全", pageId: "home/MyJ/account-security" },
      ],
    },
    {
      id: "message",
      items: [
        { key: "message", label: "消息设置", pageId: "home/MyJ/message-settings" },
        { key: "cache", label: "清除缓存" },
      ],
    },
    {
      id: "about",
      items: [{ key: "about", label: "关于我们" }],
    },
  ] as SettingGroup[],
};

export default mock;
