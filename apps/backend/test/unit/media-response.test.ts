import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiMediaPayload } from "../../src/common/utils/media-response";

test("normalizeApiMediaPayload rewrites demo-host content images to real public media by default", () => {
  const payload = {
    title: "高血压长者如何把控每日盐摄入",
    coverUrl: "https://cdn.intellihealthcare.demo/content/article-salt.jpg",
    images: ["https://cdn.intellihealthcare.demo/content/article-salt.jpg"],
  };

  const normalized = normalizeApiMediaPayload(payload);

  assert.match(normalized.coverUrl, /^https:\/\/images\.pexels\.com\/photos\//);
  assert.match(normalized.images[0], /^https:\/\/images\.pexels\.com\/photos\//);
  assert.doesNotMatch(normalized.coverUrl, /intellihealthcare\.demo|\/demo\//);
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

test("normalizeApiMediaPayload rewrites demo-host service and diet images to real public media", () => {
  const payload = {
    serviceCover: "https://cdn.intellihealthcare.demo/services/home-clean.jpg",
    dietCoverUrl: "https://cdn.intellihealthcare.demo/diet/oat-milk.jpg",
  };

  const normalized = normalizeApiMediaPayload(payload);

  assert.match(normalized.serviceCover, /^https:\/\/images\.pexels\.com\/photos\//);
  assert.match(normalized.dietCoverUrl, /^https:\/\/images\.pexels\.com\/photos\//);
  assert.doesNotMatch(normalized.serviceCover, /intellihealthcare\.demo|\/demo\//);
  assert.doesNotMatch(normalized.dietCoverUrl, /intellihealthcare\.demo|\/demo\//);
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
