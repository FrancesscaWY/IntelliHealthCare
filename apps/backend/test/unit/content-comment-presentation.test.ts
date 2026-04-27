import assert from "node:assert/strict";
import test from "node:test";
import {
  isInvalidPlaceholderContentComment,
  normalizePresentedContentComment,
  resolvePresentedContentCommentAvatar,
} from "../../src/modules/content/content-comment-presentation";

test("normalizePresentedContentComment preserves normal user comments", () => {
  const content = normalizePresentedContentComment({
    targetId: "article_low_salt",
    commentId: "content_comment_1",
    content: "低盐调味这个建议很实用，家里已经开始改了。",
  });

  assert.equal(content, "低盐调味这个建议很实用，家里已经开始改了。");
});

test("normalizePresentedContentComment replaces placeholder comment markers", () => {
  const content = normalizePresentedContentComment({
    targetId: "article_low_salt",
    commentId: "cmoc8yrgm00988btqr23r8xzr",
    content: "news_comment_moc8yrgk",
  });

  assert.match(content, /测压|控盐|药盒|记录/);
  assert.notEqual(content, "news_comment_moc8yrgk");
});

test("normalizePresentedContentComment replaces lecture placeholder markers", () => {
  const content = normalizePresentedContentComment({
    targetId: "lecture_bp_manage",
    commentId: "cmoc8yrh5009e8btq1zpgrkpn",
    content: "lecture_comment_moc8yrh3",
  });

  assert.match(content, /测压|药盒|家属|记录/);
  assert.notEqual(content, "lecture_comment_moc8yrh3");
});

test("resolvePresentedContentCommentAvatar maps article comment users to curated avatar assets", () => {
  const avatarUrl = resolvePresentedContentCommentAvatar({
    userId: "user_member_qingzhi",
    avatarUrl: "https://cdn.intellihealthcare.demo/avatars/shen-qingzhi.jpg",
  });

  assert.equal(avatarUrl, "/api/v1/assets/curated/avatars/shen-qingzhi.jpg");
});

test("resolvePresentedContentCommentAvatar replaces data-uri avatars for known users", () => {
  const avatarUrl = resolvePresentedContentCommentAvatar({
    userId: "user_family_wanglan",
    avatarUrl: "data:image/svg+xml;charset=UTF-8,placeholder",
  });

  assert.equal(avatarUrl, "/api/v1/assets/curated/avatars/wang-lan.jpg");
});

test("resolvePresentedContentCommentAvatar maps lecture comment users to curated avatar assets", () => {
  const avatarUrl = resolvePresentedContentCommentAvatar({
    userId: "user_family_liyuan",
    avatarUrl: "/api/v1/assets/demo/avatars/avatar-2.jpg",
  });

  assert.equal(avatarUrl, "/api/v1/assets/curated/avatars/li-yuan.jpg");
});

test("resolvePresentedContentCommentAvatar replaces demo avatar paths for unknown users", () => {
  const avatarUrl = resolvePresentedContentCommentAvatar({
    userId: "user_member_zhouguohua",
    avatarUrl: "/api/v1/assets/demo/avatars/avatar-2.jpg",
  });

  assert.match(avatarUrl, /^\/api\/v1\/assets\/curated\/avatars\/[^/]+\.jpg$/);
  assert.doesNotMatch(avatarUrl, /\/demo\//);
});

test("resolvePresentedContentCommentAvatar replaces empty avatars with curated assets", () => {
  const avatarUrl = resolvePresentedContentCommentAvatar({
    userId: "user_member_zhouguohua",
    avatarUrl: "",
  });

  assert.match(avatarUrl, /^\/api\/v1\/assets\/curated\/avatars\/[^/]+\.jpg$/);
});

test("isInvalidPlaceholderContentComment detects synthetic test comment values", () => {
  assert.equal(isInvalidPlaceholderContentComment("news_comment_mocaeggc"), true);
  assert.equal(isInvalidPlaceholderContentComment("news_comment_block_me"), true);
  assert.equal(isInvalidPlaceholderContentComment("lecture_comment_mocaegh0"), true);
  assert.equal(isInvalidPlaceholderContentComment("准备先把腌菜和高钠调味料减下来。"), false);
});
