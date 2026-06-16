import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePresentedCommunityActivityCover,
  resolvePresentedCommunityAvatar,
  resolvePresentedCommunityPostImages,
  resolvePresentedCommunityTopicCover,
} from "../../src/modules/community/community-presentation";

test("resolvePresentedCommunityTopicCover replaces topic demo covers with crawled imagery", () => {
  const coverUrl = resolvePresentedCommunityTopicCover({
    id: "topic_food",
    coverUrl: "/api/v1/assets/demo/content/content-1.jpg",
  });

  assert.equal(
    coverUrl,
    "https://images.pexels.com/photos/18476165/pexels-photo-18476165.jpeg?auto=compress&cs=tinysrgb&w=1600"
  );
});

test("resolvePresentedCommunityPostImages replaces post demo images with crawled imagery", () => {
  const images = resolvePresentedCommunityPostImages({
    id: "post_kitchen",
    images: ["/api/v1/assets/demo/content/content-1.jpg"],
  });

  assert.equal(images.length, 3);
  assert.match(images[0] ?? "", /^https:\/\/images\.pexels\.com\/photos\//);
});

test("resolvePresentedCommunityActivityCover replaces activity demo covers with crawled imagery", () => {
  const coverUrl = resolvePresentedCommunityActivityCover({
    id: "activity_photography",
    coverUrl: "/api/v1/assets/demo/activities/activity-1.jpg",
  });

  assert.equal(
    coverUrl,
    "https://images.pexels.com/photos/7445404/pexels-photo-7445404.jpeg?auto=compress&cs=tinysrgb&w=1600"
  );
});

test("resolvePresentedCommunityAvatar replaces demo avatars with curated assets", () => {
  const avatarUrl = resolvePresentedCommunityAvatar({
    userId: "user_family_wanglan",
    avatarUrl: "https://cdn.intellihealthcare.demo/avatars/wang-lan.jpg",
  });

  assert.equal(avatarUrl, "/api/v1/assets/curated/avatars/wang-lan.jpg");
});
