import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { AppContentService } from "../../src/modules/content/content.service";

function createContentService() {
  let lastCreatedCommentData: Record<string, unknown> | null = null;
  const prismaService = {
    article: {
      findFirst: async () => ({ id: "article_low_salt" }),
    },
    lecture: {
      findFirst: async () => ({ id: "lecture_bp" }),
    },
    contentComment: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        ...(lastCreatedCommentData = data),
        id: "content_comment_created",
        createdAt: new Date("2026-04-24T06:00:00Z"),
      }),
    },
  };

  return {
    service: new AppContentService(prismaService as never),
    getLastCreatedCommentData: () => lastCreatedCommentData,
  };
}

test("createContentComment rejects placeholder comment payloads", async () => {
  const { service } = createContentService();

  await assert.rejects(
    () =>
      service.createContentComment("user_family_wanglan", "ARTICLE", "article_low_salt", {
        content: "news_comment_moc8yrgk",
      }),
    BadRequestException
  );
});

test("createContentComment trims normal comment text before saving", async () => {
  const { service, getLastCreatedCommentData } = createContentService();

  const result = await service.createContentComment(
    "user_family_wanglan",
    "ARTICLE",
    "article_low_salt",
    {
      content: "  准备先把家里的高钠调味料做一轮替换。  ",
    }
  );

  assert.equal(result.commentId, "content_comment_created");
  assert.equal(
    getLastCreatedCommentData()?.content,
    "准备先把家里的高钠调味料做一轮替换。"
  );
});
