const fs = require("node:fs");
const path = require("node:path");

const localElectronDist = path.resolve(__dirname, "..", "..", "node_modules", "electron", "dist");
const configuredElectronDistPath = process.env.IHC_ELECTRON_DIST
  ? path.resolve(process.cwd(), process.env.IHC_ELECTRON_DIST)
  : null;
const configuredElectronDist =
  configuredElectronDistPath && fs.existsSync(configuredElectronDistPath) && fs.statSync(configuredElectronDistPath).isFile()
    ? path.dirname(configuredElectronDistPath)
    : configuredElectronDistPath;
const rendererBuildDir = process.env.IHC_DESKTOP_RENDERER_DIR
  ? path.resolve(process.env.IHC_DESKTOP_RENDERER_DIR)
  : path.resolve(__dirname, "..", "..", "dist", "user-web-desktop");

module.exports = {
  appId: "com.intellihealthcare.user",
  productName: "IntelliHealthCare User",
  electronVersion: "31.7.7",
  electronDist: ({ platformName }) => {
    if (configuredElectronDist) {
      return configuredElectronDist;
    }

    if (platformName === process.platform) {
      return localElectronDist;
    }

    return null;
  },
  asar: true,
  npmRebuild: false,
  directories: {
    output: "../../dist/user-desktop",
  },
  artifactName: "IntelliHealthCare-User-${version}.${ext}",
  files: [
    "main.mjs",
    "preload.mjs",
    {
      from: rendererBuildDir,
      to: "dist/user-web",
      filter: ["**/*"],
    },
  ],
  linux: {
    target: ["tar.gz"],
    category: "Utility",
    executableName: "intellihealthcare-user",
  },
  mac: {
    target: ["dmg"],
    category: "public.app-category.medical",
  },
  win: {
    target: ["zip"],
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
