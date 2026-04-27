import watchA001Image from "@/assets/devices/watch-a001-device.jpg";
import type { HealthDeviceItem } from "@/shared/api/health";

export type DeviceSettingToggle = {
  key: string;
  label: string;
  enabled: boolean;
};

export type DeviceSettingLink = {
  key: string;
  label: string;
};

export type DeviceItem = {
  id: string;
  type: "watch" | "scale" | "pressure" | "glucose";
  name: string;
  status: string;
  color: string;
  halo: string;
  batteryText?: string;
  imageUrl?: string;
  quickLinks: DeviceSettingLink[];
  toggles: DeviceSettingToggle[];
  actions: DeviceSettingLink[];
};

function createDefaultActions() {
  return [
    { key: "password", label: "设置密码" },
    { key: "upgrade", label: "设备更新" },
    { key: "guide", label: "使用指南" },
    { key: "about", label: "关于设备" }
  ];
}

function createDefaultToggles() {
  return [
    { key: "voice", label: "语音播报", enabled: false },
    { key: "weather", label: "天气同步", enabled: false },
    { key: "calendar", label: "日程同步", enabled: false },
    { key: "message", label: "消息通知", enabled: false }
  ];
}

function getQuickLinksByType(type: DeviceItem["type"]) {
  switch (type) {
    case "watch":
      return [{ key: "heart-rate", label: "心率设置" }];
    case "scale":
      return [{ key: "weight-unit", label: "体重单位" }];
    case "pressure":
      return [{ key: "pressure-mode", label: "测量模式" }];
    case "glucose":
      return [{ key: "glucose-mode", label: "测量设置" }];
  }
}

function getStatusText(status: string) {
  const statusTextMap: Record<string, string> = {
    ONLINE: "已连接",
    OFFLINE: "已离线",
    UNBOUND: "未绑定",
    MAINTENANCE: "维护中"
  };

  return statusTextMap[status] || status;
}

function getDeviceVisualConfig(deviceType: string) {
  const visualConfigMap: Record<
    string,
    Pick<DeviceItem, "type" | "color" | "halo" | "imageUrl"> & {
      quickLinks: DeviceSettingLink[];
      toggles: DeviceSettingToggle[];
      actions: DeviceSettingLink[];
    }
  > = {
    WATCH: {
      type: "watch",
      color: "#34d1ab",
      halo: "rgba(52, 209, 171, 0.12)",
      imageUrl: watchA001Image,
      quickLinks: getQuickLinksByType("watch"),
      toggles: createDefaultToggles(),
      actions: createDefaultActions()
    },
    SMART_SCALE: {
      type: "scale",
      color: "#ff6c66",
      halo: "rgba(255, 108, 102, 0.12)",
      quickLinks: getQuickLinksByType("scale"),
      toggles: createDefaultToggles(),
      actions: createDefaultActions()
    },
    BLOOD_PRESSURE_METER: {
      type: "pressure",
      color: "#6070f3",
      halo: "rgba(96, 112, 243, 0.11)",
      quickLinks: getQuickLinksByType("pressure"),
      toggles: createDefaultToggles(),
      actions: createDefaultActions()
    },
    GLUCOSE_METER: {
      type: "glucose",
      color: "#f4cd62",
      halo: "rgba(244, 205, 98, 0.12)",
      quickLinks: getQuickLinksByType("glucose"),
      toggles: createDefaultToggles(),
      actions: createDefaultActions()
    }
  };

  return visualConfigMap[deviceType] || visualConfigMap.WATCH;
}

export const deviceItems: DeviceItem[] = [
  {
    id: "watch-a001",
    type: "watch",
    name: "智能手表A001",
    status: "已连接",
    color: "#34d1ab",
    halo: "rgba(52, 209, 171, 0.12)",
    batteryText: "电量25%",
    imageUrl: watchA001Image,
    quickLinks: [{ key: "heart-rate", label: "心率设置" }],
    toggles: [
      { key: "sleep", label: "睡眠高精度检测", enabled: false },
      { key: "weather", label: "天气同步", enabled: false },
      { key: "calendar", label: "日程同步", enabled: false },
      { key: "message", label: "消息通知", enabled: false }
    ],
    actions: createDefaultActions()
  },
  {
    id: "scale-s102",
    type: "scale",
    name: "智能体脂秤S102",
    status: "已连接",
    color: "#ff6c66",
    halo: "rgba(255, 108, 102, 0.12)",
    batteryText: "电量82%",
    quickLinks: [{ key: "weight-unit", label: "体重单位" }],
    toggles: [
      { key: "voice", label: "语音播报", enabled: false },
      { key: "trend", label: "数据趋势提醒", enabled: true },
      { key: "share", label: "家庭成员共享", enabled: false },
      { key: "message", label: "消息通知", enabled: false }
    ],
    actions: createDefaultActions()
  },
  {
    id: "pressure-d04",
    type: "pressure",
    name: "血压仪D04",
    status: "已连接",
    color: "#6070f3",
    halo: "rgba(96, 112, 243, 0.11)",
    batteryText: "电量61%",
    quickLinks: [{ key: "pressure-mode", label: "测量模式" }],
    toggles: createDefaultToggles(),
    actions: createDefaultActions()
  },
  {
    id: "glucose-u12",
    type: "glucose",
    name: "血糖仪U12",
    status: "已连接",
    color: "#f4cd62",
    halo: "rgba(244, 205, 98, 0.12)",
    batteryText: "电量48%",
    quickLinks: [{ key: "glucose-mode", label: "测量设置" }],
    toggles: createDefaultToggles(),
    actions: createDefaultActions()
  }
];

export function mapHealthDeviceToDeviceItem(device: HealthDeviceItem): DeviceItem {
  const visualConfig = getDeviceVisualConfig(device.type);

  return {
    id: device.deviceId,
    type: visualConfig.type,
    name: device.name,
    status: getStatusText(device.status),
    color: visualConfig.color,
    halo: visualConfig.halo,
    batteryText: device.batteryText,
    imageUrl: visualConfig.imageUrl,
    quickLinks: visualConfig.quickLinks.map((item) => ({ ...item })),
    toggles: visualConfig.toggles.map((item) => ({ ...item })),
    actions: visualConfig.actions.map((item) => ({ ...item }))
  };
}

export function getDeviceById(id: string, items: DeviceItem[] = deviceItems) {
  return items.find((item) => item.id === id) || items[0] || null;
}
