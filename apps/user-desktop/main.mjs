import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, shell } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.IHC_DESKTOP_DEV_SERVER || "";
const isDevServerMode = !app.isPackaged && Boolean(devServerUrl);

function resolveRendererEntry() {
  return path.join(app.getAppPath(), "dist", "user-web", "index.html");
}

function createWindow() {
  const window = new BrowserWindow({
    width: 420,
    height: 880,
    minWidth: 375,
    minHeight: 667,
    maxWidth: 480,
    maxHeight: 1024,
    show: true,
    autoHideMenuBar: true,
    backgroundColor: "#eef3fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  });

  const rendererEntry = resolveRendererEntry();
  console.log(`[IHC] AppPath: ${app.getAppPath()}`);
  console.log(`[IHC] Renderer entry: ${rendererEntry}`);
  console.log(`[IHC] Packaged: ${app.isPackaged}`);

  window.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.error(`[IHC] Failed to load: ${url}`);
    console.error(`[IHC] Error code: ${code}, description: ${desc}`);
  });

  window.webContents.on("crashed", (_event, killed) => {
    console.error(`[IHC] Renderer crashed, killed: ${killed}`);
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[IHC-Console] [${sourceId}:${line}] ${message}`);
  });

  window.webContents.on("did-finish-load", () => {
    console.log(`[IHC] Page loaded successfully`);
  });

  window.once("ready-to-show", () => {
    console.log(`[IHC] Window ready-to-show`);
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.on("unresponsive", () => {
    console.error(`[IHC] Window became unresponsive`);
  });

  if (isDevServerMode) {
    void window.loadURL(devServerUrl);
    return;
  }

  window.loadFile(rendererEntry).catch((err) => {
    console.error(`[IHC] loadFile failed: ${err.message}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
