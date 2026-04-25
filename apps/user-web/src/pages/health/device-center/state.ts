import { ref } from "vue";
import { getHealthDevices } from "@/shared/api/health";
import { deviceItems, mapHealthDeviceToDeviceItem, type DeviceItem } from "./devices";

export const selectedDeviceId = ref(deviceItems[0]?.id ?? "");
export const currentDeviceItems = ref<DeviceItem[]>([...deviceItems]);

export function setCurrentDeviceItems(items: DeviceItem[]) {
  currentDeviceItems.value = items;

  if (!items.length) {
    selectedDeviceId.value = "";
    return;
  }

  if (!items.some((item) => item.id === selectedDeviceId.value)) {
    selectedDeviceId.value = items[0].id;
  }
}

export function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId;
}

export function removeCurrentDevice(deviceId: string) {
  const nextItems = currentDeviceItems.value.filter((item) => item.id !== deviceId);
  setCurrentDeviceItems(nextItems);
}

export async function syncHealthDeviceItems() {
  const devices = await getHealthDevices();
  const mappedDevices = devices.map(mapHealthDeviceToDeviceItem);

  setCurrentDeviceItems(mappedDevices);
  return mappedDevices;
}
