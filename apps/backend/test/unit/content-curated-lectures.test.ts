import assert from "node:assert/strict";
import test from "node:test";
import { resolveCuratedLectureMedia } from "../../src/modules/content/content-curated-lectures";

test("resolveCuratedLectureMedia returns curated lecture media by lecture id", () => {
  const result = resolveCuratedLectureMedia({
    id: "lecture_bp_manage",
    slug: "guide-home-blood-pressure-monitoring",
  });

  assert.ok(result);
  assert.equal(
    result?.coverUrl,
    "https://images.pexels.com/photos/8088856/pexels-photo-8088856.jpeg?auto=compress&cs=tinysrgb&w=1600"
  );
  assert.equal(
    result?.videoUrl,
    "https://videos.pexels.com/video-files/8088985/8088985-uhd_2732_1440_24fps.mp4"
  );
  assert.equal(
    result?.sourceUrl,
    "https://news.cctv.com/2023/10/08/ARTIYL5x8otjzdVlWtJ8y6wZ231008.shtml"
  );
  assert.equal(result?.sourceName, "央视网");
});

test("resolveCuratedLectureMedia supports lecture slugs", () => {
  const result = resolveCuratedLectureMedia({
    slug: "guide-healthy-ageing-functional-ability",
  });

  assert.ok(result);
  assert.equal(
    result?.coverUrl,
    "https://images.pexels.com/photos/775417/pexels-photo-775417.jpeg?auto=compress&cs=tinysrgb&w=1600"
  );
  assert.equal(result?.sourceName, "World Health Organization");
});
