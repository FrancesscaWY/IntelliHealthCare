import assert from "node:assert/strict";
import test from "node:test";
import { UserType } from "@prisma/client";
import { UsersService } from "../../src/modules/users/users.service";

const demoArticle = {
  id: "article_low_salt",
  slug: "low-salt-diet-for-seniors",
  title: "高血压长者如何把控每日盐摄入",
  summary: "从厨房调味、外卖选择和看懂营养标签三个角度，帮助长者稳定控制盐分摄入。",
  coverUrl: "/api/v1/assets/demo/content/content-1.jpg",
  authorName: "健康管理组",
  sourceName: "智诊康养",
  content: {},
  publishedAt: new Date("2026-04-18T09:00:00Z"),
  tags: ["高血压", "饮食管理"],
};

function createUsersService() {
  const prismaService = {
    serviceItem: {
      findMany: async () => [
        {
          id: "service_home_care",
          title: "上门护理",
          category: "护理",
          price: 199,
          coverUrl: "/api/v1/assets/demo/services/service-home-care.png",
        },
      ],
    },
    article: {
      findMany: async () => [demoArticle],
    },
    diseaseKnowledge: {
      findMany: async () => [
        {
          id: "disease_hypertension",
          title: "高血压",
          summary: "持续血压升高，需要长期管理。",
        },
      ],
    },
    activity: {
      findMany: async () => [],
    },
    medication: {
      findMany: async () => [],
    },
    user: {
      findUnique: async () => ({ city: "上海市" }),
    },
  };

  return new UsersService(prismaService as never);
}

test("getHomeDashboard overrides demo article cards with curated source metadata", async () => {
  const service = createUsersService();

  const result = await service.getHomeDashboard({
    id: "user_elder_joy",
    type: UserType.ELDER,
  } as never);

  assert.equal(result.recommendedArticles.length, 1);
  assert.deepEqual(result.recommendedArticles[0], {
    articleId: "article_low_salt",
    title: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    summary:
      "高血压是指动脉内的压力持续偏高。高血压通常很长年没有症状，直到重要脏器受损时才被发现，因此被称为“隐形杀手”。",
    coverUrl: "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif",
    imageAlt: "高血压主题配图，展示血压调节相关示意",
    authorName: "默沙东诊疗手册大众版",
    sourceName: "默沙东诊疗手册大众版",
    sourceUrl:
      "https://www.msdmanuals.cn/home/heart-and-blood-vessel-disorders/high-blood-pressure/high-blood-pressure",
    sourceTitle: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    publishedAt: "2026-04-18T09:00:00.000Z",
    sourcePublishedAt: null,
    readingMinutes: 6,
    tags: ["高血压", "饮食管理"],
  });
});

test("searchGlobal returns curated article metadata instead of stored demo article fields", async () => {
  const service = createUsersService();

  const result = await service.searchGlobal("高血压", 1, 10);
  const article = result.list.find((item) => item.targetType === "article");

  assert.ok(article);
  assert.deepEqual(article, {
    targetType: "article",
    targetId: "article_low_salt",
    title: "高血压 - 心脏和血管疾病 - 《默沙东诊疗手册大众版》",
    summary:
      "高血压是指动脉内的压力持续偏高。高血压通常很长年没有症状，直到重要脏器受损时才被发现，因此被称为“隐形杀手”。",
    coverUrl: "/api/v1/assets/curated/content/article-hypertension-msdmanuals-cn.gif",
    sourceName: "默沙东诊疗手册大众版",
    sourceUrl:
      "https://www.msdmanuals.cn/home/heart-and-blood-vessel-disorders/high-blood-pressure/high-blood-pressure",
    publishedAt: "2026-04-18T09:00:00.000Z",
    imageAlt: "高血压主题配图，展示血压调节相关示意",
  });
});
