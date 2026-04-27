import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("ihcDesktop", {
  platform: process.platform,
});
