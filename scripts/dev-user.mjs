import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { appDir, appIndexPath, loadManifest, normalizePageId, parseArgs, rootDir } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const manifest = loadManifest();
const port = Number(args.port || 5173);
const requestedPageId = normalizePageId(args.page);
const mode = requestedPageId || args.mode === "page" ? "page" : "app";

if (requestedPageId && !manifest.some((entry) => entry.id === requestedPageId)) {
  console.error(`未找到页面：${requestedPageId}`);
  process.exit(1);
}

const configScript = `window.__IHC_CONFIG__ = ${JSON.stringify({
  mode,
  pageId: requestedPageId || "",
})};\n`;

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "text/plain; charset=utf-8";
  }
}

function serveFile(filePath, response) {
  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-store",
  });

  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/__ihc_config.js") {
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(configScript);
    return;
  }

  const safeRelativePath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");
  const filePath = path.join(rootDir, safeRelativePath);

  if (safeRelativePath && filePath.startsWith(rootDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, response);
    return;
  }

  if (safeRelativePath && filePath.startsWith(appDir) && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const nestedIndex = path.join(filePath, "index.html");
    if (fs.existsSync(nestedIndex)) {
      serveFile(nestedIndex, response);
      return;
    }
  }

  serveFile(appIndexPath, response);
});

server.listen(port, "127.0.0.1", () => {
  const baseUrl = `http://127.0.0.1:${port}`;
  const suffix = requestedPageId ? `/${requestedPageId}` : "/";

  console.log(`智诊康养应用已启动：${baseUrl}${suffix}`);
  if (mode === "page") {
    console.log(`单页预览：${requestedPageId}`);
  } else {
    console.log("模式：整站首页预览");
  }
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
