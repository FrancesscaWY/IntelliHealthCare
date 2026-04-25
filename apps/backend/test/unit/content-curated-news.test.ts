import assert from "node:assert/strict";
import test from "node:test";
import { resolveCuratedNewsMedia } from "../../src/modules/content/content-curated-news";

test("resolveCuratedNewsMedia returns curated article imagery by article id", () => {
  const result = resolveCuratedNewsMedia({
    id: "article_low_salt",
    slug: "low-salt-diet-for-seniors",
  });

  assert.ok(result);
  assert.equal(
    result?.coverUrl,
    "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif"
  );
  assert.equal(
    result?.gallery[0]?.url,
    "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif"
  );
  assert.equal(
    result?.title,
    "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》"
  );
  assert.equal(
    result?.summary,
    "高血压是指动脉内的压力持续偏高。高血压通常很长年没有症状，直到重要脏器受损时才被发现，因此被称为“隐形杀手”。"
  );
  assert.equal(
    result?.sourceUrl,
    "https://www.msdmanuals.cn/home/heart-and-blood-vessel-disorders/high-blood-pressure/high-blood-pressure"
  );
  assert.equal(result?.sourcePublishedAt, null);
});

test("resolveCuratedNewsMedia supports legacy article slugs", () => {
  const result = resolveCuratedNewsMedia({
    slug: "home-fall-prevention",
  });

  assert.ok(result);
  assert.equal(
    result?.coverUrl,
    "/api/v1/assets/curated/content/article-falls-msdmanuals-cn.gif"
  );
  assert.equal(result?.sourceName, "默沙东诊疗手册大众版");
  assert.equal(
    result?.sourceUrl,
    "https://www.msdmanuals.cn/home/older-people-s-health-issues/falls-in-older-adults/falls-in-older-adults"
  );
});
