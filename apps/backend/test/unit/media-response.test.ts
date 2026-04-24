import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiMediaPayload } from "../../src/common/utils/media-response";

test("normalizeApiMediaPayload rewrites demo-host content images by default", () => {
  const payload = {
    title: "高血压长者如何把控每日盐摄入",
    coverUrl: "https://cdn.intellihealthcare.demo/content/article-salt.jpg",
    images: ["https://cdn.intellihealthcare.demo/content/article-salt.jpg"],
  };

  const normalized = normalizeApiMediaPayload(payload);

  assert.match(
    normalized.coverUrl,
    /^\/api\/v1\/assets\/demo\/content\/content-[1-3]\.jpg$/
  );
  assert.match(
    normalized.images[0],
    /^\/api\/v1\/assets\/demo\/content\/content-[1-3]\.jpg$/
  );
});

test("normalizeApiMediaPayload preserves news images when demo content fallback is disabled", () => {
  const payload = {
    title: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    coverUrl: "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif",
    images: ["/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif"],
  };

  const normalized = normalizeApiMediaPayload(payload, {
    disableDemoContentImageFallback: true,
  });

  assert.equal(
    normalized.coverUrl,
    "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif"
  );
  assert.deepEqual(normalized.images, [
    "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif",
  ]);
});

test("normalizeApiMediaPayload resolves lecture media paths against the current request origin", () => {
  const payload = {
    title: "讲堂导读：家庭血压测量的正确方法",
    coverUrl: "/api/v1/assets/curated/content/lecture-bp-blood-pressure-check.jpg",
    heroImage: "/api/v1/assets/curated/content/lecture-bp-blood-pressure-check.jpg",
    videoUrl: "/api/v1/assets/curated/videos/lecture-bp-blood-pressure-check.mp4",
  };

  const normalized = normalizeApiMediaPayload(payload, {
    disableDemoContentImageFallback: true,
    absoluteBaseUrl: "http://server.mctown.online:8190",
  });

  assert.equal(
    normalized.coverUrl,
    "http://server.mctown.online:8190/api/v1/assets/curated/content/lecture-bp-blood-pressure-check.jpg"
  );
  assert.equal(
    normalized.heroImage,
    "http://server.mctown.online:8190/api/v1/assets/curated/content/lecture-bp-blood-pressure-check.jpg"
  );
  assert.equal(
    normalized.videoUrl,
    "http://server.mctown.online:8190/api/v1/assets/curated/videos/lecture-bp-blood-pressure-check.mp4"
  );
});
